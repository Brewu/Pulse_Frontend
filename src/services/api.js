import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://pulse-backend-tpg8.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: "https://pulse-backend-tpg8.onrender.com/api",
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
// Response interceptor for error handling - SMART VERSION
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Don't redirect for these specific endpoints
    const nonCriticalEndpoints = [
      '/push/send',
      '/push/subscribe',
      '/push/unsubscribe',
      '/notifications/unread-count',
      '/conversations/unread-count',
      '/posts/trending',
      '/posts/search'
    ];

    const isNonCritical = nonCriticalEndpoints.some(endpoint =>
      originalRequest?.url?.includes(endpoint)
    );

    // If it's a 401 on a non-critical endpoint, just log it and reject
    if (error.response?.status === 401 && isNonCritical) {
      console.log('🔐 Auth error on non-critical endpoint:', originalRequest.url);
      return Promise.reject(error);
    }

    // For critical endpoints (auth/me, posts feed, etc.), redirect to login
    if (error.response?.status === 401) {
      console.log('🔐 Critical auth error, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// =============================================
// Socket.io Client Setup (Singleton)
// =============================================
let socket = null;
let socketInitialized = false;

export const initSocket = (token) => {
  if (socket) return socket;
  if (socketInitialized) return socket;

  try {
    // Dynamic import to avoid issues if socket.io-client isn't installed
    const { io } = require('socket.io-client');

    socket = io(API_URL.replace('/api', ''), {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      if (error.message.includes('Authentication error')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketInitialized = true;
  } catch (error) {
    console.warn('Socket.io not available:', error);
  }

  return socket;
};

export const getSocket = () => socket;

// =============================================
// ✅ PUSH NOTIFICATIONS API (Web Push Only - FIXED)
// =============================================
export const pushNotificationsAPI = {
  // Check if push is supported in browser
  isSupported: () => {
    return typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
  },

  // Get service worker registration
  getServiceWorker: async () => {
    try {
      if (!pushNotificationsAPI.isSupported()) return null;
      return await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Service worker not ready:', error);
      return null;
    }
  },

  // Get VAPID public key from server
  // Get VAPID public key from server
  // Get VAPID public key from server
  getVapidPublicKey: async () => {
    try {
      console.log('🔑 Fetching VAPID key from:', '/push/vapid-public-key');

      // Make sure we're using the full URL
      const fullUrl = `${api.defaults.baseURL}/push/vapid-public-key`;
      console.log('Full URL:', fullUrl);

      const response = await api.get('/push/vapid-public-key');
      console.log('📡 VAPID response status:', response.status);
      console.log('📡 VAPID response data:', response.data);

      if (response.data && response.data.publicKey) {
        console.log('✅ VAPID key received successfully');
        return response.data.publicKey;
      } else {
        console.error('❌ No publicKey in response:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get VAPID key:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      return null;
    }
  },

  // Request permission and subscribe
  // Update the subscribe method to handle 401 gracefully
  subscribe: async () => {
    try {
      console.log('📱 Starting push subscription process...');

      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment');
      }

      if (!pushNotificationsAPI.isSupported()) {
        throw new Error('Push notifications not supported in this browser');
      }

      // Check if user is logged in first
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No auth token - push subscription skipped');
        return { success: false, message: 'Not authenticated' };
      }

      // Get VAPID key
      const vapidPublicKey = await pushNotificationsAPI.getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error('Failed to get VAPID public key');
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get service worker
      const registration = await pushNotificationsAPI.getServiceWorker();
      if (!registration) {
        throw new Error('Service worker not registered');
      }

      // Convert VAPID key
      const convertedKey = pushNotificationsAPI.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('📡 Creating new push subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }

      // Send to server - use fetch to bypass interceptors
      const response = await fetch('https://pulse-backend-tpg8.onrender.com/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          platform: 'web',
          deviceName: navigator.userAgent,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 Auth failed for push subscription - will retry later');
          return { success: false, status: 401 };
        }
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Subscription successful:', data);

      return {
        success: true,
        subscription: subscription.toJSON(),
        data
      };

    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return { success: false, error: error.message };
    }
  },
  // Unsubscribe from push
  // In pushNotificationsAPI, update the unsubscribe method:
  unsubscribe: async () => {
    try {
      if (typeof window === 'undefined') return { success: false };

      const registration = await pushNotificationsAPI.getServiceWorker();
      if (!registration) return { success: false };

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return { success: true };

      // Save endpoint before unsubscribing
      const endpoint = subscription.endpoint;

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // FIXED: Use the correct endpoint
      await api.post('/push/unsubscribe', { endpoint });

      return { success: true };
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      throw error;
    }
  },

  // Helper: Convert base64 to Uint8Array (FIXED: no unnecessary escape)
  urlBase64ToUint8Array: (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    // Fixed: Use proper regex without unnecessary escapes
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    try {
      // FIXED: Use push endpoint instead of users endpoint
      const response = await api.put('/push/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Failed to update push preferences:', error);
      throw error;
    }
  },

  // Get user's push subscriptions
  getSubscriptions: async () => {
    try {
      // FIXED: Use push endpoint instead of users endpoint
      const response = await api.get('/push/subscriptions');
      return response.data;
    } catch (error) {
      console.error('Failed to get push subscriptions:', error);
      throw error;
    }
  },

  // Test notification (via server)
  testNotification: async () => {
    try {
      const response = await api.post('/push/test');
      return response.data;
    } catch (error) {
      console.error('Test notification failed:', error);
      throw error;
    }
  },

  // Show local notification (for testing)
  showLocalNotification: (title, options = {}) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: options.body || 'You have a new notification',
        icon: options.icon || '/logo192.png',
        badge: options.badge || '/badge-72x72.png',
        data: options.data || {},
        ...options
      });
    }
  }
};

// =============================================
// ✅ NOTIFICATIONS API
// =============================================
export const notificationsAPI = {
  getAll: async (page = 1, limit = 20, type = null, unreadOnly = false) => {
    try {
      const params = { page, limit };
      if (type) params.type = type;
      if (unreadOnly) params.unread = 'true';

      const response = await api.get('/notifications', { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw error;
    }
  },

  getPreferences: async () => {
    try {
      const response = await api.get('/notifications/preferences');
      return response;
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      throw error;
    }
  },

  updatePreferences: async (preferences) => {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      return response;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response;
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  },

  archiveNotification: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/archive`);
      return response;
    } catch (error) {
      console.error(`Failed to archive notification ${id}:`, error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to delete notification ${id}:`, error);
      throw error;
    }
  },

  onNewNotification: (callback) => {
    const socket = getSocket();

    if (!socket) {
      console.warn('🔔 Socket not initialized. Call initSocket(token) first.');
      return () => { };
    }

    socket.on('notification:new', (notification) => {
      console.log('🔔 New notification received:', notification.type);
      callback(notification);
    });

    return () => {
      socket.off('notification:new', callback);
    };
  },

  onNotificationRead: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('notification:read', callback);
    return () => socket.off('notification:read', callback);
  },

  onUnreadCountUpdate: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('notification:unread_count', callback);
    return () => socket.off('notification:unread_count', callback);
  },

  markAsReadOptimistic: async (id, optimisticCallback) => {
    if (optimisticCallback) optimisticCallback(id);

    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response;
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
      if (optimisticCallback) optimisticCallback(id, true);
      throw error;
    }
  },

  markBatchAsRead: async (ids) => {
    if (!ids || !ids.length) return;

    try {
      const response = await api.put('/notifications/batch/read', { ids });
      return response;
    } catch (error) {
      console.error('Failed to mark batch as read:', error);
      throw error;
    }
  },

  clearAll: async () => {
    try {
      const response = await api.delete('/notifications/clear-all');
      return response;
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw error;
    }
  },

  getPushSettings: async () => {
    try {
      const response = await api.get('/users/notification-preferences');
      return response;
    } catch (error) {
      console.error('Failed to get push settings:', error);
      throw error;
    }
  },

  updatePushSettings: async (settings) => {
    try {
      const response = await api.put('/users/notification-preferences', settings);
      return response;
    } catch (error) {
      console.error('Failed to update push settings:', error);
      throw error;
    }
  }
};

// =============================================
// ✅ AUTH API
// =============================================
// In api.js, update the authAPI.login method:
// =============================================
// ✅ AUTH API - UPDATED WITH GOOGLE METHODS
// =============================================
// =============================================
// ✅ AUTH API - COMPLETE WITH GOOGLE METHODS
// =============================================
export const authAPI = {
  // In api.js, add these methods to authAPI

  forgotPassword: (data) => api.post('/auth/forgot-password', data),

  resetPassword: (token, password, confirmPassword) =>
    api.post(`/auth/reset-password/${token}`, { password, confirmPassword }),

  verifyResetToken: (token) =>
    api.get(`/auth/verify-token/${token}`),

  updatePhoneNumber: (phoneData) =>
    api.put('/users/phone', phoneData),

  sendPhoneVerification: () =>
    api.post('/users/phone/send-verification'),

  verifyPhone: (code) =>
    api.post('/users/phone/verify', { code }),
  // Email/Username login
  login: (identifier, password) => {
    const isEmail = identifier.includes('@');
    if (isEmail) {
      return api.post('/auth/login', { email: identifier, password });
    } else {
      return api.post('/auth/login', { username: identifier, password });
    }
  },

  // Register with email/password
  register: (userData) => api.post('/auth/register', userData),

  // Get current user profile
  getProfile: () => api.get('/auth/me'),

  // Update profile
  updateProfile: (userData) => api.put('/auth/profile', userData, {
    headers: {
      'Content-Type': 'application/json'
    }
  }),

  // Upload profile picture
  uploadProfilePicture: (formData) => api.post('/auth/profile/picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // Upload cover picture
  uploadCoverPicture: (formData) => api.post('/auth/profile/cover', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // ========== GOOGLE AUTH METHODS ==========

  /**
   * Get Google OAuth URL for redirect
   */
  getGoogleAuthUrl: () => {
    const backendUrl = API_URL.replace('/api', '');
    return `${backendUrl}/api/auth/google`;
  },

  /**
   * Exchange Google access token for JWT
   */
  googleLoginWithToken: (accessToken) => {
    return api.post('/auth/google/token', { accessToken });
  },

  /**
   * Handle Google OAuth callback
   */
  handleGoogleCallback: (token) => {
    localStorage.setItem('token', token);
    return api.get('/auth/me');
  },

  /**
   * Google Login with popup
   */
  googleLogin: () => {
    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authAPI.getGoogleAuthUrl(),
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
          cleanup();
          resolve(event.data);
        } else if (event.data.type === 'GOOGLE_LOGIN_ERROR') {
          cleanup();
          reject(new Error(event.data.error || 'Google login failed'));
        }
      };

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkPopupInterval);
      };

      window.addEventListener('message', handleMessage);

      const checkPopupInterval = setInterval(() => {
        if (popup?.closed) {
          cleanup();
          reject(new Error('Google login cancelled'));
        }
      }, 500);
    });
  },

  /**
   * Google Logout
   */
  googleLogout: () => {
    localStorage.removeItem('token');
  }
};

// Helper to check if user is Google-authenticated
export const isGoogleUser = (user) => {
  return user?.isGoogleUser || user?.googleId ? true : false;
};

// =============================================
// ✅ USERS API
// =============================================
// In api.js, update the usersAPI section:

export const usersAPI = {
  search: (query) =>
    api.get('/users/search', { params: { q: query } }),

  getById: (id) =>
    api.get(`/users/${id}`),

  getByUsername: (username) =>
    api.get(`/users/profile/${username}`),

  getSuggestions: (limit = 5) =>
    api.get(`/users/suggestions?limit=${limit}`),

  follow: (id) =>
    api.post(`/users/${id}/follow`),

  unfollow: (id) =>
    api.delete(`/users/${id}/follow`),

  getFollowers: (userId, page = 1, limit = 30) =>
    api.get(`/users/${userId}/followers`, { params: { page, limit } }),

  getFollowing: (userId, page = 1, limit = 30) =>
    api.get(`/users/${userId}/following`, { params: { page, limit } }),

  updateProfile: (userData) =>
    api.put('/users/profile', userData),

  updatePrivacy: (privacyData) =>
    api.put('/users/privacy', privacyData),

  // FIXED: Use the new push endpoints
  getPushSubscriptions: () =>
    api.get('/push/subscriptions'), // Changed from '/users/push-subscriptions'

  updateNotificationPreferences: (preferences) =>
    api.put('/push/preferences', preferences), // Changed to use push endpoint

  getNotificationPreferences: () =>
    api.get('/push/preferences') // Changed to use push endpoint
};

// =============================================
// ✅ POSTS API
// =============================================
// =============================================
// ✅ POSTS API - FIXED VERSION
// =============================================
export const postsAPI = {
  getAll: (page = 1, limit = 10, options = {}) => {
    const params = new URLSearchParams({
      limit: limit.toString()
    });

    // Support both page and cursor
    if (options.cursor) {
      params.append('cursor', options.cursor);
    } else {
      params.append('page', page.toString());
    }

    if (options.feedType) {
      params.append('feedType', options.feedType);
    }

    return api.get(`/posts?${params.toString()}`);
  },

  getById: (id) =>
    api.get(`/posts/${id}`),

  create: (postData) => {
    const config = {};
    if (postData instanceof FormData) {
      config.headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      };
    }
    return api.post(`/posts`, postData, config);
  },

  update: (id, postData) => {
    const config = {};
    if (postData instanceof FormData) {
      config.headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      };
    }
    return api.put(`/posts/${id}`, postData, config);
  },

  delete: (id) => api.delete(`/posts/${id}`),

  like: (postId) => api.post(`/posts/${postId}/like`),
  unlike: (postId) => api.post(`/posts/${postId}/unlike`),

  getUserPosts: (userId, page = 1, limit = 10) =>
    api.get(`/posts/user/${userId}?page=${page}&limit=${limit}`),

  getByTag: (tag, page = 1, limit = 10) =>
    api.get(`/posts/tag/${tag}?page=${page}&limit=${limit}`),

  search: async (query, options = {}) => {
    const { page = 1, limit = 10, type, sort, timeRange } = options;
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    if (type) params.append('type', type);
    if (sort) params.append('sort', sort);
    if (timeRange) params.append('timeRange', timeRange);
    return await api.get(`/posts/search?${params.toString()}`);
  },

  votePoll: (postId, optionIndex) =>
    api.post(`/posts/${postId}/poll/vote`, { optionIndex }),

  searchPosts: (query, limit = 20) =>
    api.get('/search/posts', { params: { q: query, limit } }),

  getTrending: () =>
    api.get('/posts/trending'),

  getAnalytics: (postId) =>
    api.get(`/posts/analytics/${postId}`),

  getMostViewed: (limit = 10) =>
    api.get('/posts/most-viewed', { params: { limit } }),

  trackView: (postId) =>
    api.post(`/posts/${postId}/view`),

  getViewers: (postId, page = 1, limit = 20) =>
    api.get(`/posts/${postId}/viewers`, { params: { page, limit } }),

  getViewStats: (postId, interval = 'week') =>
    api.get(`/posts/${postId}/view-stats`, { params: { interval } }),

  getRandomVideos: (page = 1, limit = 10) =>
    api.get('/posts/videos/random', { params: { page, limit } }),

  getTrendingVideos: (page = 1, limit = 10) =>
    api.get('/posts/videos/trending', { params: { page, limit } }),

  getUserVideos: (userId, page = 1, limit = 10) =>
    api.get(`/posts/videos/user/${userId}`, { params: { page, limit } }),

  getRecommendedVideos: (page = 1, limit = 10) =>
    api.get('/posts/videos/recommended', { params: { page, limit } }),

  getNextVideo: (postId) =>
    api.get(`/posts/videos/${postId}/next`),

  getTrendingTags: async () => {
    return await api.get('/posts/trending-tags');
  }
};

// =============================================
// ✅ COMMENTS API
// =============================================
export const commentsAPI = {
  getPostComments: (postId, page = 1, limit = 20, includeReplies = false) =>
    api.get(`/comments/post/${postId}`, {
      params: { page, limit, includeReplies }
    }),

  getReplies: (commentId, page = 1, limit = 20) =>
    api.get(`/comments/${commentId}/replies`, {
      params: { page, limit }
    }),

  createComment: (postId, content, parentComment = null) => {
    const data = { content };
    if (parentComment) data.parentComment = parentComment;
    return api.post(`/comments/post/${postId}`, data);
  },

  createCommentWithMedia: (postId, formData) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    return api.post(`/comments/post/${postId}`, formData, config);
  },

  editComment: (commentId, content) =>
    api.put(`/comments/${commentId}`, { content }),

  deleteComment: (commentId) =>
    api.delete(`/comments/${commentId}`),

  likeComment: (commentId) =>
    api.post(`/comments/${commentId}/like`),

  unlikeComment: (commentId) =>
    api.post(`/comments/${commentId}/unlike`),

  getComment: (commentId) =>
    api.get(`/comments/${commentId}`),
};

// =============================================
// ✅ HASHTAG API
// =============================================
export const hashtagAPI = {
  getPostsByHashtag: (tag, page = 1, limit = 20) =>
    api.get(`/hashtags/${tag}/posts`, { params: { page, limit } }),

  getTrendingHashtags: (limit = 10) =>
    api.get(`/hashtags/trending`, { params: { limit } }),
};

// =============================================
// ✅ CONVERSATIONS API
// =============================================
export const conversationsAPI = {
  getActive: (params = {}) => api.get('/conversations', { params }),
  getArchived: (params = {}) => api.get('/conversations/archived', { params }),
  getPinned: (params = {}) => api.get('/conversations/pinned', { params }),
  getUnreadCount: () => api.get('/conversations/unread-count'),
  create: (otherUserId) => api.post('/conversations', { userId: otherUserId }),
  getOne: (conversationId) => api.get(`/conversations/${conversationId}`),
  archive: (conversationId) => api.post(`/conversations/${conversationId}/archive`),
  unarchive: (conversationId) => api.post(`/conversations/${conversationId}/unarchive`),
  mute: (conversationId, duration = null) => api.post(`/conversations/${conversationId}/mute`, { duration }),
  unmute: (conversationId) => api.post(`/conversations/${conversationId}/unmute`),
  pin: (conversationId) => api.post(`/conversations/${conversationId}/pin`),
  unpin: (conversationId) => api.post(`/conversations/${conversationId}/unpin`),
  block: (conversationId, reason = null) => api.post(`/conversations/${conversationId}/block`, { reason }),
  unblock: (conversationId) => api.post(`/conversations/${conversationId}/unblock`),
};

// =============================================
// ✅ MESSAGES API
// =============================================
export const messagesAPI = {
  send: (conversationId, data) => {
    const isFormData = data instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post(`/conversations/${conversationId}/messages`, data, config);
  },

  getAll: (conversationId, { limit = 50, before = null, after = null, includeSystem = false } = {}) =>
    api.get(`/conversations/${conversationId}/messages`, {
      params: { limit, before, after, includeSystem },
    }),

  getMedia: (conversationId, { type = null, limit = 50 } = {}) =>
    api.get(`/conversations/${conversationId}/messages/media`, {
      params: { type, limit },
    }),

  markConversationRead: (conversationId) =>
    api.post(`/conversations/${conversationId}/messages/read`),

  markMessageRead: (conversationId, messageId) =>
    api.patch(`/conversations/${conversationId}/messages/${messageId}/read`),

  edit: (conversationId, messageId, content) =>
    api.patch(`/conversations/${conversationId}/messages/${messageId}`, { content }),

  deleteForMe: (conversationId, messageId) =>
    api.delete(`/conversations/${conversationId}/messages/${messageId}`),

  deleteForEveryone: (conversationId, messageId) =>
    api.delete(`/conversations/${conversationId}/messages/${messageId}/everyone`),

  react: (conversationId, messageId, emoji) =>
    api.post(`/conversations/${conversationId}/messages/${messageId}/react`, { emoji }),

  removeReaction: (conversationId, messageId) =>
    api.delete(`/conversations/${conversationId}/messages/${messageId}/react`),

  forward: (conversationId, messageId, targetConversationId) =>
    api.post(`/conversations/${conversationId}/messages/${messageId}/forward`, {
      targetConversationId,
    }),
};

// =============================================
// ✅ MESSAGES REAL-TIME (Socket.io)
// =============================================
export const messagesRealTime = {
  onNewMessage: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('message:new', callback);
    return () => socket.off('message:new', callback);
  },

  onMessageRead: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('message:read', callback);
    return () => socket.off('message:read', callback);
  },

  onTyping: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('typing:start', callback);
    socket.on('typing:stop', callback);
    return () => {
      socket.off('typing:start', callback);
      socket.off('typing:stop', callback);
    };
  },

  startTyping: (conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit('typing:start', { conversationId });
  },

  stopTyping: (conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit('typing:stop', { conversationId });
  },

  onReaction: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('message:reaction', callback);
    return () => socket.off('message:reaction', callback);
  },
};

// =============================================
// ✅ SEARCH API
// =============================================
export const searchAPI = {
  all: (query, page = 1, limit = 10) =>
    api.get('/search', { params: { q: query, page, limit } }),

  posts: (query, page = 1, limit = 10) =>
    api.get('/search/posts', { params: { q: query, page, limit } }),

  users: (query, page = 1, limit = 10) =>
    api.get('/search/users', { params: { q: query, page, limit } }),

  hashtags: (query, page = 1, limit = 10) =>
    api.get('/search/hashtags', { params: { q: query, page, limit } }),
};
// =============================================
// ✅ POSTS REAL-TIME (Socket.io) - ADD THIS SECTION
// =============================================
export const postsRealTime = {
  // Listen for new posts
  onNewPost: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('post:new', (data) => {
      console.log('📢 New post received:', data);
      callback(data);
    });
    return () => socket.off('post:new', callback);
  },

  // Listen for post updates (likes)
  onPostLiked: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('post:liked', (data) => {
      console.log('❤️ Post like update:', data);
      callback(data);
    });
    return () => socket.off('post:liked', callback);
  },

  // Listen for post deletions
  onPostDeleted: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('post:deleted', (data) => {
      console.log('🗑️ Post deleted:', data);
      callback(data);
    });
    return () => socket.off('post:deleted', callback);
  },

  // Listen for post updates (edits)
  onPostUpdated: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('post:updated', (data) => {
      console.log('✏️ Post updated:', data);
      callback(data);
    });
    return () => socket.off('post:updated', callback);
  }
};
// =============================================
// ✅ SOCKET CONNECTION STATUS
// =============================================
export const socketStatus = {
  isConnected: () => {
    const socket = getSocket();
    return socket?.connected || false;
  },

  onConnect: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('connect', callback);
    return () => socket.off('connect', callback);
  },

  onDisconnect: (callback) => {
    const socket = getSocket();
    if (!socket) return () => { };
    socket.on('disconnect', callback);
    return () => socket.off('disconnect', callback);
  },

  reconnect: () => {
    const socket = getSocket();
    if (socket) {
      socket.connect();
    }
  }
};


export default api;
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'pulse-cache-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push event received', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Pulse Notification',
        body: event.data.text(),
        icon: '/pulse-icon-192.png',
        badge: '/pulse-badge-72.png',
        url: '/'
      };
    }
  }

  // Customize notification based on type
  const getNotificationOptions = (data) => {
    // FIXED: Added tag property for each notification type
    const baseOptions = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/pulse-icon-192.png',
      badge: data.badge || '/pulse-badge-72.png',
      data: {
        url: data.url || data.data?.url || '/',
        type: data.type || 'notification',
        timestamp: Date.now(),
        ...data.data
      },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      timestamp: Date.now(),
      // FIXED: Added tag - required when renotify is true
      tag: data.tag || data.type || `notification-${Date.now()}`,
      renotify: true, // Now safe because tag is provided
      silent: false
    };

    // Customize based on notification type
    switch (data.type) {
      case 'like':
        return {
          ...baseOptions,
          title: data.title || '❤️ New Like',
          icon: '/icons/like-icon.png',
          badge: '/badge-like.png',
          tag: 'like-notification', // Fixed tag for grouping likes
          actions: [
            {
              action: 'view',
              title: 'View Post'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        };
      
      case 'comment':
        return {
          ...baseOptions,
          title: data.title || '💬 New Comment',
          icon: '/icons/comment-icon.png',
          badge: '/badge-comment.png',
          tag: 'comment-notification', // Fixed tag for grouping comments
          actions: [
            {
              action: 'reply',
              title: 'Reply'
            },
            {
              action: 'view',
              title: 'View'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        };
      
      case 'follow':
        return {
          ...baseOptions,
          title: data.title || '👥 New Follower',
          icon: '/icons/follow-icon.png',
          badge: '/badge-follow.png',
          tag: 'follow-notification', // Fixed tag for grouping follows
          actions: [
            {
              action: 'view-profile',
              title: 'View Profile'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        };
      
      case 'reply':
        return {
          ...baseOptions,
          title: data.title || '↩️ New Reply',
          icon: '/icons/reply-icon.png',
          badge: '/badge-reply.png',
          tag: 'reply-notification', // Fixed tag for grouping replies
          actions: [
            {
              action: 'reply',
              title: 'Reply'
            },
            {
              action: 'view',
              title: 'View Thread'
            }
          ]
        };
      
      case 'mention':
        return {
          ...baseOptions,
          title: data.title || '@ Mention',
          icon: '/icons/mention-icon.png',
          badge: '/badge-mention.png',
          tag: 'mention-notification', // Fixed tag for grouping mentions
          actions: [
            {
              action: 'view',
              title: 'View'
            },
            {
              action: 'reply',
              title: 'Reply'
            }
          ]
        };
      
      case 'message':
        return {
          ...baseOptions,
          title: data.title || '✉️ New Message',
          icon: '/icons/message-icon.png',
          badge: '/badge-message.png',
          tag: 'message-notification', // Fixed tag for grouping messages
          actions: [
            {
              action: 'reply',
              title: 'Reply'
            },
            {
              action: 'mark-read',
              title: 'Mark as Read'
            }
          ]
        };
      
      default:
        return {
          ...baseOptions,
          title: data.title || '🔔 Pulse Notification',
          icon: '/pulse-icon-192.png',
          badge: '/pulse-badge-72.png',
          tag: `notification-${Date.now()}`, // Unique tag for each
          actions: [
            {
              action: 'open',
              title: 'Open App'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        };
    }
  };

  const options = getNotificationOptions(data);

  event.waitUntil(
    self.registration.showNotification(
      options.title || 'Pulse Notification',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked', event);
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  let urlToOpen = '/';

  // Handle different actions
  if (action === 'reply' && notificationData.type === 'message') {
    // Open chat with reply interface
    urlToOpen = `/messages/${notificationData.conversationId}?reply=true`;
  } else if (action === 'view-profile' && notificationData.url) {
    urlToOpen = notificationData.url;
  } else if (action === 'mark-read') {
    // Mark as read without opening app
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationId: notificationData.notificationId })
    }).catch(err => console.log('Failed to mark as read:', err));
    
    // Still open the app but don't need to return early
    urlToOpen = notificationData.url || '/';
  } else {
    urlToOpen = notificationData.url || '/';
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification dismissed', event);
});
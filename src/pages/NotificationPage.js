import React, { useState, useEffect, useCallback } from 'react';
import { postsAPI, usersAPI, notificationsAPI, pushNotificationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import Post from '../components/posts/Post';
import './NotificationPage.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [preferences, setPreferences] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [pushPermission, setPushPermission] = useState('undetermined');
  const [pushToken, setPushToken] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Post preview states
  const [previewPost, setPreviewPost] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  // ========== THEME TOGGLE ==========
  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  // ========== CHECK PUSH PERMISSION ==========
  const checkPushPermission = useCallback(async () => {
    try {
      // Check browser permission
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }

      // Check if user has any push subscriptions
      const response = await usersAPI.getPushSubscriptions();
      const subscriptions = response.data?.data || [];
      
      if (subscriptions.length > 0) {
        setPushToken(subscriptions[0].endpoint);
        // If we have subscriptions, permission must be granted
        setPushPermission('granted');
      }
      
      // Check local storage for prompt dismissal
      const dismissed = localStorage.getItem('pushPromptDismissed');
      if (dismissed === 'true') {
        setPromptDismissed(true);
      }
      
    } catch (error) {
      console.error('Failed to check push permission:', error);
    }
  }, []);

  // ========== ENABLE PUSH NOTIFICATIONS ==========
  const enablePushNotifications = async () => {
    try {
      const result = await pushNotificationsAPI.subscribe();
      if (result && result.success) {
        toast.success('✅ Push notifications enabled!');
        setPushPermission('granted');
        setPushToken(result.subscription?.endpoint);
        setShowPrompt(false);
        setPromptDismissed(false);
        localStorage.removeItem('pushPromptDismissed');
        await checkPushPermission();
      }
    } catch (error) {
      console.error('Failed to enable push:', error);
      toast.error('Failed to enable push notifications: ' + error.message);
    }
  };

  // ========== DISABLE PUSH NOTIFICATIONS ==========
  const disablePushNotifications = async () => {
    try {
      if (pushToken) {
        await pushNotificationsAPI.unsubscribe();
        toast.info('Push notifications disabled');
        setPushPermission('denied');
        setPushToken(null);
      }
    } catch (error) {
      console.error('Failed to disable push:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  // ========== HANDLE PROMPT DISMISS ==========
  const dismissPrompt = () => {
    setShowPrompt(false);
    setPromptDismissed(true);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  // ========== CHECK IF SHOULD SHOW PROMPT ==========
  useEffect(() => {
    // Only check after we have permission status
    if (pushPermission === 'undetermined') return;
    
    // Don't show prompt if:
    // 1. Permission already granted
    // 2. Permission denied
    // 3. User has dismissed before
    // 4. Already have push token
    
    const shouldShowPrompt = 
      pushPermission === 'default' && 
      !promptDismissed && 
      !pushToken;
    
    if (shouldShowPrompt) {
      // Small delay before showing prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setShowPrompt(false);
    }
  }, [pushPermission, promptDismissed, pushToken]);

  // ========== NORMALIZE POST DATA ==========
  const normalizePost = useCallback((post) => {
    if (!post) return null;

    const author = post.author ? {
      _id: post.author._id || post.author.id,
      username: post.author.username || 'Unknown User',
      profilePicture: post.author.profilePicture || post.author.avatar || 'https://i.pravatar.cc/40',
      verified: post.author.verified || false
    } : {
      _id: post.userId || 'unknown',
      username: 'Unknown User',
      profilePicture: 'https://i.pravatar.cc/40',
      verified: false
    };

    const likes = Array.isArray(post.likes)
      ? post.likes.map(like => {
        if (typeof like === 'object') {
          return like._id || like.userId || like;
        }
        return like;
      }).filter(Boolean)
      : [];

    const likesCount = typeof post.likesCount === 'number'
      ? post.likesCount
      : likes.length;

    const isLikedByCurrentUser = user && likes.includes(user._id);

    const media = Array.isArray(post.media)
      ? post.media.map(mediaItem => ({
        ...mediaItem,
        url: mediaItem.url || mediaItem.path || '',
        mediaType: mediaItem.mediaType ||
          (mediaItem.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image'),
        thumbnail: mediaItem.thumbnail || mediaItem.url || '',
        altText: mediaItem.altText || mediaItem.caption || '',
        edits: mediaItem.edits || null
      })).filter(m => m.url)
      : [];

    const tags = Array.isArray(post.tags)
      ? post.tags.filter(Boolean)
      : Array.isArray(post.hashtags)
        ? post.hashtags.filter(Boolean)
        : [];

    return {
      ...post,
      _id: post._id || post.id,
      author,
      likes,
      likesCount,
      isLikedByCurrentUser,
      comments: Array.isArray(post.comments) ? post.comments : [],
      commentsCount: typeof post.commentsCount === 'number' ? post.commentsCount : 0,
      tags,
      media,
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
      visibility: post.visibility || 'public',
      viewsCount: post.viewsCount || 0,
      hasViewed: post.hasViewed || false
    };
  }, [user]);

  // ========== FETCH NOTIFICATIONS ==========
  const fetchNotifications = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      setError(null);
      if (!isLoadMore) setLoading(true);

      const response = await notificationsAPI.getAll(
        pageNum,
        20,
        typeFilter !== 'all' ? typeFilter : null,
        filter === 'unread'
      );

      const responseData = response?.data;
      const notificationsData = responseData?.data || [];
      const totalPages = responseData?.totalPages || 1;

      setNotifications(prev =>
        pageNum === 1 ? notificationsData : [...prev, ...notificationsData]
      );
      setHasMore(pageNum < totalPages);
      setPage(pageNum);

      fetchUnreadCount();

    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  // ========== FETCH UNREAD COUNT ==========
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      const count = response?.data?.data?.count || response?.data?.count || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // ========== FETCH PREFERENCES ==========
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await notificationsAPI.getPreferences();
      const prefs = response?.data?.data || response?.data || {};
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  }, []);

  // ========== UPDATE PREFERENCES ==========
  const updatePreferences = async (type, enabled) => {
    try {
      const updatedPrefs = { ...preferences, [type]: enabled };
      await notificationsAPI.updatePreferences(updatedPrefs);
      setPreferences(updatedPrefs);

      if (type === 'push' || type === 'global') {
        await pushNotificationsAPI.updatePreferences(updatedPrefs);
      }

      toast.success('Preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  // ========== MARK AS READ ==========
  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === id ? { ...notif, isRead: true, readAt: new Date() } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // ========== MARK ALL AS READ ==========
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // ========== ARCHIVE NOTIFICATION ==========
  const archiveNotification = async (id) => {
    try {
      await notificationsAPI.archiveNotification(id);
      setNotifications(prev => prev.filter(notif => notif._id !== id));
      fetchUnreadCount();
      toast.info('Notification archived');
    } catch (error) {
      console.error('Failed to archive notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  // ========== DELETE NOTIFICATION ==========
  const deleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;

    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(notif => notif._id !== id));
      fetchUnreadCount();
      toast.info('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // ========== FETCH POST FOR PREVIEW ==========
  const fetchPostPreview = async (postId) => {
    if (!postId) return;

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewPost(null);

    try {
      const response = await postsAPI.getById(postId);
      let postData = response.data?.data || response.data;
      const normalizedPost = normalizePost(postData);

      if (normalizedPost) {
        setPreviewPost(normalizedPost);
      } else {
        setPreviewError('Invalid post data received');
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
      setPreviewError(error.response?.data?.message || 'Failed to load post preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ========== HANDLE NOTIFICATION CLICK ==========
  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    const senderUsername = notification.sender?.username;
    const senderId = notification.sender?._id || notification.sender;
    const postId = notification.metadata?.postId || notification.reference?.id;

    switch (notification.type) {
      case 'new_follower':
      case 'follow':
        if (senderUsername) {
          navigate(`/profile/${senderUsername}`);
        } else if (senderId) {
          try {
            const response = await usersAPI.getById(senderId);
            const userData = response.data?.data || response.data;
            navigate(`/profile/${userData?.username || senderId}`);
          } catch (error) {
            console.error('Failed to fetch user:', error);
            navigate(`/profile/${senderId}`);
          }
        }
        break;

      case 'post_like':
      case 'like':
      case 'post_comment':
      case 'comment':
      case 'comment_reply':
      case 'mention':
        if (postId) {
          fetchPostPreview(postId);
        }
        break;

      case 'event_invitation':
        if (notification.reference?.id) navigate(`/events/${notification.reference.id}`);
        break;

      case 'group_invitation':
        if (notification.reference?.id) navigate(`/groups/${notification.reference.id}`);
        break;

      default:
        if (notification.actionUrl) {
          navigate(notification.actionUrl);
        }
        break;
    }
  };

  // ========== LOAD MORE ==========
  const loadMore = () => {
    fetchNotifications(page + 1, true);
  };

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    fetchNotifications(1, false);
    fetchPreferences();
    checkPushPermission();
  }, []);

  // ========== REFETCH WHEN FILTERS CHANGE ==========
  useEffect(() => {
    fetchNotifications(1, false);
  }, [filter, typeFilter]);

  // ========== REAL-TIME NEW NOTIFICATIONS ==========
  useEffect(() => {
    if (!user) return;

    const cleanup = notificationsAPI.onNewNotification((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      if (!newNotification.isRead) {
        setUnreadCount(prev => prev + 1);

        toast.info(
          <div onClick={() => handleNotificationClick(newNotification)}>
            <strong>{newNotification.title || 'New Notification'}</strong>
            <p>{newNotification.message}</p>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      }
    });

    return cleanup;
  }, [user]);

  // ========== ICON & TEXT HELPERS ==========
  const getNotificationIcon = (type) => {
    const icons = {
      new_follower: <i className="fas fa-user-plus"></i>,
      follow: <i className="fas fa-user-plus"></i>,
      post_like: <i className="fas fa-heart"></i>,
      like: <i className="fas fa-heart"></i>,
      post_comment: <i className="fas fa-comment"></i>,
      comment: <i className="fas fa-comment"></i>,
      comment_reply: <i className="fas fa-reply"></i>,
      mention: <i className="fas fa-at"></i>,
      event_invitation: <i className="fas fa-calendar-alt"></i>,
      group_invitation: <i className="fas fa-users"></i>,
      system: <i className="fas fa-cog"></i>
    };
    return icons[type] || <i className="fas fa-bell"></i>;
  };

  const getNotificationText = (notification) => {
    const user = notification.sender?.username || 'Someone';
    const texts = {
      new_follower: (
        <>
          <span className="notification-highlight">{user}</span> started following you
        </>
      ),
      follow: (
        <>
          <span className="notification-highlight">{user}</span> started following you
        </>
      ),
      post_like: (
        <>
          <span className="notification-highlight">{user}</span> liked your post
        </>
      ),
      like: (
        <>
          <span className="notification-highlight">{user}</span> liked your post
        </>
      ),
      post_comment: (
        <>
          <span className="notification-highlight">{user}</span> commented on your post
        </>
      ),
      comment: (
        <>
          <span className="notification-highlight">{user}</span> commented on your post
        </>
      ),
      comment_reply: (
        <>
          <span className="notification-highlight">{user}</span> replied to your comment
        </>
      ),
      system: notification.message || notification.content || 'System notification'
    };
    return texts[notification.type] || notification.message || notification.content || 'You have a new notification';
  };

  // ========== RENDER PREFERENCES ==========
  const renderPreferences = () => {
    const notificationTypes = [
      { key: 'new_follower', label: 'New Followers', icon: '👤' },
      { key: 'post_like', label: 'Likes', icon: '❤️' },
      { key: 'post_comment', label: 'Comments', icon: '💬' },
      { key: 'comment_reply', label: 'Replies', icon: '↩️' },
      { key: 'mention', label: 'Mentions', icon: '@' },
      { key: 'system', label: 'System', icon: '⚙️' }
    ];

    return (
      <div className={`preferences-panel ${isDark ? 'dark' : ''}`}>
        <div className="preferences-header">
          <h3>
            <i className="fas fa-sliders-h"></i>
            Notification Preferences
          </h3>
          <button
            className="close-preferences"
            onClick={() => setShowPreferences(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Push Notification Settings */}
        <div className="preferences-section">
          <h4>
            <i className="fas fa-bell"></i>
            Push Notifications
          </h4>
          <div className="push-settings">
            {pushPermission === 'granted' ? (
              <button
                className="push-toggle-btn enabled"
                onClick={disablePushNotifications}
              >
                <i className="fas fa-check-circle"></i>
                Push Notifications Enabled
              </button>
            ) : pushPermission === 'denied' ? (
              <div className="push-denied">
                <i className="fas fa-exclamation-triangle"></i>
                <p>Push notifications are blocked. Enable them in your browser settings.</p>
                <button
                  className="retry-btn"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : (
              <button
                className="push-toggle-btn"
                onClick={enablePushNotifications}
              >
                <i className="fas fa-bell"></i>
                Enable Push Notifications
              </button>
            )}
          </div>
        </div>

        <div className="preferences-section">
          <h4>
            <i className="fas fa-filter"></i>
            Notification Types
          </h4>
          <div className="preferences-list">
            {notificationTypes.map(type => (
              <label key={type.key} className="preference-item">
                <span className="preference-label">
                  <span className="preference-icon">{type.icon}</span>
                  {type.label}
                </span>
                <input
                  type="checkbox"
                  checked={preferences?.types?.[type.key]?.push !== false}
                  onChange={(e) => {
                    const newPrefs = {
                      ...preferences,
                      types: {
                        ...preferences?.types,
                        [type.key]: {
                          ...preferences?.types?.[type.key],
                          push: e.target.checked
                        }
                      }
                    };
                    updatePreferences(type.key, newPrefs);
                  }}
                  className="preference-checkbox"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDER FILTERS ==========
  const renderFilters = () => {
    return (
      <div className={`filters-bar ${isDark ? 'dark' : ''}`}>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <i className="fas fa-list-ul"></i>
            All
          </button>
          <button
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            <i className="fas fa-envelope"></i>
            Unread {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </button>
        </div>

        <div className="type-filter">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="type-select"
          >
            <option value="all">All Types</option>
            <option value="new_follower">Follows</option>
            <option value="post_like">Likes</option>
            <option value="post_comment">Comments</option>
            <option value="comment_reply">Replies</option>
            <option value="mention">Mentions</option>
          </select>
        </div>

        <button
          className="preferences-btn"
          onClick={() => setShowPreferences(!showPreferences)}
          title="Notification Preferences"
        >
          <i className="fas fa-cog"></i>
        </button>

        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
        </button>
      </div>
    );
  };

  return (
    <div className={`notifications-page ${isDark ? 'dark' : ''}`}>
      <div className="notifications-container">
        {/* Header with Home link */}
        <div className="page-header">
          <div className="header-left">
            <button
              className="home-btn"
              onClick={() => navigate('/')}
              title="Go to Home"
            >
              <i className="fas fa-home"></i>
              <span>Home</span>
            </button>
          </div>
          <div className="header-center">
            <h1>
              <i className="fas fa-bell"></i>
              Notifications
            </h1>
          </div>
          <div className="header-right">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="mark-all-read-btn"
                title="Mark all as read"
              >
                <i className="fas fa-check-double"></i>
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {renderFilters()}
        {showPreferences && renderPreferences()}

        {error && (
          <div className="error-container">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
            <button onClick={() => fetchNotifications(1, false)} className="retry-btn">
              <i className="fas fa-redo"></i>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-bell-slash"></i>
            </div>
            <h3>All caught up!</h3>
            <p>No notifications to show</p>
            <button
              className="browse-btn"
              onClick={() => navigate('/')}
            >
              <i className="fas fa-compass"></i>
              Browse Home Feed
            </button>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`notification-item ${notification.isRead ? '' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-text">
                      {getNotificationText(notification)}
                    </div>
                    <div className="notification-time">
                      <i className="far fa-clock"></i>
                      {moment(notification.createdAt).fromNow()}
                    </div>
                    {notification.metadata?.postContent && (
                      <div className="notification-preview">
                        "{notification.metadata.postContent.substring(0, 60)}..."
                      </div>
                    )}
                  </div>

                  {!notification.isRead && <div className="notification-dot"></div>}

                  <div className="notification-actions">
                    <button
                      className="action-btn archive"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveNotification(notification._id);
                      }}
                      title="Archive"
                    >
                      <i className="fas fa-archive"></i>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      title="Delete"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="load-more-container">
                <button
                  onClick={loadMore}
                  className="load-more-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chevron-down"></i>
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Notification Prompt - Only shows if conditions are met */}
        {showPrompt && pushPermission === 'default' && !pushToken && (
          <div className="notification-prompt">
            <div className="prompt-content">
              <div className="prompt-icon">🔔</div>
              <h3>Stay Updated</h3>
              <p>Get notified when someone interacts with your content</p>
              <div className="prompt-actions">
                <button
                  onClick={enablePushNotifications}
                  className="btn-primary"
                >
                  Enable Notifications
                </button>
                <button
                  onClick={dismissPrompt}
                  className="btn-secondary"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subtle reminder bell - Only shows if permission is default and not dismissed */}
        {!showPrompt && pushPermission === 'default' && !promptDismissed && !pushToken && (
          <button
            className="notification-reminder"
            onClick={() => setShowPrompt(true)}
            title="Enable notifications"
          >
            🔔
          </button>
        )}

        {/* Post Preview Modal */}
        {previewPost && (
          <div className="modal-overlay" onClick={() => setPreviewPost(null)}>
            <div className="modal-content post-preview-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <i className="fas fa-file-alt"></i>
                  Post Preview
                </h3>
                <button className="close-modal-btn" onClick={() => setPreviewPost(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                {previewLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading post...</p>
                  </div>
                ) : previewError ? (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    <p>{previewError}</p>
                    <button
                      className="retry-btn"
                      onClick={() => {
                        const postId = previewPost?._id ||
                          notifications.find(n => n.metadata?.postId)?.metadata?.postId;
                        if (postId) fetchPostPreview(postId);
                      }}
                    >
                      <i className="fas fa-redo"></i>
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="preview-post-container">
                    <Post
                      post={previewPost}
                      onLike={() => { }}
                      onUnlike={() => { }}
                      onDelete={() => { }}
                      isDark={isDark}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPreviewPost(null)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigate(`/posts/${previewPost._id}`);
                    setPreviewPost(null);
                  }}
                >
                  <i className="fas fa-external-link-alt"></i>
                  View Full Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import './App.css';
import MessagePage from './pages/Messages/MessagePage';
import SearchBar from './components/common/SearchBar';
import SearchPage from './pages/SearchPage';
import PostDetailPage from './pages/PostDetailPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import GoogleCallback from './pages/GoogleCallback';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import NotificationPage from './pages/NotificationPage';
import ProfilePage from './pages/ProfilePage';
import FollowersPage from './pages/FollowersPage';
import FollowingPage from './pages/FollowingPage';

// Services
import { initSocket, getSocket, notificationsAPI, conversationsAPI, pushNotificationsAPI } from './services/api';

// =============================================
// Custom Hook for Active Route
// =============================================
const useActiveRoute = () => {
  const location = useLocation();
  return location.pathname;
};

// =============================================
// Custom Hook for Notifications Count
// =============================================
const useNotificationsCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const { user } = useAuth();
  // Add this near the top of your App component
  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          console.log('📱 Attempting to register service worker...');

          // Check if file exists
          const response = await fetch('/service-worker.js');
          console.log('Service worker file status:', response.status);

          if (response.ok) {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service worker registered:', registration);

            // Check push subscription
            const subscription = await registration.pushManager.getSubscription();
            console.log('Current push subscription:', subscription);
          } else {
            console.error('❌ Service worker file not found at /service-worker.js');
          }
        } catch (error) {
          console.error('❌ Service worker registration failed:', error);
        }
      } else {
        console.log('❌ Service workers not supported in this browser');
      }
    };

    registerServiceWorker();
  }, []);
  useEffect(() => {
    if (!user) return;

    // Fetch initial counts
    const fetchCounts = async () => {
      try {
        // Get unread notifications count
        const notifResponse = await notificationsAPI.getUnreadCount();
        setUnreadCount(notifResponse.data.count || 0);

        // Get unread messages count using the correct API
        const messageResponse = await conversationsAPI.getUnreadCount();
        setMessageCount(messageResponse.data?.data?.totalUnread || 0);
      } catch (error) {
        console.error('Failed to fetch counts:', error);
      }
    };

    fetchCounts();

    // Refresh counts periodically
    const interval = setInterval(fetchCounts, 30000); // Every 30 seconds

    // Listen for real-time updates via socket
    const socket = getSocket();
    if (socket) {
      // Listen for new notifications
      socket.on('notification:new', (notification) => {
        setUnreadCount(prev => prev + 1);
      });

      // Listen for notifications read
      socket.on('notification:read', (data) => {
        setUnreadCount(prev => Math.max(0, prev - (data.count || 1)));
      });

      // Listen for new messages
      socket.on('message:new', (message) => {
        if (!message.read) {
          setMessageCount(prev => prev + 1);
        }
      });

      // Listen for messages read
      socket.on('messages:read', (data) => {
        setMessageCount(prev => Math.max(0, prev - (data.count || 1)));
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('notification:new');
        socket.off('notification:read');
        socket.off('message:new');
        socket.off('messages:read');
      }
    };
  }, [user]);

  return { unreadCount, messageCount, totalCount: unreadCount + messageCount };
};

// =============================================
// NEW: Custom Hook for Push Notifications
// =============================================
// =============================================
// Custom Hook for Push Notifications (UPDATED)
// =============================================
// In App.js - Update usePushNotifications
// In App.js - Update the usePushNotifications hook
const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState('undetermined');

  useEffect(() => {
    if (!user) return;

    const setupPushNotifications = async () => {
      try {
        // Check if push is supported
        if (!pushNotificationsAPI.isSupported()) {
          console.log('Push not supported');
          setPermissionStatus('unsupported');
          return;
        }

        // Check current permission
        const permission = Notification.permission;
        console.log('📱 Current notification permission:', permission);

        if (permission === 'granted') {
          console.log('✅ Permission already granted');
          setPermissionStatus('granted');

          // Check if we have a subscription
          try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
              console.log('📡 Permission granted but no subscription - creating...');
              const result = await pushNotificationsAPI.subscribe();
              if (result.success) {
                console.log('✅ Subscription created successfully');
              } else {
                console.log('⚠️ Subscription creation returned:', result);
              }
            } else {
              console.log('✅ Existing subscription found');

              // Optional: Verify subscription is still valid with server
              const subscriptions = await pushNotificationsAPI.getSubscriptions();
              const existsOnServer = subscriptions.data?.some(
                s => s.endpoint === subscription.endpoint
              );

              if (!existsOnServer) {
                console.log('📡 Subscription exists but not on server - resending...');
                await pushNotificationsAPI.subscribe();
              }
            }
          } catch (subError) {
            console.error('❌ Error checking subscription:', subError);
          }
        }
        else if (permission === 'denied') {
          console.log('🚫 Permission denied');
          setPermissionStatus('denied');
        }
        else {
          console.log('❓ Permission not requested - will prompt on interaction');
          setPermissionStatus('prompt');
        }

      } catch (error) {
        console.error('Push setup error:', error);
      }
    };

    setupPushNotifications();
  }, [user]);

  // Function to request permission
  const requestPermission = async () => {
    try {
      const result = await pushNotificationsAPI.subscribe();
      if (result.success) {
        setPermissionStatus('granted');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  return { permissionStatus, requestPermission };
};

// =============================================
// Protected Route Component
// =============================================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your experience...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

// =============================================
// Public Route Component
// =============================================
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  return children;
};

// =============================================
// Merged Notification Icon Component
// =============================================
const MergedNotificationIcon = ({ unreadCount, messageCount, totalCount, isMobile = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`merged-notification-container ${isMobile ? 'mobile' : ''}`}>
      <div
        className="merged-notification-icon"
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Main Bell Icon */}
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Chat Bubble Overlay */}
        <div className="chat-overlay">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 3H3C2.46957 3 1.96086 3.21071 1.58579 3.58579C1.21071 3.96086 1 4.46957 1 5V15C1 15.5304 1.21071 16.0391 1.58579 16.4142C1.96086 16.7893 2.46957 17 3 17H7L11 21V17H17C17.5304 17 18.0391 16.7893 18.4142 16.4142C18.7893 16.0391 19 15.5304 19 15V5C19 4.46957 18.7893 3.96086 18.4142 3.58579C18.0391 3.21071 17.5304 3 17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Total Count Badge */}
        {totalCount > 0 && (
          <span className="total-badge">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </div>

      {/* Detailed Popup */}
      {showDetails && (unreadCount > 0 || messageCount > 0) && (
        <div className="notification-details-popup">
          <div className="popup-arrow"></div>

          {unreadCount > 0 && (
            <div className="detail-item notifications">
              <span className="detail-icon">🔔</span>
              <span className="detail-text">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {messageCount > 0 && (
            <div className="detail-item messages">
              <span className="detail-icon">💬</span>
              <span className="detail-text">
                {messageCount} unread message{messageCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="popup-actions">
            <Link to="/notifications" className="popup-link">View All</Link>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================
// Desktop Navbar Component with Double-Click
// =============================================
const DesktopNavbar = () => {
  const { user, logout } = useAuth();
  const activeRoute = useActiveRoute();
  const { unreadCount, messageCount, totalCount } = useNotificationsCount();
  const navigate = useNavigate();
  const location = useLocation();
  const homeButtonRef = useRef(null);
  const [lastClickTime, setLastClickTime] = useState(0);

  if (!user) return null;

  const isActive = (path) => {
    if (path === '/') return activeRoute === '/';
    return activeRoute.startsWith(path);
  };

  const handleHomeDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    if (timeDiff < 300) { // Double click detected (within 300ms)
      // Refresh the page
      window.location.reload();
    } else {
      // Single click - navigate to home
      if (location.pathname !== '/') {
        navigate('/');
      } else {
        // Already on home, scroll to top
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }

    setLastClickTime(currentTime);
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    if (timeDiff < 300) {
      // Double click detected, let the double-click handler deal with it
      return;
    }

    // Single click
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    setLastClickTime(currentTime);
  };

  // Handle logout with push cleanup
  const handleLogout = async () => {
    try {
      await logout(); // This should call authAPI.logout which handles push cleanup
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar desktop-navbar">
      <div className="navbar-content container">
        <Link to="/" className="nav-logo" onClick={handleHomeClick} onDoubleClick={handleHomeDoubleClick}>
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="logo-text">Pulse</span>
        </Link>

        <SearchBar />

        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={handleHomeClick}
            onDoubleClick={handleHomeDoubleClick}
            ref={homeButtonRef}
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 3L21 9V20H15V14H9V20H3V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-text">Home</span>
          </Link>

          <Link to="/messages" className={`nav-link ${isActive('/messages') ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {messageCount > 0 && (
                <span className="nav-badge message-badge">{messageCount}</span>
              )}
            </span>
            <span className="nav-text">Messages</span>
          </Link>

          <Link to="/notifications" className={`nav-link notifications-link ${isActive('/notifications') ? 'active' : ''}`}>
            <span className="nav-icon">
              <MergedNotificationIcon
                unreadCount={unreadCount}
                messageCount={messageCount}
                totalCount={totalCount}
              />
            </span>
            <span className="nav-text">Activity</span>
          </Link>

          <Link to={`/profile/${user.username}`} className={`nav-link ${isActive('/profile/') ? 'active' : ''}`}>
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-text">Profile</span>
          </Link>

          <button onClick={handleLogout} className="btn-logout">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

// =============================================
// Mobile Bottom Navbar Component with Double-Click
// =============================================
const MobileBottomNavbar = () => {
  const { user, logout } = useAuth();
  const activeRoute = useActiveRoute();
  const { unreadCount, messageCount, totalCount } = useNotificationsCount();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [lastClickTime, setLastClickTime] = useState(0);

  if (!user) return null;

  const isActive = (path) => {
    if (path === '/') return activeRoute === '/';
    return activeRoute.startsWith(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setTimeout(() => setShowLogoutConfirm(false), 3000);
  };

  const confirmLogout = async () => {
    try {
      await logout(); // This should call authAPI.logout which handles push cleanup
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();

    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    if (timeDiff < 300) {
      // Double click detected
      window.location.reload();
      return;
    }

    // Single click
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    setLastClickTime(currentTime);
  };

  const handleHomeDoubleClick = (e) => {
    e.preventDefault();
    window.location.reload();
  };

  return (
    <>
      {showLogoutConfirm && (
        <div className="logout-confirm">
          <span>Logout?</span>
          <button onClick={confirmLogout} className="confirm-yes">Yes</button>
          <button onClick={() => setShowLogoutConfirm(false)} className="confirm-no">No</button>
        </div>
      )}

      <nav className="mobile-bottom-navbar">
        <div className="bottom-nav-content">
          <div
            className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
            onClick={handleHomeClick}
            onDoubleClick={handleHomeDoubleClick}
          >
            <span className="bottom-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 3L21 9V20H15V14H9V20H3V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Home</span>
          </div>

          <Link to="/search" className={`bottom-nav-item ${isActive('/search') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Search</span>
          </Link>

          <Link to="/messages" className={`bottom-nav-item ${isActive('/messages') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {messageCount > 0 && (
                <span className="mobile-badge message-badge">{messageCount}</span>
              )}
            </span>
            <span className="bottom-nav-text">Chat</span>
          </Link>

          <Link to="/notifications" className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <MergedNotificationIcon
                unreadCount={unreadCount}
                messageCount={messageCount}
                totalCount={totalCount}
                isMobile={true}
              />
            </span>
            <span className="bottom-nav-text">Activity</span>
          </Link>

          <Link to={`/profile/${user.username}`} className={`bottom-nav-item ${isActive('/profile/') ? 'active' : ''}`}>
            <span className="bottom-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Me</span>
          </Link>

          <button onClick={handleLogoutClick} className="bottom-nav-item logout-btn">
            <span className="bottom-nav-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Exit</span>
          </button>
        </div>
      </nav>
    </>
  );
};

// =============================================
// Main App Content
// =============================================
const AppContent = () => {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  // Make navigate available globally for push notifications
  useEffect(() => {
    window.navigateTo = navigate;
    return () => {
      delete window.navigateTo;
    };
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user) {
      try {
        initSocket(token);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    }
  }, [user]);

  // Initialize push notifications
  usePushNotifications();

  return (
    <div className="App">
      {user && !isMobile && <DesktopNavbar />}

      <div className={`main-content ${user ? '' : 'auth-page'} ${isMobile ? 'has-bottom-nav' : ''}`}>
        <Routes>
          {/* ===== Public Routes ===== */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route path="/posts/:postId" element={<PostDetailPage />} />
          <Route path="/google-callback" element={<GoogleCallback />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* ===== Public Profile Routes ===== */}
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/profile/:username/followers" element={<FollowersPage />} />
          <Route path="/profile/:username/following" element={<FollowingPage />} />

          {/* ===== Protected Routes ===== */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/search"
            element={<SearchPage />}
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationPage />
              </ProtectedRoute>
            }
          />

          {/* ===== Messages Routes ===== */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <MessagePage />
              </ProtectedRoute>
            }
          />

          {/* ===== Profile Redirect ===== */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Navigate to={`/profile/${user?.username}`} />
              </ProtectedRoute>
            }
          />

          {/* ===== 404 Fallback ===== */}
          <Route
            path="*"
            element={
              <div className="not-found-page">
                <h1>404</h1>
                <p>Page not found</p>
                <Link to="/" className="btn-primary">Go Home</Link>
              </div>
            }
          />
        </Routes>
      </div>

      {user && isMobile && <MobileBottomNavbar />}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

// =============================================
// App Wrapper - FIXED VERSION
// =============================================
const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <PWAInstallPrompt />
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
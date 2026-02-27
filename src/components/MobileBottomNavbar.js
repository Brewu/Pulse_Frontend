import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Lazy load notification icon
const MergedNotificationIcon = React.lazy(() => import('./MergedNotifications'));

// Custom hook for active route
const useActiveRoute = () => {
  const location = useLocation();
  return location.pathname;
};

// Custom hook for notifications count
const useNotificationsCount = () => {
  const { user } = useAuth();
  const [unreadCount] = useState(0); // This will be connected to your actual notification system
  const [messageCount] = useState(0);
  
  return { unreadCount, messageCount, totalCount: unreadCount + messageCount };
};

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
      await logout();
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
      window.location.reload();
      return;
    }

    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="logout-confirm" role="alertdialog" aria-label="Confirm logout">
          <span>Logout?</span>
          <button onClick={confirmLogout} className="confirm-yes" aria-label="Yes, logout">Yes</button>
          <button onClick={() => setShowLogoutConfirm(false)} className="confirm-no" aria-label="No, stay logged in">No</button>
        </div>
      )}

      <nav className="mobile-bottom-navbar" aria-label="Mobile navigation">
        <div className="bottom-nav-content">
          <div
            className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
            onClick={handleHomeClick}
            onDoubleClick={handleHomeDoubleClick}
            role="link"
            tabIndex={0}
            aria-label="Home"
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 3L21 9V20H15V14H9V20H3V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Home</span>
          </div>

          <Link 
            to="/search" 
            className={`bottom-nav-item ${isActive('/search') ? 'active' : ''}`}
            aria-current={isActive('/search') ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Search</span>
          </Link>

          <Link 
            to="/messages" 
            className={`bottom-nav-item ${isActive('/messages') ? 'active' : ''}`}
            aria-current={isActive('/messages') ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {messageCount > 0 && (
                <span className="mobile-badge message-badge" aria-label={`${messageCount} unread messages`}>
                  {messageCount > 99 ? '99+' : messageCount}
                </span>
              )}
            </span>
            <span className="bottom-nav-text">Chat</span>
          </Link>

          <Link 
            to="/notifications" 
            className={`bottom-nav-item ${isActive('/notifications') ? 'active' : ''}`}
            aria-current={isActive('/notifications') ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <React.Suspense fallback={<span className="nav-icon-placeholder">🔔</span>}>
                <MergedNotificationIcon
                  unreadCount={unreadCount}
                  messageCount={messageCount}
                  totalCount={totalCount}
                  isMobile={true}
                />
              </React.Suspense>
            </span>
            <span className="bottom-nav-text">Activity</span>
          </Link>

          <Link 
            to={`/profile/${user.username}`} 
            className={`bottom-nav-item ${isActive('/profile/') ? 'active' : ''}`}
            aria-current={isActive('/profile/') ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="bottom-nav-text">Me</span>
          </Link>

          <button 
            onClick={handleLogoutClick} 
            className="bottom-nav-item logout-btn"
            aria-label="Logout"
          >
            <span className="bottom-nav-icon" aria-hidden="true">
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

export default MobileBottomNavbar;
import React, { useState, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Lazy load non-critical components
const SearchBar = lazy(() => import('./common/SearchBar'));
const MergedNotificationIcon = lazy(() => import('./MergedNotifications'));

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

    if (timeDiff < 300) {
      window.location.reload();
    } else {
      if (location.pathname !== '/') {
        navigate('/');
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    setLastClickTime(currentTime);
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    if (timeDiff < 300) return;

    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setLastClickTime(currentTime);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar desktop-navbar" aria-label="Main navigation">
      <div className="navbar-content container">
        <Link 
          to="/" 
          className="nav-logo" 
          onClick={handleHomeClick} 
          onDoubleClick={handleHomeDoubleClick}
          aria-label="Pulse Home"
        >
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="logo-text">Pulse</span>
        </Link>

        <Suspense fallback={<div className="search-placeholder" />}>
          <SearchBar />
        </Suspense>

        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={handleHomeClick}
            onDoubleClick={handleHomeDoubleClick}
            ref={homeButtonRef}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 3L21 9V20H15V14H9V20H3V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-text">Home</span>
          </Link>

          <Link 
            to="/messages" 
            className={`nav-link ${isActive('/messages') ? 'active' : ''}`}
            aria-current={isActive('/messages') ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {messageCount > 0 && (
                <span className="nav-badge message-badge" aria-label={`${messageCount} unread messages`}>
                  {messageCount > 99 ? '99+' : messageCount}
                </span>
              )}
            </span>
            <span className="nav-text">Messages</span>
          </Link>

          <Link 
            to="/notifications" 
            className={`nav-link notifications-link ${isActive('/notifications') ? 'active' : ''}`}
            aria-current={isActive('/notifications') ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <Suspense fallback={<span className="nav-icon-placeholder">🔔</span>}>
                <MergedNotificationIcon
                  unreadCount={unreadCount}
                  messageCount={messageCount}
                  totalCount={totalCount}
                />
              </Suspense>
            </span>
            <span className="nav-text">Activity</span>
          </Link>

          <Link 
            to={`/profile/${user.username}`} 
            className={`nav-link ${isActive('/profile/') ? 'active' : ''}`}
            aria-current={isActive('/profile/') ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="nav-text">Profile</span>
          </Link>

          <button onClick={handleLogout} className="btn-logout" aria-label="Logout">
            <span className="nav-icon" aria-hidden="true">
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

export default DesktopNavbar;
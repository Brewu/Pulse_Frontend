import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Home', exact: true },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-card">
        <div className="sidebar-header">
          <h3>Menu</h3>
        </div>
        
        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </div>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <img 
              src={user?.profilePicture || 'https://i.pravatar.cc/40'} 
              alt={user?.username}
              className="user-avatar-small"
            />
            <div className="user-details">
              <div className="user-name">{user?.username}</div>
              <div className="user-status">Online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
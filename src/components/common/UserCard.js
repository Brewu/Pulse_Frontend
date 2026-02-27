import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './UserCard.css';

const UserCard = ({ user, compact = false }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(
    user.isFollowing || currentUser?.following?.includes(user._id) || false
  );
  const [followerCount, setFollowerCount] = useState(user.followers?.length || 0);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      if (isFollowing) {
        await usersAPI.unfollow(user._id);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await usersAPI.follow(user._id);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rank color mapping with enhanced gradients
  const getRankStyle = (rank) => {
    const styles = {
      'Rookie': {
        color: '#9ca3af',
        gradient: 'linear-gradient(135deg, #9ca3af, #d1d5db)',
        icon: '🌱',
        shadow: '0 0 20px rgba(156, 163, 175, 0.3)'
      },
      'Bronze': {
        color: '#b45309',
        gradient: 'linear-gradient(135deg, #b45309, #d97706)',
        icon: '🥉',
        shadow: '0 0 20px rgba(180, 83, 9, 0.3)'
      },
      'Silver': {
        color: '#9ca3af',
        gradient: 'linear-gradient(135deg, #9ca3af, #e5e7eb)',
        icon: '🥈',
        shadow: '0 0 20px rgba(156, 163, 175, 0.3)'
      },
      'Gold': {
        color: '#fbbf24',
        gradient: 'linear-gradient(135deg, #fbbf24, #fcd34d)',
        icon: '🥇',
        shadow: '0 0 20px rgba(251, 191, 36, 0.3)'
      },
      'Platinum': {
        color: '#6ee7b7',
        gradient: 'linear-gradient(135deg, #6ee7b7, #a7f3d0)',
        icon: '💎',
        shadow: '0 0 20px rgba(110, 231, 183, 0.3)'
      },
      'Diamond': {
        color: '#34d399',
        gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)',
        icon: '🔷',
        shadow: '0 0 20px rgba(52, 211, 153, 0.3)'
      },
      'Master': {
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
        icon: '👑',
        shadow: '0 0 20px rgba(139, 92, 246, 0.3)'
      },
      'Grandmaster': {
        color: '#ec4899',
        gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
        icon: '⚡',
        shadow: '0 0 20px rgba(236, 72, 153, 0.3)'
      },
      'Legend': {
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        icon: '🔥',
        shadow: '0 0 20px rgba(245, 158, 11, 0.3)'
      },
      'Mythic': {
        color: '#f97316',
        gradient: 'linear-gradient(135deg, #f97316, #fb923c)',
        icon: '🌟',
        shadow: '0 0 20px rgba(249, 115, 22, 0.3)'
      }
    };
    return styles[rank] || styles['Rookie'];
  };

  const rankStyle = user.rank ? getRankStyle(user.rank) : getRankStyle('Rookie');

  if (compact) {
    return (
      <div 
        className="user-card-compact"
        onClick={() => navigate(`/profile/${user.username}`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="compact-avatar-wrapper">
          <div className="compact-avatar">
            <img 
              src={user.profilePicture || 'https://i.pravatar.cc/40'} 
              alt={user.username}
            />
            {user.isVerified && (
              <span className="verified-badge-small">✓</span>
            )}
          </div>
          {user.rank && (
            <div 
              className="rank-glow"
              style={{ 
                background: rankStyle.gradient,
                boxShadow: rankStyle.shadow,
                opacity: isHovered ? 0.8 : 0.4
              }}
            />
          )}
          {user.isOnline && <span className="online-indicator"></span>}
        </div>
        
        <div className="compact-info">
          <div className="compact-name-wrapper">
            <h4>{user.name || user.username}</h4>
            {user.rank && (
              <span className="rank-icon" title={user.rank}>
                {rankStyle.icon}
              </span>
            )}
          </div>
          <p className="compact-username">@{user.username}</p>
          {user.bio && <p className="compact-bio">{user.bio.substring(0, 30)}...</p>}
        </div>

        {currentUser && currentUser._id !== user._id && (
          <button 
            className={`compact-follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleFollow}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-mini"></span>
            ) : isFollowing ? (
              '✓'
            ) : (
              '+'
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`user-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background Gradient */}
      <div 
        className="card-gradient-bg"
        style={{
          background: rankStyle.gradient,
          opacity: isHovered ? 0.15 : 0.05
        }}
      />

      {/* Rank Glow Effect */}
      {user.rank && (
        <div 
          className="rank-glow-effect"
          style={{
            background: rankStyle.gradient,
            boxShadow: rankStyle.shadow,
            opacity: isHovered ? 0.3 : 0.1
          }}
        />
      )}

      <Link to={`/profile/${user.username}`} className="user-card-link">
        {/* Header Section with Avatar */}
        <div className="user-card-header">
          <div className="avatar-container">
            <div className="avatar-wrapper">
              <img 
                src={user.profilePicture || 'https://i.pravatar.cc/80'} 
                alt={user.username}
                className="avatar-image"
              />
              {user.isVerified && (
                <span className="verified-badge">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
              {user.isOnline && <span className="online-indicator-large"></span>}
            </div>
            
            {/* Rank Badge */}
            {user.rank && (
              <div 
                className="rank-badge-modern"
                style={{ background: rankStyle.gradient }}
              >
                <span className="rank-icon">{rankStyle.icon}</span>
                <span className="rank-name">{user.rank}</span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="user-info">
            <div className="name-wrapper">
              <h3 className="user-name">{user.name || user.username}</h3>
              {user.rank && (
                <span className="rank-indicator" title={user.rank}>
                  {rankStyle.icon}
                </span>
              )}
            </div>
            <p className="user-username">@{user.username}</p>
          </div>
        </div>

        {/* Bio Section */}
        {user.bio && (
          <div className="bio-section">
            <p className="user-bio">{user.bio}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{followerCount}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{user.following?.length || 0}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{user.postsCount || 0}</span>
            <span className="stat-label">Posts</span>
          </div>
        </div>

        {/* Score Progress */}
        {user.score > 0 && (
          <div className="score-section">
            <div className="score-header">
              <span className="score-label">
                <span className="score-icon">⚡</span>
                Score
              </span>
              <span className="score-value">{user.score.toLocaleString()}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(100, (user.score / 1000000) * 100)}%`,
                  background: rankStyle.gradient
                }}
              >
                <div className="progress-shine"></div>
              </div>
            </div>
            <div className="next-rank">
              <span>Next: {getNextRank(user.rank)}</span>
              <span className="next-rank-value">
                {user.score.toLocaleString()}/1,000,000
              </span>
            </div>
          </div>
        )}
      </Link>

      {/* Follow Button */}
      {currentUser && currentUser._id !== user._id && (
        <div className="follow-button-container">
          <button 
            className={`follow-button ${isFollowing ? 'following' : ''}`}
            onClick={handleFollow}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : isFollowing ? (
              <>
                <span className="btn-icon">✓</span>
                <span className="btn-text">Following</span>
              </>
            ) : (
              <>
                <span className="btn-icon">+</span>
                <span className="btn-text">Follow</span>
              </>
            )}
          </button>
          
          {isFollowing && (
            <button 
              className="message-button"
              onClick={() => navigate(`/messages/new?user=${user._id}`)}
              title="Send message"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to get next rank
const getNextRank = (currentRank) => {
  const ranks = ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Legend', 'Mythic'];
  const currentIndex = ranks.indexOf(currentRank);
  if (currentIndex === -1 || currentIndex === ranks.length - 1) return 'Max';
  return ranks[currentIndex + 1];
};

export default UserCard;
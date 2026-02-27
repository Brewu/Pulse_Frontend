import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FollowersPage.css';

const FollowingPage = () => {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState({});
  const [profileUser, setProfileUser] = useState(null);

  // Fetch profile user and their following list
  useEffect(() => {
    const fetchProfileAndFollowing = async () => {
      try {
        setLoading(true);
        setError('');

        // First get the user by username
        const userResponse = await usersAPI.getByUsername(username);
        
        // Handle different API response structures
        const userData = userResponse.data?.data || userResponse.data;
        
        if (!userData) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setProfileUser(userData);

        // Then get who they are following
        const followingResponse = await usersAPI.getFollowing(userData._id);
        
        // Handle different API response structures
        const followingData = followingResponse.data?.data?.following || 
                             followingResponse.data?.following || 
                             followingResponse.data?.data || 
                             [];

        // Map following list with proper follow status
        const followingWithStatus = followingData.map(followed => {
          // Extract user data (might be nested)
          const followedUser = followed.user || followed;
          
          // Determine if current user is following this person
          let isFollowing = false;
          
          if (currentUser) {
            // Check via following array (ObjectId comparison)
            if (currentUser.following) {
              isFollowing = currentUser.following.some(id => 
                id.toString() === followedUser._id.toString()
              );
            }
            
            // Alternative: check via isFollowing flag from API
            if (followed.isFollowing !== undefined) {
              isFollowing = followed.isFollowing;
            }
          }

          return {
            ...followedUser,
            isFollowing // Explicit boolean flag for follow button
          };
        });

        setFollowing(followingWithStatus);
      } catch (error) {
        console.error('Failed to fetch following:', error);
        setError('Failed to load following list. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfileAndFollowing();
    }
  }, [username, currentUser]);

  // Handle follow/unfollow toggle
  const handleFollowToggle = async (userId, isCurrentlyFollowing) => {
    if (!currentUser || processing[userId]) return;

    // Store previous state for rollback
    const previousFollowing = [...following];
    const previousUserFollowing = currentUser.following || [];

    try {
      setProcessing(prev => ({ ...prev, [userId]: true }));

      // Optimistic update - immediately update UI
      setFollowing(prev => prev.map(user => 
        user._id === userId 
          ? { ...user, isFollowing: !isCurrentlyFollowing } 
          : user
      ));

      if (isCurrentlyFollowing) {
        // Unfollow user
        await usersAPI.unfollow(userId);
        
        // Update current user's following list in context
        if (updateUser) {
          updateUser({
            ...currentUser,
            following: previousUserFollowing.filter(id => id.toString() !== userId.toString())
          });
        }
      } else {
        // Follow user
        await usersAPI.follow(userId);
        
        // Update current user's following list in context
        if (updateUser) {
          updateUser({
            ...currentUser,
            following: [...previousUserFollowing, userId]
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      
      // Rollback on error
      setFollowing(previousFollowing);
      
      alert(`Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user. Please try again.`);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Check if current user is viewing their own following list
  const isOwnProfile = currentUser && profileUser && 
    currentUser._id.toString() === profileUser._id.toString();

  if (loading) {
    return (
      <div className="followers-container"> {/* Using same container class */}
        <div className="card">
          <div className="page-header">
            <Link to={`/profile/${username}`} className="back-button">
              ← Back to Profile
            </Link>
            <h2>Following</h2>
          </div>
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading following...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="followers-container">
        <div className="card">
          <div className="page-header">
            <Link to={`/profile/${username}`} className="back-button">
              ← Back to Profile
            </Link>
            <h2>Following</h2>
          </div>
          <div className="error-message">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="followers-container">
      <div className="card">
        <div className="page-header">
          <Link to={`/profile/${username}`} className="back-button">
            ← Back to Profile
          </Link>
          <h2>
            {profileUser && !isOwnProfile 
              ? `${profileUser.name || profileUser.username} is Following` 
              : 'Following'
            }
          </h2>
          <span className="follower-count">
            {following.length} {following.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        {following.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>Not following anyone yet</h3>
            {isOwnProfile ? (
              <>
                <p>When you follow someone, you'll see them here.</p>
                <Link to="/explore" className="explore-link">
                  Discover People
                </Link>
              </>
            ) : (
              <p>This user isn't following anyone yet.</p>
            )}
          </div>
        ) : (
          <div className="followers-list"> {/* Reusing same list class */}
            {following.map(user => (
              <div key={user._id} className="follower-item"> {/* Reusing same item class */}
                <Link to={`/profile/${user.username}`} className="follower-link">
                  <img
                    src={user.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=random&color=fff&size=40'}
                    alt={user.username}
                    className="follower-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=random&color=fff&size=40';
                    }}
                  />
                  <div className="follower-info">
                    <div className="follower-name-row">
                      <h4>{user.name || user.username}</h4>
                      {user.verified && (
                        <span className="verified-badge" title="Verified Account">✓</span>
                      )}
                    </div>
                    <p className="follower-username">@{user.username}</p>
                    {user.bio && (
                      <p className="follower-bio">{user.bio.substring(0, 60)}{user.bio.length > 60 ? '...' : ''}</p>
                    )}
                    
                    {/* Show mutual follow info */}
                    {currentUser && user.isFollowing && currentUser._id !== user._id && (
                      <span className="mutual-badge">Follows you</span>
                    )}
                  </div>
                </Link>
                
                {/* Follow/Unfollow button - Only show if NOT viewing own profile AND not self */}
                {currentUser && currentUser._id !== user._id && (
                  <button
                    onClick={() => handleFollowToggle(user._id, user.isFollowing)}
                    className={`follow-button ${user.isFollowing ? 'unfollow' : 'follow'}`}
                    disabled={processing[user._id]}
                  >
                    {processing[user._id] ? (
                      <span className="button-loading">
                        <span className="loading-dots">Processing</span>
                      </span>
                    ) : user.isFollowing ? (
                      'Unfollow'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
                
                {/* Show "You" badge for own profile */}
                {currentUser && currentUser._id === user._id && (
                  <span className="you-badge">You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowingPage;
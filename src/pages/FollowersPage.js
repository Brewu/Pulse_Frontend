import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FollowersPage.css';

const FollowersPage = () => {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState({});
  const [profileUser, setProfileUser] = useState(null);

  // Fetch profile user and their followers
  useEffect(() => {
    const fetchProfileAndFollowers = async () => {
      try {
        setLoading(true);
        setError('');

        // First get the user by username
        const userResponse = await usersAPI.getByUsername(username);
        const userData = userResponse.data?.data || userResponse.data;
        
        if (!userData) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setProfileUser(userData);

        // Then get their followers
        const followersResponse = await usersAPI.getFollowers(userData._id);
        
        // Handle different API response structures
        const followersData = followersResponse.data?.data?.followers || 
                             followersResponse.data?.followers || 
                             followersResponse.data?.data || 
                             [];

        // Map followers with follow status
        const followersWithStatus = followersData.map(follower => {
          // Extract follower data (might be nested)
          const followerData = follower.user || follower;
          
          // Check if current user is following this follower
          let isFollowing = false;
          
          if (currentUser) {
            // Check via following array (ObjectId comparison)
            if (currentUser.following) {
              isFollowing = currentUser.following.some(id => 
                id.toString() === followerData._id.toString()
              );
            }
            
            // Alternative: check via isFollowing flag from API
            if (follower.isFollowing !== undefined) {
              isFollowing = follower.isFollowing;
            }
          }

          return {
            ...followerData,
            isFollowing // Explicit boolean flag for follow button
          };
        });

        setFollowers(followersWithStatus);
      } catch (error) {
        console.error('Failed to fetch followers:', error);
        setError('Failed to load followers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfileAndFollowers();
    }
  }, [username, currentUser]);

  // Handle follow/unfollow toggle
  const handleFollowToggle = async (userId, isCurrentlyFollowing) => {
    if (!currentUser || processing[userId]) return;

    // Store previous state for rollback
    const previousFollowers = [...followers];
    const previousFollowing = currentUser.following || [];

    try {
      setProcessing(prev => ({ ...prev, [userId]: true }));

      // Optimistic update - immediately update UI
      setFollowers(prev => prev.map(follower => 
        follower._id === userId 
          ? { ...follower, isFollowing: !isCurrentlyFollowing } 
          : follower
      ));

      if (isCurrentlyFollowing) {
        // Unfollow user
        await usersAPI.unfollow(userId);
        
        // Update current user's following list in context
        if (updateUser) {
          updateUser({
            ...currentUser,
            following: previousFollowing.filter(id => id.toString() !== userId.toString())
          });
        }
      } else {
        // Follow user
        await usersAPI.follow(userId);
        
        // Update current user's following list in context
        if (updateUser) {
          updateUser({
            ...currentUser,
            following: [...previousFollowing, userId]
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      
      // Rollback on error
      setFollowers(previousFollowers);
      
      alert(`Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user. Please try again.`);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Check if current user is viewing their own followers
  const isOwnProfile = currentUser && profileUser && 
    currentUser._id.toString() === profileUser._id.toString();

  if (loading) {
    return (
      <div className="followers-container">
        <div className="card">
          <div className="page-header">
            <Link to={`/profile/${username}`} className="back-button">
              ← Back to Profile
            </Link>
            <h2>Followers</h2>
          </div>
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading followers...</p>
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
            <h2>Followers</h2>
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
              ? `${profileUser.name || profileUser.username}'s Followers` 
              : 'Followers'
            }
          </h2>
          <span className="follower-count">
            {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
          </span>
        </div>

        {followers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No followers yet</h3>
            {isOwnProfile ? (
              <p>When someone follows you, you'll see them here.</p>
            ) : (
              <p>This user doesn't have any followers yet.</p>
            )}
          </div>
        ) : (
          <div className="followers-list">
            {followers.map(follower => (
              <div key={follower._id} className="follower-item">
                <Link to={`/profile/${follower.username}`} className="follower-link">
                  <img
                    src={follower.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(follower.username) + '&background=random&color=fff&size=40'}
                    alt={follower.username}
                    className="follower-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(follower.username) + '&background=random&color=fff&size=40';
                    }}
                  />
                  <div className="follower-info">
                    <div className="follower-name-row">
                      <h4>{follower.name || follower.username}</h4>
                      {follower.verified && (
                        <span className="verified-badge">✓</span>
                      )}
                    </div>
                    <p className="follower-username">@{follower.username}</p>
                    {follower.bio && (
                      <p className="follower-bio">{follower.bio.substring(0, 60)}</p>
                    )}
                  </div>
                </Link>
                
                {/* Follow/Unfollow button - Only show if NOT viewing own profile AND not self */}
                {currentUser && currentUser._id !== follower._id && (
                  <button
                    onClick={() => handleFollowToggle(follower._id, follower.isFollowing)}
                    className={`follow-button ${follower.isFollowing ? 'unfollow' : 'follow'}`}
                    disabled={processing[follower._id]}
                  >
                    {processing[follower._id] ? (
                      <span className="button-loading">Processing...</span>
                    ) : follower.isFollowing ? (
                      'Unfollow'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
                
                {/* Show "You" badge for own profile */}
                {currentUser && currentUser._id === follower._id && (
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

export default FollowersPage;
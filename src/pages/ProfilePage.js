import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI, usersAPI, postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Post from '../components/posts/Post';
import moment from 'moment';
import './ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsError, setPostsError] = useState(null);

  // Animation states
  const [animateHeader, setAnimateHeader] = useState(false);
  const [showRankBadge, setShowRankBadge] = useState(false);

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Text fields
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  // Image uploads
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Refs for infinite scroll
  const postsEndRef = useRef(null);
  const observerRef = useRef(null);

  const isOwnProfile = !username || username === currentUser?.username;
  // ==================== PUSH NOTIFICATION HELPER ====================
  const sendPushNotification = async (userId, notificationData) => {
    try {
      // Don't send if no userId
      if (!userId) return;

      const response = await fetch(`https://pulse-backend-tpg8.onrender.com/api/push/send/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        console.log('Push notification not sent (user may have disabled)');
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };
  // ==================== RANK CONFIGURATION ====================
  const rankConfig = {
    Rookie: {
      color: '#9ca3af',
      gradient: 'linear-gradient(135deg, #9ca3af, #d1d5db)',
      icon: '🌱',
      badgeClass: 'rank-rookie',
      borderGlow: '0 0 20px rgba(156, 163, 175, 0.5)',
      progressColor: '#9ca3af'
    },
    Bronze: {
      color: '#b45309',
      gradient: 'linear-gradient(135deg, #b45309, #d97706)',
      icon: '🥉',
      badgeClass: 'rank-bronze',
      borderGlow: '0 0 20px rgba(180, 83, 9, 0.5)',
      progressColor: '#b45309'
    },
    Silver: {
      color: '#9ca3af',
      gradient: 'linear-gradient(135deg, #9ca3af, #e5e7eb)',
      icon: '🥈',
      badgeClass: 'rank-silver',
      borderGlow: '0 0 20px rgba(156, 163, 175, 0.5)',
      progressColor: '#9ca3af'
    },
    Gold: {
      color: '#fbbf24',
      gradient: 'linear-gradient(135deg, #fbbf24, #fcd34d)',
      icon: '🥇',
      badgeClass: 'rank-gold',
      borderGlow: '0 0 20px rgba(251, 191, 36, 0.5)',
      progressColor: '#fbbf24'
    },
    Platinum: {
      color: '#6ee7b7',
      gradient: 'linear-gradient(135deg, #6ee7b7, #a7f3d0)',
      icon: '💎',
      badgeClass: 'rank-platinum',
      borderGlow: '0 0 20px rgba(110, 231, 183, 0.5)',
      progressColor: '#6ee7b7'
    },
    Diamond: {
      color: '#34d399',
      gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)',
      icon: '🔷',
      badgeClass: 'rank-diamond',
      borderGlow: '0 0 20px rgba(52, 211, 153, 0.5)',
      progressColor: '#34d399'
    },
    Master: {
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      icon: '👑',
      badgeClass: 'rank-master',
      borderGlow: '0 0 20px rgba(139, 92, 246, 0.5)',
      progressColor: '#8b5cf6'
    },
    Grandmaster: {
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
      icon: '⚡',
      badgeClass: 'rank-grandmaster',
      borderGlow: '0 0 20px rgba(236, 72, 153, 0.5)',
      progressColor: '#ec4899'
    },
    Legend: {
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      icon: '🔥',
      badgeClass: 'rank-legend',
      borderGlow: '0 0 20px rgba(245, 158, 11, 0.5)',
      progressColor: '#f59e0b'
    },
    Mythic: {
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #f97316, #fb923c)',
      icon: '🌟',
      badgeClass: 'rank-mythic',
      borderGlow: '0 0 20px rgba(249, 115, 22, 0.5)',
      progressColor: '#f97316'
    },
    // Fallback for any undefined rank
    default: {
      color: '#9ca3af',
      gradient: 'linear-gradient(135deg, #9ca3af, #d1d5db)',
      icon: '🌱',
      badgeClass: 'rank-default',
      borderGlow: '0 0 20px rgba(156, 163, 175, 0.5)',
      progressColor: '#9ca3af'
    }
  };

  // ==================== RANK THRESHOLDS ====================
  const rankThresholds = {
    Rookie: { min: 0, max: 999, next: 'Bronze', nextThreshold: 1000 },
    Bronze: { min: 1000, max: 4999, next: 'Silver', nextThreshold: 5000 },
    Silver: { min: 5000, max: 9999, next: 'Gold', nextThreshold: 10000 },
    Gold: { min: 10000, max: 24999, next: 'Platinum', nextThreshold: 25000 },
    Platinum: { min: 25000, max: 49999, next: 'Diamond', nextThreshold: 50000 },
    Diamond: { min: 50000, max: 99999, next: 'Master', nextThreshold: 100000 },
    Master: { min: 100000, max: 249999, next: 'Grandmaster', nextThreshold: 250000 },
    Grandmaster: { min: 250000, max: 499999, next: 'Legend', nextThreshold: 500000 },
    Legend: { min: 500000, max: 999999, next: 'Mythic', nextThreshold: 1000000 },
    Mythic: { min: 1000000, max: 1000000, next: null, nextThreshold: 1000000 }
  };

  // ==================== THEME TOGGLE ====================
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

  // Trigger animations after load
  useEffect(() => {
    if (!loading && profileUser) {
      setTimeout(() => {
        setAnimateHeader(true);
        setShowRankBadge(true);
      }, 100);
    }
  }, [loading, profileUser]);

  // ==================== FETCH PROFILE ====================
  useEffect(() => {
    fetchProfile();
  }, [username, currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      let userData;

      if (isOwnProfile && currentUser) {
        userData = currentUser;
      } else {
        const response = await usersAPI.getByUsername(username);
        userData = response.data;
      }

      if (!userData) {
        setProfileUser(null);
        return;
      }

      const followedBy = !!(
        userData.following &&
        Array.isArray(userData.following) &&
        currentUser &&
        userData.following.includes(currentUser._id)
      );

      const processedUser = {
        ...userData,
        followerCount: userData.followerCount || (userData.followers ? userData.followers.length : 0),
        followingCount: userData.followingCount || (userData.following ? userData.following.length : 0),
        postsCount: userData.postsCount || 0,
        nextRankProgress: calculateNextRankProgress(userData.score || 0, userData.rank || 'Rookie')
      };

      setProfileUser(processedUser);
      setIsFollowedBy(followedBy);

      if (currentUser && !isOwnProfile) {
        const followingIds = currentUser.following || [];
        setIsFollowing(followingIds.includes(userData._id));
      }

      // Reset posts when profile changes
      setPosts([]);
      setPostsPage(1);
      setHasMorePosts(true);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setProfileUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FETCH USER POSTS ====================
  const fetchUserPosts = useCallback(async (pageNum = 1, reset = false) => {
    if (!profileUser?._id) return;

    try {
      setPostsLoading(true);
      setPostsError(null);

      const response = await postsAPI.getUserPosts(profileUser._id, pageNum, 10);

      let postsData = [];
      let hasNext = false;

      if (response.data?.data && Array.isArray(response.data.data)) {
        postsData = response.data.data;
        hasNext = response.data.pagination?.hasMore || false;
      } else if (Array.isArray(response.data)) {
        postsData = response.data;
        hasNext = false;
      } else if (response.data?.posts && Array.isArray(response.data.posts)) {
        postsData = response.data.posts;
        hasNext = response.data.hasMore || false;
      }

      // Normalize posts
      const normalizedPosts = postsData
        .map(post => normalizePost(post))
        .filter(Boolean);

      if (reset || pageNum === 1) {
        setPosts(normalizedPosts);
      } else {
        setPosts(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => p._id));
          const newPosts = normalizedPosts.filter(p => !existingIds.has(p._id));
          return [...prev, ...newPosts];
        });
      }

      setHasMorePosts(hasNext);
      setPostsPage(pageNum);

    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      setPostsError(error.response?.data?.message || 'Failed to load posts');
    } finally {
      setPostsLoading(false);
    }
  }, [profileUser]);

  // Normalize post data helper
  const normalizePost = useCallback((post) => {
    if (!post) return null;

    // Normalize author
    const author = post.author ? {
      _id: post.author._id || post.author.id,
      username: post.author.username || 'Unknown User',
      profilePicture: post.author.profilePicture || post.author.avatar || 'https://i.pravatar.cc/40',
      verified: post.author.verified || false
    } : {
      _id: profileUser?._id || 'unknown',
      username: profileUser?.username || 'Unknown User',
      profilePicture: profileUser?.profilePicture || 'https://i.pravatar.cc/40',
      verified: profileUser?.verified || false
    };

    // Normalize likes
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

    const isLikedByCurrentUser = currentUser && likes.includes(currentUser._id);

    // Normalize media
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

    // Normalize tags
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
  }, [currentUser, profileUser]);

  // Fetch posts when profile is loaded or tab changes
  useEffect(() => {
    if (profileUser && activeTab === 'posts') {
      fetchUserPosts(1, true);
    }
  }, [profileUser, activeTab, fetchUserPosts]);

  // ==================== INFINITE SCROLL ====================
  useEffect(() => {
    if (!hasMorePosts || postsLoading || !postsEndRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !postsLoading) {
          fetchUserPosts(postsPage + 1);
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    observer.observe(postsEndRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMorePosts, postsLoading, postsPage, fetchUserPosts]);

  // ==================== CALCULATE RANK PROGRESS ====================
  const calculateNextRankProgress = (score, currentRank) => {
    const current = rankThresholds[currentRank];
    if (!current) return 0;

    if (currentRank === 'Mythic') {
      return 100;
    }

    return ((score - current.min) / (current.nextThreshold - current.min)) * 100;
  };

  // ==================== GET NEXT RANK NAME ====================
  const getNextRankName = (currentRank) => {
    const rankOrder = ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Legend', 'Mythic'];
    const currentIndex = rankOrder.indexOf(currentRank);
    if (currentIndex === -1 || currentIndex === rankOrder.length - 1) return null;
    return rankOrder[currentIndex + 1];
  };

  // ==================== FOLLOW TOGGLE ====================
  // ==================== FOLLOW TOGGLE WITH PUSH NOTIFICATION ====================
  // ==================== FOLLOW TOGGLE WITH PUSH NOTIFICATION ====================
  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || followLoading) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        // UNFOLLOW
        await usersAPI.unfollow(profileUser._id);
        setIsFollowing(false);

        setProfileUser((prev) => ({
          ...prev,
          followerCount: Math.max(0, (prev.followerCount || 0) - 1),
        }));

        if (updateProfile) {
          updateProfile({
            ...currentUser,
            following: (currentUser.following || []).filter((id) => id !== profileUser._id),
          });
        }
        // No push notification for unfollow

      } else {
        // FOLLOW
        await usersAPI.follow(profileUser._id);
        setIsFollowing(true);

        setProfileUser((prev) => ({
          ...prev,
          followerCount: (prev.followerCount || 0) + 1,
        }));

        if (updateProfile) {
          updateProfile({
            ...currentUser,
            following: [...(currentUser.following || []), profileUser._id],
          });
        }

        // 🔔 Send push notification to the profile user (the one being followed)
        const followNotification = {
          title: '👥 New Follower',
          body: `${currentUser.username} started following you`,
          type: 'follow',
          icon: '/icons/follow-icon.png',
          badge: '/badge-follow.png',
          data: {
            url: `/profile/${currentUser.username}`,
            senderId: currentUser._id,
            senderUsername: currentUser.username,
            senderProfilePicture: currentUser.profilePicture,
            timestamp: new Date().toISOString()
          }
        };

        sendPushNotification(profileUser._id, followNotification).catch(console.error);

        // 🔔 Check for mutual follow and notify current user
        if (isFollowedBy) {
          const mutualFollowNotification = {
            title: '🔄 You Follow Each Other',
            body: `${profileUser.username} now follows you back`,
            type: 'follow_back',
            icon: '/icons/follow-icon.png',
            badge: '/badge-follow.png',
            data: {
              url: `/profile/${profileUser.username}`,
              senderId: profileUser._id,
              senderUsername: profileUser.username,
              senderProfilePicture: profileUser.profilePicture,
              timestamp: new Date().toISOString()
            }
          };

          sendPushNotification(currentUser._id, mutualFollowNotification).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      alert(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
    } finally {
      setFollowLoading(false);
    }
  };

  // ==================== POST ACTIONS ====================
  const handleLike = async (postId) => {
    try {
      const postIndex = posts.findIndex(p => p && p._id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      const isCurrentlyLiked = post.likes?.includes(currentUser?._id) || post.isLikedByCurrentUser;

      // Optimistic update
      setPosts(prev => prev.map((p, idx) => {
        if (idx !== postIndex) return p;

        if (isCurrentlyLiked) {
          return {
            ...p,
            likes: p.likes.filter(id => id !== currentUser?._id),
            likesCount: Math.max((p.likesCount || 0) - 1, 0),
            isLikedByCurrentUser: false
          };
        } else {
          return {
            ...p,
            likes: [...(p.likes || []), currentUser?._id],
            likesCount: (p.likesCount || 0) + 1,
            isLikedByCurrentUser: true
          };
        }
      }));

      // API call
      if (isCurrentlyLiked) {
        await postsAPI.unlike(postId);
      } else {
        await postsAPI.like(postId);
      }
    } catch (error) {
      console.error('Failed to update like:', error);
      // Revert on error - refetch posts
      fetchUserPosts(1, true);
    }
  };

  const handleDeletePost = (postId) => {
    setPosts(prev => prev.filter(post => post && post._id !== postId));
    // Update post count
    setProfileUser(prev => ({
      ...prev,
      postsCount: Math.max(0, (prev.postsCount || 0) - 1)
    }));
  };

  // ==================== MODAL CONTROLS ====================
  const openEditModal = () => {
    setEditName(profileUser?.name || '');
    setEditBio(profileUser?.bio || '');
    setProfilePicPreview(profileUser?.profilePicture || '');
    setCoverPreview(profileUser?.coverPicture || '');
    setProfilePicFile(null);
    setCoverFile(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (profilePicPreview && profilePicPreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePicPreview);
    }
    if (coverPreview && coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreview);
    }
    setIsEditModalOpen(false);
  };

  // ==================== PROFILE PICTURE UPLOAD ====================
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleProfilePicUpload = async () => {
    if (!profilePicFile) return;

    const formData = new FormData();
    formData.append('profilePicture', profilePicFile);

    setUploadingProfile(true);
    try {
      const response = await authAPI.uploadProfilePicture(formData);
      const updatedUser = response.data?.user || response.data;

      if (updatedUser) {
        if (typeof updateProfile === 'function') {
          updateProfile(updatedUser);
        }

        setProfileUser((prev) => ({
          ...prev,
          profilePicture: updatedUser.profilePicture,
        }));
        setProfilePicPreview(updatedUser.profilePicture);
        setProfilePicFile(null);
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      alert(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingProfile(false);
    }
  };

  // ==================== COVER PICTURE UPLOAD ====================
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverUpload = async () => {
    if (!coverFile) return;

    const formData = new FormData();
    formData.append('coverPicture', coverFile);

    setUploadingCover(true);
    try {
      const response = await authAPI.uploadCoverPicture(formData);
      const updatedUser = response.data?.user || response.data;

      if (updatedUser) {
        if (typeof updateProfile === 'function') {
          updateProfile(updatedUser);
        }

        setProfileUser((prev) => ({
          ...prev,
          coverPicture: updatedUser.coverPicture,
        }));
        setCoverPreview(updatedUser.coverPicture);
        setCoverFile(null);
      }
    } catch (error) {
      console.error('Failed to upload cover picture:', error);
      alert(error.response?.data?.message || 'Failed to upload cover picture');
    } finally {
      setUploadingCover(false);
    }
  };

  // ==================== PROFILE TEXT UPDATE ====================
  const handleProfileTextUpdate = async () => {
    const hasChanges = editName !== (profileUser?.name || '') || editBio !== (profileUser?.bio || '');

    if (!hasChanges) {
      return true;
    }

    try {
      const response = await authAPI.updateProfile({
        name: editName,
        bio: editBio,
      });

      if (response.data.user) {
        updateProfile(response.data.user);
        setProfileUser((prev) => ({
          ...prev,
          name: response.data.user.name,
          bio: response.data.user.bio,
        }));
      }
      return true;
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert(error.response?.data?.message || 'Failed to update profile');
      return false;
    }
  };

  // ==================== PASSWORD CHANGE ====================
  const handlePasswordChange = async () => {
    if (!newPassword) return true;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return false;
    }

    if (!currentPassword) {
      alert('Current password is required');
      return false;
    }

    try {
      setChangingPassword(true);
      await authAPI.changePassword({
        currentPassword,
        newPassword,
      });
      alert('Password changed successfully!');
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      alert(error.response?.data?.message || 'Failed to change password');
      return false;
    } finally {
      setChangingPassword(false);
    }
  };

  // ==================== MAIN FORM SUBMIT ====================
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const textUpdated = await handleProfileTextUpdate();
    if (!textUpdated) return;

    if (profilePicFile) {
      await handleProfilePicUpload();
    }

    if (coverFile) {
      await handleCoverUpload();
    }

    if (newPassword) {
      await handlePasswordChange();
    }

    closeEditModal();
  };

  // ==================== RENDER POSTS ====================
  const renderPosts = () => {
    if (posts.length === 0 && !postsLoading) {
      return (
        <div className="no-posts">
          <div className="no-posts-icon">
            <i className="fas fa-pen-fancy"></i>
          </div>
          <h3>No posts yet</h3>
          <p>
            {isOwnProfile
              ? "You haven't created any posts yet."
              : `${profileUser?.username} hasn't created any posts yet.`}
          </p>
          {isOwnProfile && (
            <button
              className="create-post-btn"
              onClick={() => window.location.href = '/'}
            >
              <i className="fas fa-plus"></i>
              Create your first post
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="posts-grid">
        {posts.map((post, index) => (
          <div
            key={post._id}
            className="post-wrapper"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <Post
              post={post}
              onLike={handleLike}
              onUnlike={handleLike}
              onDelete={handleDeletePost}
              isDark={isDark}
            />
          </div>
        ))}

        {/* Loading indicator and sentinel for infinite scroll */}
        {postsLoading && (
          <div className="posts-loading">
            <div className="loading-spinner small"></div>
            <span>Loading posts...</span>
          </div>
        )}

        {hasMorePosts && !postsLoading && (
          <div ref={postsEndRef} className="posts-sentinel"></div>
        )}

        {!hasMorePosts && posts.length > 0 && (
          <div className="posts-end">
            <span className="end-icon">✨</span>
            <p>No more posts to show</p>
          </div>
        )}
      </div>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className={`profile-page ${isDark ? 'dark' : ''}`}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // ==================== NOT FOUND STATE ====================
  if (!profileUser) {
    return (
      <div className={`profile-page ${isDark ? 'dark' : ''}`}>
        <div className="not-found-container">
          <div className="not-found-icon">
            <i className="fas fa-user-slash"></i>
          </div>
          <h2>User not found</h2>
          <p>The profile you're looking for doesn't exist.</p>
          <Link to="/" className="home-btn">
            <i className="fas fa-home"></i>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // ==================== GET RANK STYLE ====================
  const rank = profileUser.rank || 'Rookie';
  const rankStyle = rankConfig[rank] || rankConfig.default;
  const nextRank = getNextRankName(rank);

  // ==================== MAIN RENDER ====================
  return (
    <div className={`profile-page ${isDark ? 'dark' : ''}`}>
      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
        <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
      </button>

      <div className="profile-container">
        {/* ===== Profile Header ===== */}
        <div
          className={`profile-header ${animateHeader ? 'animate' : ''}`}
          style={{
            '--rank-color': rankStyle.color,
            '--rank-gradient': rankStyle.gradient,
            '--rank-glow': rankStyle.borderGlow
          }}
        >
          {/* Cover Image */}
          <div className="profile-cover">
            {profileUser.coverPicture ? (
              <img src={profileUser.coverPicture} alt="Cover" className="cover-image" />
            ) : (
              <div className="default-cover" style={{ background: rankStyle.gradient }}>
                <div className="cover-pattern"></div>
              </div>
            )}
            <div className="rank-cover-overlay" style={{ background: rankStyle.gradient }}></div>
          </div>

          {/* Profile Info */}
          <div className="profile-info">
            <div className="profile-avatar-wrapper">
              {/* Avatar with Rank Glow */}
              <div className={`profile-avatar-container rank-${rank.toLowerCase()}`}>
                <img
                  src={profileUser.profilePicture || 'https://i.pravatar.cc/150'}
                  alt={profileUser.username}
                  className="profile-avatar"
                />
                {isOwnProfile && (
                  <button className="edit-avatar-btn" onClick={openEditModal}>
                    <i className="fas fa-camera"></i>
                  </button>
                )}

                {/* Rank Badge */}
                {showRankBadge && (
                  <div className={`rank-badge ${rankStyle.badgeClass}`} style={{ background: rankStyle.gradient }}>
                    <span className="rank-icon">{rankStyle.icon}</span>
                    <span className="rank-name">{rank}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="profile-actions">
                {!isOwnProfile && currentUser && (
                  <button
                    onClick={handleFollowToggle}
                    className={`follow-btn ${isFollowing ? 'following' : ''}`}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : isFollowing ? (
                      <>
                        <i className="fas fa-user-check"></i>
                        Following
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i>
                        Follow
                      </>
                    )}
                  </button>
                )}

                {isOwnProfile && (
                  <button onClick={openEditModal} className="edit-profile-btn">
                    <i className="fas fa-edit"></i>
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="profile-details">
              <div className="profile-name-wrapper">
                <h1 className="profile-name">{profileUser.name || profileUser.username}</h1>
                {profileUser.isVerified && (
                  <span className="verified-badge" title="Verified Account">
                    <i className="fas fa-check-circle"></i>
                  </span>
                )}
              </div>

              {profileUser.username && (
                <p className="profile-username">
                  <i className="fas fa-at"></i>
                  {profileUser.username}
                </p>
              )}

              {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}

              {/* Rank Progress Bar - ONLY SHOW TO OWNER */}
              {isOwnProfile && (
                <div className="rank-progress-container">
                  <div className="rank-progress-header">
                    <span className="rank-label">
                      <span className="rank-icon-small">{rankStyle.icon}</span>
                      {rank}
                    </span>
                    <span className="rank-score">{profileUser.score || 0} points</span>
                  </div>
                  <div className="rank-progress-bar">
                    <div
                      className="rank-progress-fill"
                      style={{
                        width: `${profileUser.nextRankProgress || 0}%`,
                        background: rankStyle.gradient,
                        boxShadow: rankStyle.borderGlow
                      }}
                    ></div>
                  </div>
                  {nextRank && (
                    <div className="next-rank">
                      <span className="next-rank-label">Next: {nextRank}</span>
                      <span className="next-rank-points">
                        {rankThresholds[nextRank]?.min - profileUser.score} points needed
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="profile-stats">


                <Link to={`/profile/${profileUser.username}/followers`} className="stat-link">
                  <div className="stat-item">
                    <span className="stat-value">{profileUser.followerCount || 0}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                </Link>

                <Link to={`/profile/${profileUser.username}/following`} className="stat-link">
                  <div className="stat-item">
                    <span className="stat-value">{profileUser.followingCount || 0}</span>
                    <span className="stat-label">Following</span>
                  </div>
                </Link>
              </div>

              {isFollowedBy && !isOwnProfile && (
                <div className="follows-you-badge">
                  <i className="fas fa-user-friends"></i>
                  Follows you
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Profile Tabs ===== */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <i className="fas fa-pen-fancy"></i>
            Posts
          </button>
          <button
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <i className="fas fa-user"></i>
            About
          </button>
          <button
            className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <i className="fas fa-image"></i>
            Media
          </button>
        </div>

        {/* ===== Profile Content ===== */}
        <div className="profile-content">
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="content-card posts-card">
              <div className="card-header">
                <i className="fas fa-pen-fancy"></i>
                <h3>Posts</h3>
              </div>
              <div className="card-body">
                {postsError ? (
                  <div className="error-state">
                    <p>{postsError}</p>
                    <button onClick={() => fetchUserPosts(1, true)}>
                      <i className="fas fa-redo"></i>
                      Try Again
                    </button>
                  </div>
                ) : (
                  renderPosts()
                )}
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="content-card about-card">
              <div className="card-header">
                <i className="fas fa-user"></i>
                <h3>About</h3>
              </div>

              <div className="card-body">
                {profileUser.bio ? (
                  <p className="bio-text">{profileUser.bio}</p>
                ) : (
                  <p className="text-muted">No bio yet.</p>
                )}

                <div className="details-section">
                  <h4>
                    <i className="fas fa-info-circle"></i>
                    Details
                  </h4>

                  <div className="details-grid">
                    <div className="detail-item">
                      <i className="fas fa-calendar-alt"></i>
                      <div className="detail-content">
                        <span className="detail-label">Joined</span>
                        <span className="detail-value">
                          {moment(profileUser.createdAt).format('MMMM YYYY')}
                        </span>
                      </div>
                    </div>

                    {profileUser.location && (
                      <div className="detail-item">
                        <i className="fas fa-map-marker-alt"></i>
                        <div className="detail-content">
                          <span className="detail-label">Location</span>
                          <span className="detail-value">{profileUser.location}</span>
                        </div>
                      </div>
                    )}

                    {profileUser.website && (
                      <div className="detail-item">
                        <i className="fas fa-link"></i>
                        <div className="detail-content">
                          <span className="detail-label">Website</span>
                          <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="detail-value">
                            {profileUser.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Overview - Always visible */}
                <div className="stats-overview">
                  <h4>
                    <i className="fas fa-chart-bar"></i>
                    Overview
                  </h4>

                  <div className="stats-grid">
                    <div className="stats-card" style={{ borderColor: rankStyle.color }}>
                      <i className="fas fa-pen-fancy" style={{ color: rankStyle.color }}></i>
                      <div className="stats-info">
                        <span className="stats-number">{profileUser.postsCount || 0}</span>
                        <span className="stats-label">Posts</span>
                      </div>
                    </div>

                    <div className="stats-card" style={{ borderColor: rankStyle.color }}>
                      <i className="fas fa-heart" style={{ color: rankStyle.color }}></i>
                      <div className="stats-info">
                        <span className="stats-number">{profileUser.likesReceived || 0}</span>
                        <span className="stats-label">Likes Received</span>
                      </div>
                    </div>

                    <div className="stats-card" style={{ borderColor: rankStyle.color }}>
                      <i className="fas fa-comment" style={{ color: rankStyle.color }}></i>
                      <div className="stats-info">
                        <span className="stats-number">{profileUser.commentsCount || 0}</span>
                        <span className="stats-label">Comments</span>
                      </div>
                    </div>

                    <div className="stats-card" style={{ borderColor: rankStyle.color }}>
                      <i className="fas fa-trophy" style={{ color: rankStyle.color }}></i>
                      <div className="stats-info">
                        <span className="stats-number">{profileUser.score || 0}</span>
                        <span className="stats-label">Score</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="content-card media-card">
              <div className="card-header">
                <i className="fas fa-image"></i>
                <h3>Media</h3>
              </div>
              <div className="card-body">
                {posts.filter(p => p.media && p.media.length > 0).length === 0 ? (
                  <div className="no-media">
                    <i className="fas fa-images"></i>
                    <p>No media posts yet</p>
                  </div>
                ) : (
                  <div className="media-grid">
                    {posts
                      .filter(p => p.media && p.media.length > 0)
                      .flatMap(post =>
                        post.media.map((media, idx) => (
                          <div key={`${post._id}-${idx}`} className="media-item">
                            {media.mediaType === 'video' ? (
                              <video src={media.url} className="media-thumbnail" />
                            ) : (
                              <img src={media.url} alt={media.altText || ''} className="media-thumbnail" />
                            )}
                          </div>
                        ))
                      )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Edit Profile Modal ===== */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-user-edit"></i>
                Edit Profile
              </h2>
              <button className="close-modal" onClick={closeEditModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="edit-form">
              {/* Basic Information */}
              <div className="form-section">
                <h3>
                  <i className="fas fa-info-circle"></i>
                  Basic Information
                </h3>

                <div className="form-group">
                  <label htmlFor="name">Display Name</label>
                  <input
                    type="text"
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={50}
                    placeholder="Your display name"
                  />
                  <span className="char-count">{editName.length}/50</span>
                </div>

                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                  <span className="char-count">{editBio.length}/500</span>
                </div>
              </div>

              {/* Profile Picture */}
              <div className="form-section">
                <h3>
                  <i className="fas fa-camera"></i>
                  Profile Picture
                </h3>

                <div className="image-upload-container">
                  <div className="current-image">
                    <img
                      src={profilePicPreview || 'https://i.pravatar.cc/150'}
                      alt="Profile preview"
                      className="preview-avatar"
                    />
                  </div>

                  <div className="upload-controls">
                    <input
                      type="file"
                      id="profile-pic-upload"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                      disabled={uploadingProfile}
                      className="file-input"
                    />
                    <label htmlFor="profile-pic-upload" className="file-label">
                      <i className="fas fa-upload"></i>
                      Choose Image
                    </label>

                    {profilePicFile && (
                      <button
                        type="button"
                        onClick={handleProfilePicUpload}
                        disabled={uploadingProfile}
                        className="upload-btn"
                      >
                        {uploadingProfile ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt"></i>
                            Upload Picture
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Picture */}
              <div className="form-section">
                <h3>
                  <i className="fas fa-image"></i>
                  Cover Picture
                </h3>

                <div className="image-upload-container cover-upload">
                  <div className="current-image cover-preview">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" />
                    ) : (
                      <div className="default-cover-preview">
                        <i className="fas fa-mountain"></i>
                        <span>No cover image</span>
                      </div>
                    )}
                  </div>

                  <div className="upload-controls">
                    <input
                      type="file"
                      id="cover-upload"
                      accept="image/*"
                      onChange={handleCoverChange}
                      disabled={uploadingCover}
                      className="file-input"
                    />
                    <label htmlFor="cover-upload" className="file-label">
                      <i className="fas fa-upload"></i>
                      Choose Image
                    </label>

                    {coverFile && (
                      <button
                        type="button"
                        onClick={handleCoverUpload}
                        disabled={uploadingCover}
                        className="upload-btn"
                      >
                        {uploadingCover ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt"></i>
                            Upload Cover
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="form-section">
                <h3>
                  <i className="fas fa-lock"></i>
                  Change Password
                </h3>

                <div className="form-group">
                  <label htmlFor="current-password">Current Password</label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeEditModal} className="cancel-btn">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={uploadingProfile || uploadingCover || changingPassword}
                >
                  {uploadingProfile || uploadingCover || changingPassword ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
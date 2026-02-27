import React, { useState, useEffect, useCallback, useRef } from 'react';
import { postsAPI, postsRealTime, getSocket } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PostCreate from '../components/posts/PostCreate';
import Post from '../components/posts/Post';
import './HomePage.css';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // New posts detection
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(Date.now());
  const [isPulseAnimating, setIsPulseAnimating] = useState(false);

  // UI states
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Feed type state - instant switching
  const [feedType, setFeedType] = useState('mixed');
  const [isFeedChanging, setIsFeedChanging] = useState(false);

  // Media modal state
  const [openMediaModal, setOpenMediaModal] = useState(null);
  const [activeVideoRef, setActiveVideoRef] = useState(null);

  // Refs for tracking
  const touchStartY = useRef(0);
  const feedRef = useRef(null);
  const headerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const loadingRef = useRef(false);
  const initialLoadRef = useRef(true);
  const processedPostIds = useRef(new Set());
  const newPostBatchTimer = useRef(null);
  const pendingNewPosts = useRef(0);
  const modalContentRef = useRef(null);
  const videoRefs = useRef(new Map());

  const { user } = useAuth();

  // Theme toggle
  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // ========== MEDIA MODAL HANDLING ==========
  const openMediaModalHandler = (mediaItem, postId) => {
    // Pause any currently playing video
    if (activeVideoRef) {
      activeVideoRef.pause();
    }
    setOpenMediaModal({ media: mediaItem, postId });
  };

  const closeMediaModal = useCallback(() => {
    if (openMediaModal) {
      // Pause video if it's playing
      if (activeVideoRef) {
        activeVideoRef.pause();
        setActiveVideoRef(null);
      }
      setOpenMediaModal(null);
    }
  }, [openMediaModal, activeVideoRef]);

  // Handle scroll to close modal
  useEffect(() => {
    const handleScroll = () => {
      if (openMediaModal) {
        closeMediaModal();
      }
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (feedElement) {
        feedElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [openMediaModal, closeMediaModal]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && openMediaModal) {
        closeMediaModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [openMediaModal, closeMediaModal]);

  // Handle click outside modal content
  const handleModalOverlayClick = (e) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
      closeMediaModal();
    }
  };

  // Video reference handler
  const setVideoRef = (element, mediaId) => {
    if (element) {
      videoRefs.current.set(mediaId, element);
    } else {
      videoRefs.current.delete(mediaId);
    }
  };

  // Pause all videos function
  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach(video => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  }, []);

  // ========== INSTANT FEED TYPE CHANGE ==========
  const handleFeedTypeChange = (newType) => {
    if (newType === feedType) return;

    setFeedType(newType);
    setIsFeedChanging(true);
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    processedPostIds.current.clear();
    fetchPosts(true, newType);
  };

  // Prevent zoom
  useEffect(() => {
    const preventZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
      }
    };

    const preventDoubleTapZoom = (e) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (e.touches.length === 1) {
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
          e.preventDefault(); // Prevent double-tap zoom
        }
        lastTap.current = now;
      }
    };

    const lastTap = { current: 0 };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchstart', preventDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchstart', preventDoubleTapZoom);
    };
  }, []);

  // ========== REAL-TIME SOCKET LISTENERS ==========
  useEffect(() => {
    if (!user) return;

    const unsubscribeNewPost = postsRealTime.onNewPost((data) => {
      console.log('📢 Real-time new post:', data);

      // Check if we've already processed this post
      if (!data.post?._id || processedPostIds.current.has(data.post._id)) {
        console.log('⏭️ Skipping duplicate post:', data.post?._id);
        return;
      }

      // Mark as processed
      processedPostIds.current.add(data.post._id);

      if (data.post && shouldIncludeInFeed(data.post)) {
        const normalizedPost = normalizePost(data.post);

        if (page === 1) {
          setPosts(prev => {
            // Double-check for duplicates in current state
            if (prev.some(p => p._id === normalizedPost._id)) return prev;
            return [normalizedPost, ...prev];
          });
        }

        // Batch multiple rapid notifications
        pendingNewPosts.current += 1;

        if (newPostBatchTimer.current) {
          clearTimeout(newPostBatchTimer.current);
        }

        newPostBatchTimer.current = setTimeout(() => {
          if (pendingNewPosts.current > 0) {
            setHasNewPosts(true);
            setNewPostsCount(prev => prev + pendingNewPosts.current);
            setIsPulseAnimating(true);
            setTimeout(() => setIsPulseAnimating(false), 1000);
            pendingNewPosts.current = 0;
          }
        }, 500);
      }
    });

    const unsubscribeLiked = postsRealTime.onPostLiked((data) => {
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          return {
            ...post,
            likesCount: data.likesCount,
            isLikedByCurrentUser: data.userId === user?._id ? data.action === 'like' : post.isLikedByCurrentUser
          };
        }
        return post;
      }));
    });

    const unsubscribeDeleted = postsRealTime.onPostDeleted((data) => {
      setPosts(prev => prev.filter(post => post._id !== data.postId));
    });

    const unsubscribeUpdated = postsRealTime.onPostUpdated((data) => {
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          return {
            ...post,
            ...data.updates,
            isEdited: true,
            editedAt: data.updates.editedAt
          };
        }
        return post;
      }));
    });

    // Clean up processed IDs periodically
    const cleanupInterval = setInterval(() => {
      processedPostIds.current.clear();
    }, 60000);

    return () => {
      unsubscribeNewPost();
      unsubscribeLiked();
      unsubscribeDeleted();
      unsubscribeUpdated();
      clearInterval(cleanupInterval);
      if (newPostBatchTimer.current) {
        clearTimeout(newPostBatchTimer.current);
      }
    };
  }, [user, page, feedType]);

  // Helper to determine if a post should be included in feed
  const shouldIncludeInFeed = useCallback((post) => {
    if (!user || !post) return true;

    if (post.visibility === 'private' && post.author?._id !== user._id) return false;
    if (post.visibility === 'followers') {
      const isFollowing = user.following?.includes(post.author?._id);
      if (!isFollowing && post.author?._id !== user._id) return false;
    }

    if (feedType === 'following') {
      return user.following?.includes(post.author?._id) || post.author?._id === user._id;
    }
    if (feedType === 'public') {
      return post.visibility === 'public';
    }

    return true;
  }, [user, feedType]);

  // Start polling for new posts
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  const startPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(checkForNewPosts, 120000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const checkForNewPosts = async () => {
    if (!user || posts.length === 0) return;

    try {
      const response = await postsAPI.getAll(1, 1, { feedType });
      const responseData = response.data;

      if (responseData?.data?.length > 0) {
        const latestPost = responseData.data[0];
        const latestPostTime = new Date(latestPost.createdAt).getTime();

        if (latestPostTime > lastChecked && !processedPostIds.current.has(latestPost._id)) {
          setHasNewPosts(true);
          setNewPostsCount(prev => prev + 1);
          setIsPulseAnimating(true);
          setTimeout(() => setIsPulseAnimating(false), 1000);
        }
      }
    } catch (error) {
      console.error('Failed to check for new posts:', error);
    }
  };

  // Normalize post data helper - FIXED UNIQUE KEY GENERATION
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

    let source = post.source;
    if (!source && user) {
      if (author._id === user._id) {
        source = 'own';
      } else if (user.following?.includes(author._id)) {
        source = 'following';
      } else {
        source = 'public';
      }
    }

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
      source,
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
      visibility: post.visibility || 'public',
      viewsCount: post.viewsCount || 0,
      hasViewed: post.hasViewed || false
    };
  }, [user]);

  const fetchPosts = useCallback(async (reset = false, overrideFeedType = null) => {
    if (loadingRef.current && !reset) return;

    try {
      loadingRef.current = true;
      if (!reset) {
        setIsLoadingMore(true);
      }
      setError(null);

      const currentFeedType = overrideFeedType || feedType;
      const options = { feedType: currentFeedType };
      const currentPage = reset ? 1 : page;

      const response = await postsAPI.getAll(currentPage, 10, options);
      const responseData = response.data;

      if (!responseData?.success) {
        console.error('API returned error:', responseData?.message);
        return;
      }

      let postsData = [];
      let pagination = {};

      if (responseData?.data && Array.isArray(responseData.data)) {
        postsData = responseData.data;
        pagination = responseData.pagination || {};
      }

      const uniquePostsMap = new Map();
      postsData.forEach(post => {
        if (post?._id && !uniquePostsMap.has(post._id)) {
          uniquePostsMap.set(post._id, post);
        }
      });

      const uniquePostsData = Array.from(uniquePostsMap.values());
      const normalizedPosts = uniquePostsData
        .map(post => normalizePost(post))
        .filter(Boolean);

      if (reset) {
        setPosts(normalizedPosts);
        setLastChecked(Date.now());
        setHasNewPosts(false);
        setNewPostsCount(0);
        setPage(1);
        setNextCursor(null);
        setIsFeedChanging(false);
        processedPostIds.current.clear();
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p._id));
          const newPosts = normalizedPosts.filter(p => !existingIds.has(p._id));
          return [...prev, ...newPosts];
        });
        setPage(prev => prev + 1);
      }

      setHasMore(pagination.hasMore || false);

    } catch (error) {
      console.error('❌ FETCH ERROR:', error);
      setError(error.response?.data?.message || 'Failed to load posts');
      if (reset) {
        setPosts([]);
        setIsFeedChanging(false);
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
      loadingRef.current = false;
      initialLoadRef.current = false;
    }
  }, [page, feedType, normalizePost]);

  // Initial load
  useEffect(() => {
    fetchPosts(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll handler for infinite scroll
  const handleScroll = useCallback(() => {
    if (!feedRef.current || loadingRef.current || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;

    setShowScrollTop(scrollTop > 800);

    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    if (scrollBottom < 300 && hasMore && !loadingRef.current) {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        fetchPosts(false);
      }, 200);
    }
  }, [hasMore, fetchPosts]);

  // Add scroll event listener
  useEffect(() => {
    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        feedElement.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);

  const handleHomeClick = () => {
    feedRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    if (hasNewPosts) {
      refreshFeed();
    }
  };

  const refreshFeed = () => {
    setHasNewPosts(false);
    setNewPostsCount(0);
    processedPostIds.current.clear();
    fetchPosts(true);
  };

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pull to refresh handlers
  const handleTouchStart = (e) => {
    if (feedRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (feedRef.current?.scrollTop !== 0 || !touchStartY.current) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    if (distance > 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance * 0.3, 80));
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      fetchPosts(true);
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
    touchStartY.current = 0;
  };

  const handleNewPost = (newPost) => {
    if (newPost) {
      const normalizedNewPost = normalizePost({
        ...newPost,
        isNew: true,
        author: newPost.author || {
          _id: user?._id,
          username: user?.username,
          profilePicture: user?.profilePicture
        }
      });

      if (normalizedNewPost && shouldIncludeInFeed(normalizedNewPost)) {
        setPosts(prev => [normalizedNewPost, ...prev]);
        setLastChecked(Date.now());
        processedPostIds.current.add(normalizedNewPost._id);

        setTimeout(() => {
          feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    }
    setShowCreateModal(false);
  };

  const handleLike = async (postId) => {
    try {
      await postsAPI.like(postId);
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleUnlike = async (postId) => {
    try {
      await postsAPI.unlike(postId);
    } catch (error) {
      console.error('Failed to unlike post:', error);
    }
  };

  const handleDeletePost = (postId) => {
    setPosts(prev => prev.filter(post => post && post._id !== postId));
  };

  // ========== SKELETON LOADER COMPONENT ==========
  const PostSkeleton = () => (
    <div className="post-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-info">
          <div className="skeleton-username"></div>
          <div className="skeleton-time"></div>
        </div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
      <div className="skeleton-media"></div>
      <div className="skeleton-actions">
        <div className="skeleton-action"></div>
        <div className="skeleton-action"></div>
        <div className="skeleton-action"></div>
      </div>
    </div>
  );

  // ========== LOADING MORE INDICATOR ==========
  const LoadingMoreIndicator = () => (
    <div className="loading-more-modern">
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="loading-text">Loading more posts...</span>
    </div>
  );

  // ========== MEDIA MODAL COMPONENT ==========
  const MediaModal = ({ media, postId, onClose }) => {
    const videoRef = useRef(null);

    useEffect(() => {
      if (media.mediaType === 'video' && videoRef.current) {
        setActiveVideoRef(videoRef.current);
        videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
      }

      return () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      };
    }, [media]);

    return (
      <div className="media-modal-overlay" onClick={onClose}>
        <div className="media-modal-content" ref={modalContentRef} onClick={e => e.stopPropagation()}>
          <button className="media-modal-close" onClick={onClose}>×</button>
          
          {media.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={media.url}
              controls
              autoPlay
              playsInline
              loop={false}
              className="media-modal-video"
            />
          ) : (
            <img
              src={media.url}
              alt={media.altText || 'Media content'}
              className="media-modal-image"
            />
          )}
          
          {media.edits && (
            <div className="media-edits-info">
              {media.edits.filters && <span>Filter: {media.edits.filters}</span>}
              {media.edits.caption && <p>{media.edits.caption}</p>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ========== RENDER POSTS ==========
  const renderPosts = () => {
    // Initial loading state (first page)
    if (loading && page === 1) {
      return (
        <div className="skeleton-feed">
          {[...Array(3)].map((_, i) => <PostSkeleton key={`skeleton-${i}`} />)}
        </div>
      );
    }

    // Empty state
    if (!Array.isArray(posts) || posts.length === 0) {
      return (
        <div className="empty-feed">
          <div className="empty-illustration">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M40 40 L80 80 M80 40 L40 80" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h3>No posts yet</h3>
          <p>Be the first to share something!</p>
          <button
            className="create-first-post"
            onClick={() => setShowCreateModal(true)}
          >
            Create your first post
          </button>
        </div>
      );
    }

    // Deduplicate posts by _id before rendering
    const uniquePostsMap = new Map();
    posts.forEach(post => {
      if (post && post._id && !uniquePostsMap.has(post._id)) {
        uniquePostsMap.set(post._id, post);
      }
    });
    const uniquePosts = Array.from(uniquePostsMap.values());

    return (
      <>
        {uniquePosts.map((post, index) => (
          post && (
            <div
              key={`${post._id}-${post.source || 'unknown'}`}
              className="post-wrapper"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Post
                post={post}
                onLike={handleLike}
                onUnlike={handleUnlike}
                onDelete={handleDeletePost}
                isDark={isDark}
                onMediaClick={(media) => openMediaModalHandler(media, post._id)}
                setVideoRef={setVideoRef}
              />
            </div>
          )
        ))}

        {/* Loading more indicator */}
        {isLoadingMore && <LoadingMoreIndicator />}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && !loading && (
          <div className="end-feed">
            <span className="end-icon">✨</span>
            <p>You've reached the end</p>
          </div>
        )}

        {/* Intersection observer sentinel */}
        {hasMore && !loading && !isLoadingMore && (
          <div
            ref={(el) => {
              if (el && !loadingRef.current) {
                const observer = new IntersectionObserver(
                  (entries) => {
                    if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                      fetchPosts(false);
                    }
                  },
                  { threshold: 0.1, rootMargin: '200px' }
                );
                observer.observe(el);
              }
            }}
            className="scroll-sentinel"
            style={{ height: '20px', width: '100%' }}
          />
        )}
      </>
    );
  };

  return (
    <div className={`home-page ${isDark ? 'dark' : ''}`}>
      {/* Animated Background */}
      <div className="home-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Header */}
      <header className="home-header" ref={headerRef}>
        <div className="header-content">
          <div className="header-left" onClick={handleHomeClick}>
            <div className={`logo-container ${isPulseAnimating ? 'pulse' : ''}`}>
              <svg
                className={`logo-icon ${hasNewPosts ? 'has-new' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="2"
                  fill="currentColor"
                  className="pulse-dot"
                />
              </svg>
              {hasNewPosts && (
                <>
                  <span className="new-dot"></span>
                  {newPostsCount > 0 && (
                    <span className="new-count">{newPostsCount}</span>
                  )}
                </>
              )}
            </div>
            <h1 className="logo-text">Pulse</h1>
            {isFeedChanging && (
              <div className="feed-type-loading">
                <div className="loading-spinner tiny" />
              </div>
            )}
          </div>

          <div className="header-right">
            {/* Feed Type Selector - Modern Version */}
            <div className="feed-selector-wrapper">
              <div className="feed-selector">
                <button
                  className={`feed-option ${feedType === 'mixed' ? 'active' : ''}`}
                  onClick={() => handleFeedTypeChange('mixed')}
                  disabled={isFeedChanging}
                >
                  <span className="feed-icon">💫</span>
                  <span className="feed-label">Mixed</span>
                  {feedType === 'mixed' && <span className="active-indicator"></span>}
                </button>

                <button
                  className={`feed-option ${feedType === 'following' ? 'active' : ''}`}
                  onClick={() => handleFeedTypeChange('following')}
                  disabled={isFeedChanging}
                >
                  <span className="feed-icon">👥</span>
                  <span className="feed-label">Following</span>
                  {feedType === 'following' && <span className="active-indicator"></span>}
                </button>

                <button
                  className={`feed-option ${feedType === 'public' ? 'active' : ''}`}
                  onClick={() => handleFeedTypeChange('public')}
                  disabled={isFeedChanging}
                >
                  <span className="feed-icon">🌍</span>
                  <span className="feed-label">Public</span>
                  {feedType === 'public' && <span className="active-indicator"></span>}
                </button>
              </div>

              {/* Loading indicator when changing feeds */}
              {isFeedChanging && (
                <div className="feed-loading-indicator">
                  <div className="feed-loading-spinner"></div>
                </div>
              )}
            </div>

            {/* Create Post Icon */}
            <button
              className="create-post-icon"
              onClick={() => setShowCreateModal(true)}
              title="Create new post"
              aria-label="Create new post"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {hasNewPosts && !isFeedChanging && (
              <button
                className="refresh-button"
                onClick={refreshFeed}
                title="Refresh feed"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M20.49 9C19.9828 7.56678 19.1209 6.2854 17.9845 5.27542C16.8482 4.26543 15.4745 3.56576 13.9917 3.24794C12.5089 2.93012 10.9658 3.00604 9.51881 3.46865C8.07178 3.93127 6.77183 4.76305 5.73 5.88L1 10M23 14L19.27 18.12C18.2282 19.2369 16.9282 20.0687 15.4812 20.5313C14.0342 20.994 12.4911 21.0699 11.0083 20.7521C9.52549 20.4342 8.1518 19.7346 7.01547 18.7246C5.87913 17.7146 5.01717 16.4332 4.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              className="theme-button"
              onClick={toggleTheme}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Feed Type Change Banner */}
      {isFeedChanging && (
        <div className="feed-changing-banner">
          <div className="changing-content">
            <div className="changing-spinner" />
            <span>Loading {feedType} feed...</span>
          </div>
        </div>
      )}

      {/* New Posts Banner */}
      {hasNewPosts && !isFeedChanging && (
        <div className="new-posts-banner">
          <span>{newPostsCount} new post{newPostsCount !== 1 ? 's' : ''}</span>
          <button onClick={refreshFeed}>
            Refresh
          </button>
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      <div
        className="pull-indicator"
        style={{
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance / 80
        }}
      >
        {isRefreshing ? (
          <div className="refresh-spinner" />
        ) : (
          <div className="pull-arrow">↓</div>
        )}
      </div>

      {/* Main Feed Container */}
      <main
        className={`feed-container ${isFeedChanging ? 'feed-changing' : ''}`}
        ref={feedRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Create Post Card */}
        <div className="create-post-card" onClick={() => setShowCreateModal(true)}>
          <img
            src={user?.profilePicture || 'https://i.pravatar.cc/40'}
            alt={user?.username}
            className="create-post-avatar"
          />
          <span className="create-post-placeholder">What's on your mind?</span>
          <div className="create-post-button">
            <span>+</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button onClick={() => fetchPosts(true)}>
              Try Again
            </button>
          </div>
        )}

        {/* Posts List */}
        <div className="posts-list">
          {renderPosts()}
        </div>
      </main>

      {/* Floating Create Button (Mobile) */}
      <button
        className="floating-create-button"
        onClick={() => setShowCreateModal(true)}
        title="Create new post"
        aria-label="Create new post"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          className="scroll-top-button"
          onClick={scrollToTop}
          title="Scroll to top"
        >
          ↑
        </button>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            <PostCreate
              onPostCreated={handleNewPost}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Media Modal */}
      {openMediaModal && (
        <MediaModal
          media={openMediaModal.media}
          postId={openMediaModal.postId}
          onClose={closeMediaModal}
        />
      )}
    </div>
  );
};

export default HomePage;
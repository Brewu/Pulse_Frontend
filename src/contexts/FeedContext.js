// contexts/FeedContext.js
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { postsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const FeedContext = createContext();

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within FeedProvider');
  }
  return context;
};

export const FeedProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Feed types
  const FEED_TYPES = {
    PERSONALIZED: 'personalized',
    FOLLOWING: 'following',
    TRENDING: 'trending',
    DISCOVER: 'discover',
    FOR_YOU: 'for-you'
  };

  // State for each feed type
  const [feeds, setFeeds] = useState({
    [FEED_TYPES.PERSONALIZED]: { posts: [], page: 1, hasMore: true, loading: false, error: null },
    [FEED_TYPES.FOLLOWING]: { posts: [], page: 1, hasMore: true, loading: false, error: null },
    [FEED_TYPES.TRENDING]: { posts: [], page: 1, hasMore: true, loading: false, error: null },
    [FEED_TYPES.DISCOVER]: { posts: [], page: 1, hasMore: true, loading: false, error: null },
    [FEED_TYPES.FOR_YOU]: { posts: [], page: 1, hasMore: true, loading: false, error: null }
  });

  const [activeFeed, setActiveFeed] = useState(FEED_TYPES.PERSONALIZED);
  
  // Track seen posts for diversity
  const seenPostsRef = useRef(new Set());
  const seenAuthorsRef = useRef(new Set());
  const seenTagsRef = useRef(new Set());
  
  // Track time spent on posts
  const viewTimersRef = useRef(new Map());
  const startTimeRef = useRef(Date.now());

  // Reset seen data when user changes
  useEffect(() => {
    seenPostsRef.current.clear();
    seenAuthorsRef.current.clear();
    seenTagsRef.current.clear();
  }, [user]);

  /**
   * Load feed with pagination
   */
  const loadFeed = useCallback(async (feedType, reset = false) => {
    if (!user) return;

    const feed = feeds[feedType];
    if (!reset && (feed.loading || !feed.hasMore)) return;

    setFeeds(prev => ({
      ...prev,
      [feedType]: { ...prev[feedType], loading: true, error: null }
    }));

    try {
      let response;
      const page = reset ? 1 : feed.page;
      const limit = 10;

      switch (feedType) {
        case FEED_TYPES.PERSONALIZED:
          response = await postsAPI.getPersonalizedFeed(page, limit, {
            seenAuthors: Array.from(seenAuthorsRef.current),
            seenTags: Array.from(seenTagsRef.current),
            exclude: Array.from(seenPostsRef.current)
          });
          break;
        case FEED_TYPES.FOLLOWING:
          response = await postsAPI.getFollowingFeed(page, limit);
          break;
        case FEED_TYPES.TRENDING:
          response = await postsAPI.getTrendingFeed(limit);
          break;
        case FEED_TYPES.DISCOVER:
          response = await postsAPI.getDiscoveryFeed(limit);
          break;
        case FEED_TYPES.FOR_YOU:
          response = await postsAPI.getForYouFeed(page, limit);
          break;
        default:
          return;
      }

      const newPosts = response.data?.data?.posts || response.data?.data || [];
      const pagination = response.data?.data?.pagination || response.data?.pagination;

      // Update seen data
      newPosts.forEach(post => {
        seenPostsRef.current.add(post._id);
        if (post.author?._id) {
          seenAuthorsRef.current.add(post.author._id);
        }
        if (post.tags) {
          post.tags.forEach(tag => seenTagsRef.current.add(tag));
        }
      });

      setFeeds(prev => ({
        ...prev,
        [feedType]: {
          posts: reset ? newPosts : [...prev[feedType].posts, ...newPosts],
          page: reset ? 2 : page + 1,
          hasMore: pagination?.hasMore || newPosts.length === limit,
          loading: false,
          error: null
        }
      }));

      return newPosts;
    } catch (error) {
      console.error(`Failed to load ${feedType} feed:`, error);
      setFeeds(prev => ({
        ...prev,
        [feedType]: {
          ...prev[feedType],
          loading: false,
          error: error.message || 'Failed to load feed'
        }
      }));
    }
  }, [user, feeds, FEED_TYPES]);

  /**
   * Refresh feed (reset and load from page 1)
   */
  const refreshFeed = useCallback(async (feedType) => {
    // Clear seen data for this feed type
    if (feedType === FEED_TYPES.PERSONALIZED) {
      seenPostsRef.current.clear();
      seenAuthorsRef.current.clear();
      seenTagsRef.current.clear();
    }
    
    await loadFeed(feedType, true);
  }, [loadFeed, FEED_TYPES]);

  /**
   * Track when user starts viewing a post
   */
  const startViewTracking = useCallback((postId) => {
    if (!postId) return;
    
    // Start a timer for this post
    const startTime = Date.now();
    viewTimersRef.current.set(postId, startTime);
  }, []);

  /**
   * Track when user stops viewing a post
   */
  const stopViewTracking = useCallback(async (postId) => {
    if (!postId) return;
    
    const startTime = viewTimersRef.current.get(postId);
    if (startTime) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000); // in seconds
      
      // Only track if viewed for at least 2 seconds
      if (timeSpent >= 2) {
        try {
          await postsAPI.trackInteraction(postId, 'view', timeSpent);
        } catch (error) {
          console.error('Failed to track view:', error);
        }
      }
      viewTimersRef.current.delete(postId);
    }
  }, []);

  /**
   * Track post interactions (like, comment, share, save)
   */
  const trackInteraction = useCallback(async (postId, type) => {
    try {
      await postsAPI.trackInteraction(postId, type);
      
      // Update feed optimistically if needed
      if (type === 'like' || type === 'unlike') {
        setFeeds(prev => {
          const updatedFeeds = {};
          Object.keys(prev).forEach(key => {
            updatedFeeds[key] = {
              ...prev[key],
              posts: prev[key].posts.map(post => {
                if (post._id === postId) {
                  const isLiked = type === 'like';
                  return {
                    ...post,
                    isLikedByCurrentUser: isLiked,
                    likesCount: isLiked 
                      ? (post.likesCount || 0) + 1 
                      : Math.max(0, (post.likesCount || 0) - 1)
                  };
                }
                return post;
              })
            };
          });
          return updatedFeeds;
        });
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }, []);

  /**
   * Load more posts (pagination)
   */
  const loadMore = useCallback(() => {
    const feed = feeds[activeFeed];
    if (feed.hasMore && !feed.loading) {
      loadFeed(activeFeed);
    }
  }, [activeFeed, feeds, loadFeed]);

  const value = {
    FEED_TYPES,
    activeFeed,
    setActiveFeed,
    feeds,
    loadFeed,
    refreshFeed,
    loadMore,
    trackInteraction,
    startViewTracking,
    stopViewTracking
  };

  return (
    <FeedContext.Provider value={value}>
      {children}
    </FeedContext.Provider>
  );
};
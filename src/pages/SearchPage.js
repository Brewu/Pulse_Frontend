import React, { useState, useEffect, useRef,} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import  useDebounce  from '../components/hooks/useDebounce';
import { postsAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Post from '../components/posts/Post';
import UserCard from '../components/common/UserCard';
import './SearchPage.css';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'top');
  const [filterType, setFilterType] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [timeRange, setTimeRange] = useState(searchParams.get('time') || 'all');
  
  // Results state
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  
  // Pagination
  const [postPage, setPostPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const debouncedQuery = useDebounce(query, 500);
  const searchContainerRef = useRef(null);
  const postsObserverRef = useRef(null);
  const usersObserverRef = useRef(null);

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
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeTab !== 'top') params.set('tab', activeTab);
    if (filterType !== 'all') params.set('type', filterType);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (timeRange !== 'all') params.set('time', timeRange);
    
    setSearchParams(params, { replace: true });
  }, [query, activeTab, filterType, sortBy, timeRange, setSearchParams]);

  // Fetch trending tags on mount
  useEffect(() => {
    fetchTrendingTags();
    fetchSuggestions();
  }, []);

  // Search when query or filters change
  useEffect(() => {
    if (debouncedQuery) {
      performSearch();
    } else {
      // Show suggestions when no query
      setPosts([]);
      setUsers([]);
    }
  }, [debouncedQuery, activeTab, filterType, sortBy, timeRange]);

  const fetchTrendingTags = async () => {
    try {
      const response = await postsAPI.getTrendingTags();
      setTrendingTags(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch trending tags:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await usersAPI.getSuggestions();
      setSuggestions(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const performSearch = async (loadMore = false) => {
    if (!debouncedQuery) return;
    
    try {
      if (!loadMore) {
        setLoading(true);
        setPostPage(1);
        setUserPage(1);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const currentPostPage = loadMore ? postPage + 1 : 1;
      const currentUserPage = loadMore ? userPage + 1 : 1;

      let postsResponse = null;
      let usersResponse = null;

      // Fetch based on active tab
      if (activeTab === 'top' || activeTab === 'posts') {
        postsResponse = await postsAPI.search(debouncedQuery, {
          page: currentPostPage,
          limit: 10,
          type: filterType !== 'all' ? filterType : undefined,
          sort: sortBy,
          timeRange: timeRange !== 'all' ? timeRange : undefined
        });
      }

      if (activeTab === 'top' || activeTab === 'people') {
        usersResponse = await usersAPI.search(debouncedQuery, {
          page: currentUserPage,
          limit: 10,
          sort: sortBy === 'relevance' ? 'relevance' : 'followers'
        });
      }

      // Process posts
      if (postsResponse?.data?.data) {
        const newPosts = postsResponse.data.data;
        setPosts(prev => loadMore ? [...prev, ...newPosts] : newPosts);
        setHasMorePosts(postsResponse.data.pagination?.hasMore || false);
        setTotalPosts(postsResponse.data.pagination?.total || 0);
        setPostPage(currentPostPage);
      }

      // Process users
      if (usersResponse?.data?.data) {
        const newUsers = usersResponse.data.data;
        setUsers(prev => loadMore ? [...prev, ...newUsers] : newUsers);
        setHasMoreUsers(usersResponse.data.pagination?.hasMore || false);
        setTotalUsers(usersResponse.data.pagination?.total || 0);
        setUserPage(currentUserPage);
      }

    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMorePosts = () => {
    performSearch(true);
  };

  const handleLoadMoreUsers = () => {
    performSearch(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch();
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setPosts([]);
    setUsers([]);
    setPostPage(1);
    setUserPage(1);
    setHasMorePosts(false);
    setHasMoreUsers(false);
  };

  const handleTagClick = (tag) => {
    setQuery(`#${tag}`);
    setActiveTab('posts');
  };

  const handlePostLike = async (postId) => {
    try {
      await postsAPI.like(postId);
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes?.includes(user?._id);
          return {
            ...post,
            likes: isLiked 
              ? post.likes.filter(id => id !== user?._id)
              : [...(post.likes || []), user?._id],
            likesCount: isLiked ? (post.likesCount - 1) : (post.likesCount + 1)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handlePostUnlike = async (postId) => {
    try {
      await postsAPI.unlike(postId);
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: post.likes.filter(id => id !== user?._id),
            likesCount: Math.max(0, post.likesCount - 1)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Failed to unlike post:', error);
    }
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(post => post._id !== postId));
  };

  const renderFilterChips = () => (
    <div className="filter-chips">
      <button 
        className={`chip ${filterType === 'all' ? 'active' : ''}`}
        onClick={() => setFilterType('all')}
      >
        All
      </button>
      <button 
        className={`chip ${filterType === 'post' ? 'active' : ''}`}
        onClick={() => setFilterType('post')}
      >
        Posts Only
      </button>
      <button 
        className={`chip ${filterType === 'image' ? 'active' : ''}`}
        onClick={() => setFilterType('image')}
      >
        Images
      </button>
      <button 
        className={`chip ${filterType === 'video' ? 'active' : ''}`}
        onClick={() => setFilterType('video')}
      >
        Videos
      </button>
      <button 
        className={`chip ${filterType === 'user' ? 'active' : ''}`}
        onClick={() => setFilterType('user')}
      >
        People
      </button>
    </div>
  );

  const renderSortOptions = () => (
    <div className="sort-options">
      <select 
        value={sortBy} 
        onChange={(e) => setSortBy(e.target.value)}
        className="sort-select"
      >
        <option value="relevance">Relevance</option>
        <option value="recent">Most Recent</option>
        <option value="popular">Most Popular</option>
        <option value="likes">Most Liked</option>
        <option value="comments">Most Commented</option>
      </select>

      {sortBy !== 'relevance' && (
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="time-select"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      )}
    </div>
  );

  const renderTabs = () => (
    <div className="search-tabs">
      <button 
        className={`tab ${activeTab === 'top' ? 'active' : ''}`}
        onClick={() => setActiveTab('top')}
      >
        Top Results
      </button>
      <button 
        className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
        onClick={() => setActiveTab('posts')}
      >
        Posts
      </button>
      <button 
        className={`tab ${activeTab === 'people' ? 'active' : ''}`}
        onClick={() => setActiveTab('people')}
      >
        People
      </button>
    </div>
  );

  const renderSearchResults = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => performSearch()} className="retry-btn">
            Try Again
          </button>
        </div>
      );
    }

    if (!debouncedQuery) {
      return renderSuggestions();
    }

    if (activeTab === 'top') {
      const hasPosts = posts.length > 0;
      const hasUsers = users.length > 0;

      if (!hasPosts && !hasUsers) {
        return (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try different keywords or filters</p>
          </div>
        );
      }

      return (
        <div className="mixed-results">
          {hasPosts && (
            <div className="result-section">
              <div className="section-header">
                <h3>Posts</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setActiveTab('posts')}
                >
                  View All ({totalPosts})
                </button>
              </div>
              <div className="posts-grid">
                {posts.slice(0, 3).map(post => (
                  <Post
                    key={post._id}
                    post={post}
                    onLike={handlePostLike}
                    onUnlike={handlePostUnlike}
                    onDelete={handlePostDelete}
                    isDark={isDark}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          )}

          {hasUsers && (
            <div className="result-section">
              <div className="section-header">
                <h3>People</h3>
                <button 
                  className="view-all-btn"
                  onClick={() => setActiveTab('people')}
                >
                  View All ({totalUsers})
                </button>
              </div>
              <div className="users-grid">
                {users.slice(0, 3).map(user => (
                  <UserCard key={user._id} user={user} />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'posts') {
      if (posts.length === 0) {
        return (
          <div className="no-results">
            <div className="no-results-icon">📝</div>
            <h3>No posts found</h3>
            <p>Try different keywords or filters</p>
          </div>
        );
      }

      return (
        <div className="posts-results">
          <div className="results-header">
            <p className="results-count">{totalPosts} posts found</p>
          </div>
          <div className="posts-list">
            {posts.map(post => (
              <Post
                key={post._id}
                post={post}
                onLike={handlePostLike}
                onUnlike={handlePostUnlike}
                onDelete={handlePostDelete}
                isDark={isDark}
              />
            ))}
          </div>
          {hasMorePosts && (
            <button 
              className="load-more-btn"
              onClick={handleLoadMorePosts}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <span className="spinner-small"></span>
                  Loading...
                </>
              ) : (
                'Load More Posts'
              )}
            </button>
          )}
        </div>
      );
    }

    if (activeTab === 'people') {
      if (users.length === 0) {
        return (
          <div className="no-results">
            <div className="no-results-icon">👤</div>
            <h3>No people found</h3>
            <p>Try different keywords</p>
          </div>
        );
      }

      return (
        <div className="users-results">
          <div className="results-header">
            <p className="results-count">{totalUsers} people found</p>
          </div>
          <div className="users-list">
            {users.map(user => (
              <UserCard key={user._id} user={user} />
            ))}
          </div>
          {hasMoreUsers && (
            <button 
              className="load-more-btn"
              onClick={handleLoadMoreUsers}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <span className="spinner-small"></span>
                  Loading...
                </>
              ) : (
                'Load More People'
              )}
            </button>
          )}
        </div>
      );
    }
  };

  const renderSuggestions = () => (
    <div className="suggestions-container">
      {trendingTags.length > 0 && (
        <div className="suggestion-section">
          <h3>Trending Tags</h3>
          <div className="trending-tags">
            {trendingTags.map((tag, index) => (
              <button
                key={index}
                className="tag-chip"
                onClick={() => handleTagClick(tag.name)}
              >
                <span className="tag-icon">#</span>
                {tag.name}
                <span className="tag-count">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="suggestion-section">
          <h3>Suggested for You</h3>
          <div className="suggested-users">
            {suggestions.map(user => (
              <div 
                key={user._id} 
                className="suggested-user"
                onClick={() => navigate(`/profile/${user.username}`)}
              >
                <img 
                  src={user.profilePicture || 'https://i.pravatar.cc/40'} 
                  alt={user.username}
                  className="suggested-avatar"
                />
                <div className="suggested-info">
                  <h4>{user.name || user.username}</h4>
                  <p>@{user.username}</p>
                </div>
                <span className="followers-count">
                  {user.followers?.length || 0} followers
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`search-page ${isDark ? 'dark' : ''}`}>
      {/* Theme Toggle */}
      <button className="theme-toggle-search" onClick={toggleTheme}>
        {isDark ? '☀️' : '🌙'}
      </button>

      <div className="search-container" ref={searchContainerRef}>
        {/* Search Header */}
        <div className="search-header">
          <h1>Search</h1>
          
          <form onSubmit={handleSearchSubmit} className="search-form">
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, people, or hashtags..."
                autoFocus
              />
              
              {query && (
                <button 
                  type="button" 
                  className="clear-search"
                  onClick={handleClearSearch}
                >
                  ×
                </button>
              )}
            </div>
            
            <button type="submit" className="search-btn">
              Search
            </button>
          </form>

          {/* Filter Toggle */}
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M22 3H2L10 13.46V19L14 21V13.46L22 3Z" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Filters
          </button>

          {/* Filters Panel */}
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-section">
                <h4>Content Type</h4>
                {renderFilterChips()}
              </div>
              
              <div className="filters-section">
                <h4>Sort By</h4>
                {renderSortOptions()}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        {debouncedQuery && renderTabs()}

        {/* Results */}
        <div className="search-results">
          {renderSearchResults()}
        </div>

        {/* Search Tips */}
        {!debouncedQuery && !loading && (
          <div className="search-tips">
            <h3>Search Tips</h3>
            <ul>
              <li>🔍 Use keywords to find relevant content</li>
              <li>#️⃣ Search for hashtags (e.g., #technology)</li>
              <li>👤 Find people by username or name</li>
              <li>📷 Filter by images, videos, or posts</li>
              <li>⏱️ Sort by date or popularity</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
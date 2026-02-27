import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';
import './PostDetailPage.css';

const PostDetailPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Post state
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Comments state
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsPage, setCommentsPage] = useState(1);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [activeReplyForm, setActiveReplyForm] = useState(null);
    const [replyText, setReplyText] = useState('');

    // Related posts state
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [relatedLoading, setRelatedLoading] = useState(false);

    // Theme state
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' ||
            (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // Refs for scroll
    const commentsEndRef = useRef(null);
    const commentInputRef = useRef(null);

    // ========== THEME TOGGLE ==========
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

    // ========== FETCH POST ==========
    const fetchPost = useCallback(async () => {
        if (!postId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await postsAPI.getById(postId);
            const postData = response.data?.data || response.data;

            if (!postData) {
                setError('Post not found');
                return;
            }

            // Normalize the post data
            const normalizedPost = normalizePost(postData);
            setPost(normalizedPost);

        } catch (error) {
            console.error('Failed to fetch post:', error);
            setError(error.response?.data?.message || 'Failed to load post');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    // ========== NORMALIZE POST DATA ==========
    const normalizePost = (post) => {
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
    };

    // ========== FETCH COMMENTS ==========
    const fetchComments = useCallback(async (pageNum = 1, reset = false) => {
        if (!postId) return;

        try {
            setCommentsLoading(true);

            const response = await commentsAPI.getPostComments(postId, pageNum, 10, true);

            let commentsData = [];
            let pagination = {};

            if (response.data?.data) {
                commentsData = response.data.data;
                pagination = response.data.pagination || {};
            } else if (Array.isArray(response.data)) {
                commentsData = response.data;
            }

            // Normalize comments with reply support
            const normalizedComments = commentsData.map(comment => ({
                ...comment,
                replies: comment.replies || [],
                repliesCount: comment.repliesCount || comment.replies?.length || 0,
                showReplies: false,
                isLiked: comment.isLiked || false,
                likesCount: comment.likesCount || 0,
                currentReplyPage: 1,
                hasMoreReplies: (comment.repliesCount || 0) > (comment.replies?.length || 0)
            }));

            if (reset || pageNum === 1) {
                setComments(normalizedComments);
            } else {
                setComments(prev => {
                    const existingIds = new Set(prev.map(c => c._id));
                    const newComments = normalizedComments.filter(c => !existingIds.has(c._id));
                    return [...prev, ...newComments];
                });
            }

            setHasMoreComments(pagination.hasMore || false);
            setCommentsPage(pageNum);

        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setCommentsLoading(false);
        }
    }, [postId]);

    // ========== FETCH RELATED POSTS ==========
    const fetchRelatedPosts = useCallback(async () => {
        if (!post?.tags?.length) return;

        try {
            setRelatedLoading(true);

            // Fetch posts with similar tags
            const tagPromises = post.tags.slice(0, 3).map(tag =>
                postsAPI.getByTag(tag, 1, 3)
            );

            const responses = await Promise.allSettled(tagPromises);

            const related = [];
            responses.forEach(response => {
                if (response.status === 'fulfilled' && response.value.data?.data) {
                    const posts = response.value.data.data
                        .filter(p => p._id !== post._id)
                        .slice(0, 2);
                    related.push(...posts);
                }
            });

            // Remove duplicates and limit to 6
            const uniquePosts = Array.from(new Map(related.map(p => [p._id, p])).values())
                .slice(0, 6)
                .map(p => normalizePost(p));

            setRelatedPosts(uniquePosts);

        } catch (error) {
            console.error('Failed to fetch related posts:', error);
        } finally {
            setRelatedLoading(false);
        }
    }, [post]);

    // ========== FETCH REPLIES ==========
    const fetchReplies = async (commentId, page = 1) => {
        try {
            const response = await commentsAPI.getReplies(commentId, page, 10);
            const repliesData = response.data?.data || response.data?.replies || [];

            const updateCommentReplies = (items, targetId, newReplies, currentPage) => {
                return items.map(item => {
                    if (item._id === targetId) {
                        const existingReplies = currentPage === 1 ? [] : (item.replies || []);
                        const allReplies = [...existingReplies, ...newReplies];

                        return {
                            ...item,
                            replies: allReplies,
                            showReplies: true,
                            currentReplyPage: currentPage,
                            hasMoreReplies: allReplies.length < (item.repliesCount || 0)
                        };
                    }
                    if (item.replies?.length > 0) {
                        return {
                            ...item,
                            replies: updateCommentReplies(item.replies, targetId, newReplies, currentPage)
                        };
                    }
                    return item;
                });
            };

            setComments(prev => updateCommentReplies(prev, commentId, repliesData, page));

        } catch (error) {
            console.error('Failed to fetch replies:', error);
        }
    };

    // ========== LOAD MORE REPLIES ==========
    const loadMoreReplies = async (commentId) => {
        const comment = findCommentById(comments, commentId);
        if (comment) {
            const nextPage = (comment.currentReplyPage || 1) + 1;
            await fetchReplies(commentId, nextPage);
        }
    };

    const findCommentById = (items, targetId) => {
        for (const item of items) {
            if (item._id === targetId) return item;
            if (item.replies?.length > 0) {
                const found = findCommentById(item.replies, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    // ========== TOGGLE REPLIES ==========
    const toggleReplies = (commentId) => {
        setComments(prev => {
            const updateComment = (items) => {
                return items.map(item => {
                    if (item._id === commentId) {
                        if (!item.replies?.length && !item.showReplies) {
                            fetchReplies(commentId, 1);
                        }
                        return { ...item, showReplies: !item.showReplies };
                    }
                    if (item.replies?.length > 0) {
                        return { ...item, replies: updateComment(item.replies) };
                    }
                    return item;
                });
            };
            return updateComment(prev);
        });
    };

    // ========== HANDLE COMMENT SUBMIT ==========
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !postId) return;

        setSubmittingComment(true);
        try {
            const response = await commentsAPI.createComment(postId, commentText.trim());
            const newComment = response.data?.data || response.data;

            if (newComment) {
                const normalizedComment = {
                    ...newComment,
                    replies: [],
                    repliesCount: 0,
                    showReplies: false,
                    isLiked: false,
                    likesCount: 0,
                    currentReplyPage: 1,
                    hasMoreReplies: false
                };

                setComments(prev => [normalizedComment, ...prev]);
                setCommentText('');

                // Update post comments count
                setPost(prev => ({
                    ...prev,
                    commentsCount: (prev.commentsCount || 0) + 1
                }));
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setSubmittingComment(false);
        }
    };

    // ========== HANDLE REPLY SUBMIT ==========
    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !postId || !activeReplyForm) return;

        const { commentId, parentId } = activeReplyForm;
        const targetParentId = parentId || commentId;

        try {
            const response = await commentsAPI.createComment(postId, replyText.trim(), targetParentId);
            const newReply = response.data?.data || response.data;

            const updateNestedReplies = (items) => {
                return items.map(item => {
                    if (item._id === targetParentId) {
                        const updatedReplies = [{
                            ...newReply,
                            replies: [],
                            repliesCount: 0,
                            showReplies: false,
                            isLiked: false,
                            likesCount: 0
                        }, ...(item.replies || [])];

                        return {
                            ...item,
                            replies: updatedReplies,
                            repliesCount: (item.repliesCount || 0) + 1,
                            showReplies: true
                        };
                    }
                    if (item.replies?.length > 0) {
                        return { ...item, replies: updateNestedReplies(item.replies) };
                    }
                    return item;
                });
            };

            setComments(prev => updateNestedReplies(prev));
            setReplyText('');
            setActiveReplyForm(null);

            // Update post comments count
            setPost(prev => ({
                ...prev,
                commentsCount: (prev.commentsCount || 0) + 1
            }));

        } catch (error) {
            console.error('Failed to post reply:', error);
        }
    };

    // ========== HANDLE LIKE ==========
    const handleLike = async (postId) => {
        try {
            const isCurrentlyLiked = post.isLikedByCurrentUser;

            setPost(prev => ({
                ...prev,
                isLikedByCurrentUser: !isCurrentlyLiked,
                likesCount: isCurrentlyLiked ? (prev.likesCount - 1) : (prev.likesCount + 1)
            }));

            if (isCurrentlyLiked) {
                await postsAPI.unlike(postId);
            } else {
                await postsAPI.like(postId);
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // Revert on error
            setPost(prev => ({
                ...prev,
                isLikedByCurrentUser: !prev.isLikedByCurrentUser,
                likesCount: prev.isLikedByCurrentUser ? (prev.likesCount + 1) : (prev.likesCount - 1)
            }));
        }
    };

    // ========== HANDLE DELETE POST ==========
    const handleDeletePost = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await postsAPI.delete(postId);
                navigate('/');
            } catch (error) {
                console.error('Failed to delete post:', error);
                alert('Failed to delete post');
            }
        }
    };

    // ========== HANDLE DELETE COMMENT ==========
    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;

        try {
            await commentsAPI.deleteComment(commentId);

            // Remove comment from state
            const removeComment = (items) => {
                return items.filter(item => {
                    if (item._id === commentId) {
                        return false;
                    }
                    if (item.replies?.length > 0) {
                        item.replies = removeComment(item.replies);
                    }
                    return true;
                });
            };

            setComments(prev => removeComment(prev));

            // Update post comments count
            setPost(prev => ({
                ...prev,
                commentsCount: Math.max(0, (prev.commentsCount || 0) - 1)
            }));

        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    // ========== HANDLE COMMENT LIKE ==========
    const handleCommentLike = async (commentId, currentlyLiked) => {
        try {
            const updateLike = (items) => {
                return items.map(item => {
                    if (item._id === commentId) {
                        return {
                            ...item,
                            isLiked: !currentlyLiked,
                            likesCount: currentlyLiked ? (item.likesCount - 1) : (item.likesCount + 1)
                        };
                    }
                    if (item.replies?.length > 0) {
                        return { ...item, replies: updateLike(item.replies) };
                    }
                    return item;
                });
            };

            setComments(prev => updateLike(prev));

            if (currentlyLiked) {
                await commentsAPI.unlikeComment(commentId);
            } else {
                await commentsAPI.likeComment(commentId);
            }
        } catch (error) {
            console.error('Failed to toggle comment like:', error);
        }
    };

    // ========== LOAD MORE COMMENTS ==========
    const loadMoreComments = () => {
        if (hasMoreComments && !commentsLoading) {
            fetchComments(commentsPage + 1);
        }
    };

    // ========== OPEN REPLY FORM ==========
    const openReplyForm = (commentId, parentId = null) => {
        setActiveReplyForm({ commentId, parentId });
        setReplyText('');
    };

    // ========== CLOSE REPLY FORM ==========
    const closeReplyForm = () => {
        setActiveReplyForm(null);
        setReplyText('');
    };

    // ========== INITIAL LOADS ==========
    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    useEffect(() => {
        if (post) {
            fetchComments(1, true);
            fetchRelatedPosts();
        }
    }, [post]);

    // ========== RENDER COMMENT ==========
    const renderComment = (comment, depth = 0) => {
        const maxDepth = 5;
        const canReply = depth < maxDepth - 1;
        const hasReplies = comment.repliesCount > 0;
        const showReplies = comment.showReplies;
        const isReplyFormActive = activeReplyForm?.parentId === comment._id ||
            activeReplyForm?.commentId === comment._id;

        return (
            <div key={comment._id} className={`comment depth-${depth}`}>
                <div className="comment-main">
                    <Link to={`/profile/${comment.author?.username}`} className="comment-avatar">
                        <img
                            src={comment.author?.profilePicture || 'https://i.pravatar.cc/40'}
                            alt={comment.author?.username}
                        />
                    </Link>

                    <div className="comment-content">
                        <div className="comment-header">
                            <Link to={`/profile/${comment.author?.username}`} className="comment-author">
                                {comment.author?.username}
                                {comment.author?.verified && <span className="verified-badge">✓</span>}
                            </Link>
                            <span className="comment-time">
                                {moment(comment.createdAt).fromNow()}
                            </span>
                        </div>

                        <div className="comment-text">{comment.content}</div>

                        <div className="comment-actions">
                            <button
                                className={`comment-like ${comment.isLiked ? 'liked' : ''}`}
                                onClick={() => handleCommentLike(comment._id, comment.isLiked)}
                            >
                                <i className={`${comment.isLiked ? 'fas' : 'far'} fa-heart`}></i>
                                <span>{comment.likesCount || 0}</span>
                            </button>

                            {canReply && (
                                <button
                                    className="comment-reply"
                                    onClick={() => openReplyForm(
                                        depth === 0 ? comment._id : activeReplyForm?.commentId || comment._id,
                                        comment._id
                                    )}
                                >
                                    <i className="far fa-reply"></i>
                                    <span>Reply</span>
                                </button>
                            )}

                            {user?._id === comment.author?._id && (
                                <button
                                    className="comment-delete"
                                    onClick={() => handleDeleteComment(comment._id)}
                                >
                                    <i className="far fa-trash-alt"></i>
                                </button>
                            )}
                        </div>

                        {/* Reply Form */}
                        {isReplyFormActive && (
                            <form onSubmit={handleReplySubmit} className="reply-form">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Reply to @${comment.author?.username}...`}
                                    className="reply-input"
                                    autoFocus
                                />
                                <div className="reply-actions">
                                    <button type="submit" className="reply-submit">
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                    <button type="button" className="reply-cancel" onClick={closeReplyForm}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Replies */}
                {hasReplies && (
                    <div className="replies-section">
                        <button
                            className="toggle-replies-btn"
                            onClick={() => toggleReplies(comment._id)}
                        >
                            <i className={`fas fa-chevron-${showReplies ? 'up' : 'down'}`}></i>
                            {showReplies ? 'Hide' : 'Show'} {comment.repliesCount}
                            {comment.repliesCount === 1 ? ' reply' : ' replies'}
                        </button>

                        {showReplies && (
                            <div className="replies-list">
                                {comment.replies?.map(reply => renderComment(reply, depth + 1))}

                                {comment.hasMoreReplies && (
                                    <button
                                        className="load-more-replies"
                                        onClick={() => loadMoreReplies(comment._id)}
                                    >
                                        <i className="fas fa-chevron-down"></i>
                                        Load more replies
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // ========== RENDER ==========
    if (loading) {
        return (
            <div className={`post-detail-page ${isDark ? 'dark' : ''}`}>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading post...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className={`post-detail-page ${isDark ? 'dark' : ''}`}>
                <div className="error-container">
                    <div className="error-icon">📄</div>
                    <h2>Post Not Found</h2>
                    <p>{error || 'The post you\'re looking for doesn\'t exist or has been removed.'}</p>
                    <div className="error-actions">
                        <button onClick={() => navigate('/')} className="btn-primary">
                            <i className="fas fa-home"></i>
                            Go to Home
                        </button>
                        <button onClick={() => navigate(-1)} className="btn-secondary">
                            <i className="fas fa-arrow-left"></i>
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`post-detail-page ${isDark ? 'dark' : ''}`}>
            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
                <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
            </button>

            {/* Header with navigation */}
            <header className="detail-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate(-1)}>
                        <i className="fas fa-arrow-left"></i>
                        <span>Back</span>
                    </button>
                </div>
                <div className="header-center">
                    <h1>Post Details</h1>
                </div>
                <div className="header-right">
                    <Link to="/" className="home-link">
                        <i className="fas fa-home"></i>
                        <span>Home</span>
                    </Link>
                </div>
            </header>

            <div className="post-detail-container">
                {/* Main Post - Full width emphasis */}
                <div className="post-detail-main">
                    <div className="post-card detail-view">
                        {/* Post Header */}
                        <div className="post-header">
                            <div className="post-user">
                                <Link to={`/profile/${post.author?.username}`} className="user-avatar-link">
                                    <img
                                        src={post.author?.profilePicture || 'https://i.pravatar.cc/40'}
                                        alt={post.author?.username}
                                        className="user-avatar"
                                    />
                                </Link>
                                <div className="post-info">
                                    <Link to={`/profile/${post.author?.username}`} className="post-username">
                                        <h3>{post.author?.username}</h3>
                                        {post.author?.verified && <i className="fas fa-check-circle verified"></i>}
                                    </Link>
                                    <div className="post-meta">
                                        <span className="post-time">
                                            <i className="far fa-calendar-alt"></i>
                                            {moment(post.createdAt).format('MMMM D, YYYY [at] h:mm A')}
                                        </span>
                                        {post.location?.name && (
                                            <>
                                                <span className="meta-separator">•</span>
                                                <span className="post-location">
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    {post.location.name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Post Content */}
                        {post.content && (
                            <div className="post-content">
                                {post.content.split('\n').map((paragraph, i) => (
                                    <p key={i}>{paragraph}</p>
                                ))}
                            </div>
                        )}

                        {/* Tags */}
                        {post.tags?.length > 0 && (
                            <div className="post-tags">
                                {post.tags.map(tag => (
                                    <Link key={tag} to={`/tag/${tag}`} className="tag">
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Media */}
                        {post.media?.length > 0 && (
                            <div className={`post-media ${post.media.length === 1 ? 'single' : 'grid'}`}>
                                {post.media.map((media, index) => (
                                    <div key={index} className="media-item">
                                        {media.mediaType === 'video' ? (
                                            <video
                                                src={media.url}
                                                controls
                                                className="media-video"
                                                poster={media.thumbnail}
                                            />
                                        ) : (
                                            <img
                                                src={media.url}
                                                alt={media.altText || ''}
                                                className="media-image"
                                                loading="lazy"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Post Stats */}
                        <div className="post-stats">
                            <div className="stat-item">
                                <i className={`${post.isLikedByCurrentUser ? 'fas' : 'far'} fa-heart`}></i>
                                <span className="stat-count">{post.likesCount}</span>
                                <span className="stat-label">likes</span>
                            </div>
                            <div className="stat-item">
                                <i className="far fa-comment"></i>
                                <span className="stat-count">{post.commentsCount}</span>
                                <span className="stat-label">comments</span>
                            </div>
                            <div className="stat-item">
                                <i className="far fa-eye"></i>
                                <span className="stat-count">{post.viewsCount}</span>
                                <span className="stat-label">views</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="post-actions">
                            <button
                                className={`action-btn like ${post.isLikedByCurrentUser ? 'active' : ''}`}
                                onClick={() => handleLike(post._id)}
                            >
                                <i className={`${post.isLikedByCurrentUser ? 'fas' : 'far'} fa-heart`}></i>
                                <span>{post.isLikedByCurrentUser ? 'Liked' : 'Like'}</span>
                            </button>

                            <button
                                className="action-btn comment"
                                onClick={() => commentInputRef.current?.focus()}
                            >
                                <i className="far fa-comment"></i>
                                <span>Comment</span>
                            </button>

                            <button className="action-btn share">
                                <i className="far fa-share-square"></i>
                                <span>Share</span>
                            </button>

                            {user?._id === post.author?._id && (
                                <button
                                    className="action-btn delete"
                                    onClick={() => handleDeletePost(post._id)}
                                >
                                    <i className="far fa-trash-alt"></i>
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comments Section - Separate container */}
                <div className="comments-section">
                    <div className="comments-header">
                        <h2>
                            <i className="far fa-comments"></i>
                            Comments ({post.commentsCount || 0})
                        </h2>
                    </div>

                    {/* Comment Form */}
                    <form onSubmit={handleCommentSubmit} className="comment-form">
                        <div className="comment-input-wrapper">
                            <img
                                src={user?.profilePicture || 'https://i.pravatar.cc/40'}
                                alt={user?.username}
                                className="comment-avatar"
                            />
                            <input
                                ref={commentInputRef}
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="comment-input"
                                disabled={submittingComment}
                            />
                            <button
                                type="submit"
                                className="comment-submit"
                                disabled={!commentText.trim() || submittingComment}
                            >
                                {submittingComment ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fas fa-paper-plane"></i>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Comments List */}
                    <div className="comments-list">
                        {commentsLoading && comments.length === 0 ? (
                            <div className="comments-loading">
                                <div className="loading-spinner small"></div>
                                <p>Loading comments...</p>
                            </div>
                        ) : comments.length > 0 ? (
                            <>
                                {comments.map(comment => renderComment(comment))}

                                {hasMoreComments && (
                                    <div className="load-more-comments">
                                        <button
                                            onClick={loadMoreComments}
                                            className="load-more-btn"
                                            disabled={commentsLoading}
                                        >
                                            {commentsLoading ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-chevron-down"></i>
                                                    Load More Comments
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="no-comments">
                                <i className="far fa-comment-dots"></i>
                                <p>No comments yet. Be the first to comment!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="related-posts">
                        <div className="related-header">
                            <h2>
                                <i className="fas fa-hashtag"></i>
                                Related Posts
                            </h2>
                        </div>
                        <div className="related-grid">
                            {relatedPosts.map(relatedPost => (
                                <div
                                    key={relatedPost._id}
                                    className="related-card"
                                    onClick={() => {
                                        window.scrollTo(0, 0);
                                        navigate(`/posts/${relatedPost._id}`);
                                    }}
                                >
                                    {relatedPost.media?.[0] && (
                                        <div className="related-media">
                                            {relatedPost.media[0].mediaType === 'video' ? (
                                                <video src={relatedPost.media[0].url} />
                                            ) : (
                                                <img src={relatedPost.media[0].url} alt="" />
                                            )}
                                        </div>
                                    )}
                                    <div className="related-content">
                                        <p className="related-text">
                                            {relatedPost.content?.substring(0, 60)}...
                                        </p>
                                        <div className="related-meta">
                                            <span>
                                                <i className="fas fa-heart"></i>
                                                {relatedPost.likesCount || 0}
                                            </span>
                                            <span>
                                                <i className="fas fa-comment"></i>
                                                {relatedPost.commentsCount || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostDetailPage;
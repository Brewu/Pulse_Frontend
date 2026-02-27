import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import moment from 'moment';
import './Post.css';

// ─── Inline SVG Icons (no Font Awesome dependency) ───────
const Icons = {
  Heart: ({ filled }) => (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Comment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Ellipsis: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Reply: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  VolumeUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ),
  VolumeOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Compass: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Warning: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Hashtag: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
  Comments: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em'}}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 14h5"/>
    </svg>
  ),
  BadgeCheck: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.125em',color:'#00d2c8'}}>
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
    </svg>
  ),
};
// ─────────────────────────────────────────────────────────

// ─── Reels Video Fetcher ──────────────────────────────────
// Tries multiple strategies in order to find video posts:
//   1. postsAPI.getRecommendedVideos  (personalised, logged-in only)
//   2. postsAPI.getRandomVideos       (random pool)
//   3. postsAPI.getAll with a video filter hint
//   4. postsAPI.getAll (general feed) – filters client-side for media posts
// Returns a normalised array of video posts or throws.
const fetchVideosWithFallback = async ({ user, page = 1, limit = 10 }) => {
  const isVideo = (url) => /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url || '');

  const extractVideos = (response) => {
    const data = response?.data;
    const candidates = (
      data?.data?.posts ||
      data?.posts ||
      data?.data ||
      (Array.isArray(data) ? data : null)
    );
    if (!Array.isArray(candidates)) return [];
    return candidates.filter(p => {
      if (!p) return false;
      if (p.type === 'video') return true;
      if (p.videoUrl) return true;
      if (Array.isArray(p.media) && p.media.some(m =>
        m.type === 'video' || m.mediaType === 'video' || isVideo(m.url)
      )) return true;
      return false;
    });
  };

  // Strategy 1 – recommended (logged in only)
  if (user) {
    try {
      const res = await postsAPI.getRecommendedVideos(page, limit);
      const videos = extractVideos(res);
      if (videos.length > 0) return videos;
    } catch (_) { /* fall through */ }
  }

  // Strategy 2 – random video endpoint
  try {
    const res = await postsAPI.getRandomVideos(page, limit);
    const videos = extractVideos(res);
    if (videos.length > 0) return videos;
  } catch (_) { /* fall through */ }

  // Strategy 3 – general feed, filter client-side
  try {
    const res = await postsAPI.getAll(page, limit * 3, { feedType: 'public' });
    const all = (
      res?.data?.data ||
      res?.data?.posts ||
      (Array.isArray(res?.data) ? res.data : [])
    );
    const videos = (Array.isArray(all) ? all : []).filter(p => {
      if (!p) return false;
      if (p.type === 'video') return true;
      if (p.videoUrl) return true;
      if (Array.isArray(p.media) && p.media.some(m =>
        m.type === 'video' || m.mediaType === 'video' || isVideo(m.url)
      )) return true;
      return false;
    });
    if (videos.length > 0) return videos;
  } catch (_) { /* fall through */ }

  return []; // all strategies exhausted
};
// ─────────────────────────────────────────────────────────

const Post = ({ post, onLike, onUnlike, onDelete, isDark, isDetailView = false }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Media Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [mediaList, setMediaList] = useState([]);

  // Reels states
  const [reelsOpen, setReelsOpen] = useState(false);
  const [randomVideos, setRandomVideos] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [videoPage, setVideoPage] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialVideoLoaded, setInitialVideoLoaded] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoVolume, setVideoVolume] = useState(1);
  const [reelsError, setReelsError] = useState(null);

  // Reels interaction states
  const [showReelComments, setShowReelComments] = useState(false);
  const [reelComments, setReelComments] = useState([]);
  const [reelCommentText, setReelCommentText] = useState('');
  const [submittingReelComment, setSubmittingReelComment] = useState(false);
  const [loadingReelComments, setLoadingReelComments] = useState(false);
  const [reelLiked, setReelLiked] = useState(false);
  const [reelLikesCount, setReelLikesCount] = useState(0);
  const [savedPosts, setSavedPosts] = useState([]);

  // View states
  const [viewsCount, setViewsCount] = useState(post?.viewsCount || 0);
  const [hasViewed, setHasViewed] = useState(post?.hasViewed || false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Comment states
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(post?.commentsCount || 0);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reply states
  const [activeReplyForm, setActiveReplyForm] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [loadingMoreReplies, setLoadingMoreReplies] = useState({});

  // Post Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const repliesContainerRef = useRef({});
  const reelsVideoRef = useRef(null);
  const modalVideoRef = useRef(null);
  const modalRef = useRef(null);
  const detailModalRef = useRef(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const volumeSliderRef = useRef(null);

  // ==================== PUSH NOTIFICATION HELPER ====================
  const sendPushNotification = useCallback(async (userId, notificationData) => {
    try {
      if (!userId) return;
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
      if (!isValidObjectId) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`https://pulse-backend-tpg8.onrender.com/api/push/send/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok && response.status !== 404) {
        console.log('Push notification not sent (status:', response.status, ')');
      }
    } catch (error) {
      console.log('Push notification failed (non-critical)');
    }
  }, []);

  const isVideo = useCallback((url) => /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url || ''), []);

  const hasImage = useCallback(() => {
    if (post?.image) return true;
    if (post?.media && Array.isArray(post.media) && post.media.length > 0) return true;
    return false;
  }, [post]);

  const formatContent = useCallback((content) => {
    if (!content) return null;

    const parts = [];
    let lastIndex = 0;
    const combinedRegex = /(@\w+)|(https?:\/\/[^\s]+)/g;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      const [fullMatch] = match;
      const index = match.index;

      if (index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="content-text">
            {content.substring(lastIndex, index)}
          </span>
        );
      }

      if (fullMatch.startsWith('@')) {
        const username = fullMatch.substring(1);
        parts.push(
          <Link
            key={`mention-${index}`}
            to={`/profile/${username}`}
            className="content-mention"
            onClick={(e) => e.stopPropagation()}
          >
            @{username}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={`link-${index}`}
            href={fullMatch}
            target="_blank"
            rel="noopener noreferrer"
            className="content-link"
            onClick={(e) => e.stopPropagation()}
          >
            {fullMatch}
          </a>
        );
      }
      lastIndex = index + fullMatch.length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="content-text">
          {content.substring(lastIndex)}
        </span>
      );
    }

    const withLineBreaks = [];
    parts.forEach((part, i) => {
      if (typeof part === 'string' || part.type === 'span') {
        const text = typeof part === 'string' ? part : part.props.children;
        const lines = text.split('\n');
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) withLineBreaks.push(<br key={`br-${i}-${lineIndex}`} />);
          if (line) withLineBreaks.push(<span key={`line-${i}-${lineIndex}`}>{line}</span>);
        });
      } else {
        withLineBreaks.push(part);
      }
    });

    return <div className="formatted-content">{withLineBreaks}</div>;
  }, []);

  const formatViewCount = useCallback((count) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }, []);

  const getMediaUrl = useCallback((media) => media?.url || media?.path || '', []);

  const getMediaType = useCallback((media) => {
    if (media?.type === 'video' || media?.mediaType === 'video') return 'video';
    if (isVideo(media?.url)) return 'video';
    return 'image';
  }, [isVideo]);

  const getVideoUrl = useCallback((videoPost) => {
    if (!videoPost) return '';
    if (Array.isArray(videoPost.media) && videoPost.media.length > 0) {
      const videoMedia = videoPost.media.find(m =>
        m.type === 'video' || m.mediaType === 'video' || isVideo(m.url)
      );
      if (videoMedia) return videoMedia.url || videoMedia.path || '';
    }
    return videoPost.videoUrl || videoPost.url || '';
  }, [isVideo]);

  // ========== POST DETAIL MODAL ==========
  const openPostDetail = useCallback(() => {
    if (isDetailView) return;
    setDetailModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, [isDetailView]);

  const closePostDetail = useCallback(() => {
    setDetailModalOpen(false);
    document.body.style.overflow = 'unset';
  }, []);

  // ========== MEDIA MODAL ==========
  const openMediaModal = useCallback((media, index = 0, allMedia = []) => {
    setSelectedMedia(media);
    setSelectedMediaIndex(index);
    setMediaList(allMedia.length > 0 ? allMedia : [media]);
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeMediaModal = useCallback(() => {
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      modalVideoRef.current.src = '';
    }
    setModalOpen(false);
    setSelectedMedia(null);
    setMediaList([]);
    document.body.style.overflow = 'unset';
  }, []);

  const navigateMedia = useCallback((direction) => {
    if (mediaList.length <= 1) return;
    let newIndex = selectedMediaIndex + direction;
    if (newIndex < 0) newIndex = mediaList.length - 1;
    if (newIndex >= mediaList.length) newIndex = 0;
    setSelectedMediaIndex(newIndex);
    setSelectedMedia(mediaList[newIndex]);
  }, [mediaList, selectedMediaIndex]);

  const handleModalOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeMediaModal();
  }, [closeMediaModal]);

  // ========== REELS — IMPROVED FETCH ==========

  const normalizeVideoPost = useCallback((v) => ({
    ...v,
    media: Array.isArray(v.media) ? v.media : [],
    author: v.author || { username: 'Unknown', profilePicture: null },
    likesCount: v.likesCount || v.likes?.length || 0,
    commentsCount: v.commentsCount || 0,
  }), []);

  // Fetch a page of videos, pushing into state
  const loadVideos = useCallback(async (page = 1, replaceExisting = false) => {
    if (loadingVideos) return;
    setLoadingVideos(true);
    setReelsError(null);

    try {
      const videos = await fetchVideosWithFallback({ user, page, limit: 10 });
      const processed = videos.map(normalizeVideoPost);

      if (replaceExisting) {
        setRandomVideos(processed);
        setCurrentVideoIndex(0);
        if (processed.length > 0) {
          fetchReelComments(processed[0]._id);
          checkIfLiked(processed[0]);
        }
      } else {
        setRandomVideos(prev => {
          const existingIds = new Set(prev.map(v => v._id));
          const fresh = processed.filter(v => !existingIds.has(v._id));
          return [...prev, ...fresh];
        });
      }

      setVideoPage(page);
      setHasMoreVideos(videos.length >= 10);

      if (processed.length === 0 && replaceExisting) {
        setReelsError('No videos found right now. Try again later.');
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
      setReelsError('Could not load videos. Please check your connection.');
      setHasMoreVideos(false);
    } finally {
      setLoadingVideos(false);
    }
  }, [loadingVideos, user, normalizeVideoPost]); // fetchReelComments/checkIfLiked added below

  const loadMoreVideos = useCallback(() => {
    if (!loadingVideos && hasMoreVideos) {
      loadVideos(videoPage + 1, false);
    }
  }, [loadingVideos, hasMoreVideos, videoPage, loadVideos]);

  const checkIfLiked = useCallback((videoPost) => {
    if (!user || !videoPost) return;
    const liked = videoPost.likes?.some(id => id.toString() === user._id.toString());
    setReelLiked(liked || false);
    setReelLikesCount(videoPost.likesCount || videoPost.likes?.length || 0);
  }, [user]);

  const fetchReelComments = useCallback(async (postId) => {
    if (!postId) return;
    setLoadingReelComments(true);
    try {
      const response = await commentsAPI.getPostComments(postId, 1, 10);
      const commentsData = response.data?.data?.comments || response.data?.comments || [];
      setReelComments(commentsData);
    } catch (error) {
      console.error('Failed to fetch reel comments:', error);
    } finally {
      setLoadingReelComments(false);
    }
  }, []);

  const handleReelLikeToggle = useCallback(async () => {
    if (!user) return;
    const newLikedState = !reelLiked;
    const previousLikedState = reelLiked;
    const previousLikesCount = reelLikesCount;
    const currentVideo = randomVideos[currentVideoIndex];
    if (!currentVideo) return;

    setReelLiked(newLikedState);
    setReelLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (newLikedState) await onLike?.(currentVideo._id);
      else await onUnlike?.(currentVideo._id);
    } catch (error) {
      console.error('Failed to toggle reel like:', error);
      setReelLiked(previousLikedState);
      setReelLikesCount(previousLikesCount);
    }
  }, [user, reelLiked, reelLikesCount, currentVideoIndex, randomVideos, onLike, onUnlike]);

  const handleReelCommentSubmit = useCallback(async (e) => {
    e.preventDefault();
    const currentVideo = randomVideos[currentVideoIndex];
    if (!reelCommentText.trim() || !currentVideo?._id) return;

    setSubmittingReelComment(true);
    try {
      const response = await commentsAPI.createComment(currentVideo._id, reelCommentText.trim());
      const newComment = response.data?.data || response.data;
      if (newComment) {
        setReelComments(prev => [newComment, ...prev]);
        setReelCommentText('');

        if (currentVideo.author?._id !== user?._id) {
          sendPushNotification(currentVideo.author?._id, {
            title: '💬 New Comment on Your Reel',
            body: `${user.username} commented: ${reelCommentText.substring(0, 50)}...`,
            type: 'comment',
            data: { url: `/posts/${currentVideo._id}`, postId: currentVideo._id }
          });
        }
      }
    } catch (error) {
      console.error('Failed to post reel comment:', error);
    } finally {
      setSubmittingReelComment(false);
    }
  }, [randomVideos, currentVideoIndex, reelCommentText, user, sendPushNotification]);

  const togglePlayPause = useCallback(() => setIsPlaying(prev => !prev), []);

  const toggleMute = useCallback(() => {
    if (reelsVideoRef.current) {
      reelsVideoRef.current.muted = !videoMuted;
      setVideoMuted(prev => !prev);
    }
  }, [videoMuted]);

  const handleVolumeChange = useCallback((e) => {
    const volume = parseFloat(e.target.value);
    if (reelsVideoRef.current) {
      reelsVideoRef.current.volume = volume;
      setVideoVolume(volume);
      setVideoMuted(volume === 0);
    }
  }, []);

  const navigateReel = useCallback((direction) => {
    if (!randomVideos.length) return;
    let newIndex;

    if (direction === 'next') {
      // Pre-load more when approaching the end
      if (currentVideoIndex >= randomVideos.length - 3) loadMoreVideos();
      newIndex = Math.min(currentVideoIndex + 1, randomVideos.length - 1);
    } else {
      newIndex = Math.max(currentVideoIndex - 1, 0);
    }

    if (newIndex !== currentVideoIndex) {
      reelsVideoRef.current?.pause();
      setCurrentVideoIndex(newIndex);
      setIsPlaying(true);
      setShowReelComments(false);
      setInitialVideoLoaded(false);

      const videoPost = randomVideos[newIndex];
      if (videoPost) {
        fetchReelComments(videoPost._id);
        checkIfLiked(videoPost);
      }
    }
  }, [randomVideos, currentVideoIndex, loadMoreVideos, fetchReelComments, checkIfLiked]);

  const handleNextVideo = useCallback(() => navigateReel('next'), [navigateReel]);
  const handlePrevVideo = useCallback(() => navigateReel('prev'), [navigateReel]);

  const handleSavePost = useCallback(async () => {
    const currentVideo = randomVideos[currentVideoIndex];
    if (!currentVideo) return;
    try {
      if (savedPosts.includes(currentVideo._id)) {
        await postsAPI.unsave(currentVideo._id);
        setSavedPosts(prev => prev.filter(id => id !== currentVideo._id));
      } else {
        await postsAPI.save(currentVideo._id);
        setSavedPosts(prev => [...prev, currentVideo._id]);
      }
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  }, [randomVideos, currentVideoIndex, savedPosts]);

  // Open Reels — uses the current post if it's a video, then loads more in background
  const openReelsModal = useCallback(async (videoMedia) => {
    setReelsOpen(true);
    setIsPlaying(true);
    setInitialVideoLoaded(false);
    setVideoMuted(false);
    setVideoVolume(1);
    setReelsError(null);
    document.body.style.overflow = 'hidden';

    const currentPostIsVideo = post?.media?.some(m => getMediaType(m) === 'video');

    if (currentPostIsVideo) {
      // Seed with current post immediately for zero-wait UX
      const seed = normalizeVideoPost({
        ...post,
        isLiked: post.likes?.some(id => id.toString() === user?._id?.toString()) || false,
      });
      setRandomVideos([seed]);
      setCurrentVideoIndex(0);
      fetchReelComments(post._id);
      setReelLiked(seed.isLiked);
      setReelLikesCount(post.likesCount || post.likes?.length || 0);

      // Then fetch more in the background
      setTimeout(async () => {
        try {
          const videos = await fetchVideosWithFallback({ user, page: 1, limit: 15 });
          const processed = videos
            .filter(v => v._id !== post._id)
            .map(normalizeVideoPost);
          if (processed.length > 0) {
            setRandomVideos(prev => [...prev, ...processed]);
            setHasMoreVideos(videos.length >= 10);
          }
        } catch (err) {
          console.error('Background video fetch failed:', err);
        }
      }, 300);
    } else {
      // No seed post — load from scratch
      await loadVideos(1, true);
    }
  }, [post, user, getMediaType, fetchReelComments, normalizeVideoPost, loadVideos]);

  const closeReelsModal = useCallback(() => {
    setReelsOpen(false);
    setRandomVideos([]);
    setCurrentVideoIndex(0);
    setVideoPage(1);
    setHasMoreVideos(true);
    setIsPlaying(false);
    setShowReelComments(false);
    setVideoMuted(false);
    setReelsError(null);
    document.body.style.overflow = 'unset';

    if (reelsVideoRef.current) {
      reelsVideoRef.current.pause();
      reelsVideoRef.current.src = '';
    }
  }, []);

  // ========== KEYBOARD NAVIGATION ==========
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modalOpen) {
        if (e.key === 'Escape') closeMediaModal();
        else if (e.key === 'ArrowLeft') navigateMedia(-1);
        else if (e.key === 'ArrowRight') navigateMedia(1);
      } else if (reelsOpen) {
        if (e.key === 'Escape') closeReelsModal();
        else if (e.key === 'ArrowUp') { e.preventDefault(); handlePrevVideo(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); handleNextVideo(); }
        else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); togglePlayPause(); }
        else if (e.key === 'm' || e.key === 'M') toggleMute();
      } else if (detailModalOpen) {
        if (e.key === 'Escape') closePostDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, reelsOpen, detailModalOpen, closeMediaModal, closeReelsModal, closePostDetail,
    navigateMedia, handlePrevVideo, handleNextVideo, togglePlayPause, toggleMute]);

  // Touch swipe for reels
  const handleTouchStart = useCallback((e) => {
    if (reelsOpen) touchStartY.current = e.touches[0].clientY;
  }, [reelsOpen]);

  const handleTouchMove = useCallback((e) => {
    if (reelsOpen) touchEndY.current = e.touches[0].clientY;
  }, [reelsOpen]);

  const handleTouchEnd = useCallback(() => {
    if (!reelsOpen) return;
    const swipeDistance = touchStartY.current - touchEndY.current;
    if (Math.abs(swipeDistance) > 50) {
      swipeDistance > 0 ? handleNextVideo() : handlePrevVideo();
    }
  }, [reelsOpen, handleNextVideo, handlePrevVideo]);

  // Video play/pause sync
  useEffect(() => {
    if (reelsOpen && reelsVideoRef.current) {
      if (isPlaying && initialVideoLoaded) {
        reelsVideoRef.current.play().catch(() => setIsPlaying(false));
      } else if (!isPlaying) {
        reelsVideoRef.current.pause();
      }
    }
  }, [isPlaying, reelsOpen, currentVideoIndex, initialVideoLoaded]);

  useEffect(() => {
    if (reelsOpen && randomVideos[currentVideoIndex]) {
      const timer = setTimeout(() => {
        if (reelsVideoRef.current && isPlaying) {
          reelsVideoRef.current.play().catch(() => {});
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentVideoIndex, reelsOpen, isPlaying, randomVideos]);

  // ========== INIT FROM PROP ==========
  useEffect(() => {
    if (post) {
      const userLiked = post.likes?.some(id => id.toString() === user?._id?.toString());
      setIsLiked(userLiked);
      setLikesCount(post.likesCount || post.likes?.length || 0);
      setCommentsCount(post.commentsCount || 0);
      setViewsCount(post.viewsCount || 0);
      setHasViewed(post.hasViewed || false);
    }
  }, [post, user]);

  // Track view
  useEffect(() => {
    if (post?._id && user && !hasViewed && post.author?._id !== user?._id) {
      postsAPI.trackView(post._id).catch(console.error);
    }
  }, [post?._id, user, hasViewed, post?.author?._id]);

  // Fetch comments when section opens
  useEffect(() => {
    if (showComments && post?._id && comments.length === 0) {
      fetchComments();
    }
  }, [showComments, post?._id]);

  // ========== VIEW TRACKING ==========
  const fetchViewers = useCallback(async () => {
    if (!post?._id) return;
    try {
      setLoadingViewers(true);
      const response = await postsAPI.getViewers(post._id);
      setViewers(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch viewers:', error);
    } finally {
      setLoadingViewers(false);
    }
  }, [post?._id]);

  const handleShowViewers = useCallback(() => {
    setShowViewers(prev => !prev);
    if (!showViewers && viewers.length === 0) fetchViewers();
  }, [showViewers, viewers.length, fetchViewers]);

  // ========== COMMENTS API ==========
  const fetchComments = useCallback(async () => {
    if (!post?._id) return;
    try {
      setLoadingComments(true);
      const response = await commentsAPI.getPostComments(post._id, 1, 20, true);
      const commentsData = response.data?.data?.comments || response.data?.comments || response.data?.data || [];
      const commentsWithState = Array.isArray(commentsData) ? commentsData.map(comment => ({
        ...comment,
        replies: comment.replies || [],
        repliesCount: comment.repliesCount || comment.replies?.length || 0,
        showReplies: false,
        repliesLoaded: false,
        isLiked: comment.isLiked || false,
        likesCount: comment.likesCount || 0,
        currentReplyPage: 1,
        hasMoreReplies: (comment.repliesCount || 0) > (comment.replies?.length || 0)
      })) : [];
      setComments(commentsWithState);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [post?._id]);

  const fetchReplies = useCallback(async (parentId, page = 1) => {
    try {
      setLoadingReplies(prev => ({ ...prev, [parentId]: true }));
      const response = await commentsAPI.getReplies(parentId, page, 10);
      const repliesData = response.data?.data || response.data?.replies || [];

      const updateCommentReplies = (comments, targetId, newReplies, currentPage) =>
        comments.map(comment => {
          if (comment._id === targetId) {
            const existingReplies = currentPage === 1 ? [] : (comment.replies || []);
            const allReplies = [...existingReplies, ...newReplies.map(reply => ({
              ...reply,
              replies: reply.replies || [],
              repliesCount: reply.repliesCount || 0,
              showReplies: false,
              repliesLoaded: false,
              isLiked: reply.isLiked || false,
              likesCount: reply.likesCount || 0,
              currentReplyPage: 1,
              hasMoreReplies: false
            }))];
            return {
              ...comment,
              replies: allReplies,
              showReplies: true,
              repliesLoaded: true,
              currentReplyPage: currentPage,
              hasMoreReplies: allReplies.length < (comment.repliesCount || 0)
            };
          }
          if (comment.replies?.length > 0) {
            return { ...comment, replies: updateCommentReplies(comment.replies, targetId, newReplies, currentPage) };
          }
          return comment;
        });

      setComments(prev => updateCommentReplies(prev, parentId, repliesData, page));
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [parentId]: false }));
      setLoadingMoreReplies(prev => ({ ...prev, [parentId]: false }));
    }
  }, []);

  const findCommentById = useCallback((items, targetId) => {
    for (const item of items) {
      if (item._id === targetId) return item;
      if (item.replies?.length > 0) {
        const found = findCommentById(item.replies, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const loadMoreReplies = useCallback(async (commentId) => {
    const comment = findCommentById(comments, commentId);
    if (!comment) return;
    const nextPage = (comment.currentReplyPage || 1) + 1;
    setLoadingMoreReplies(prev => ({ ...prev, [commentId]: true }));
    await fetchReplies(commentId, nextPage);
  }, [comments, fetchReplies, findCommentById]);

  const handleCommentSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !post?._id) return;

    setSubmittingComment(true);
    try {
      const response = await commentsAPI.createComment(post._id, commentText.trim());
      const newComment = response.data?.data || response.data;
      if (newComment) {
        setComments(prev => [{
          ...newComment,
          replies: [],
          repliesCount: 0,
          showReplies: false,
          repliesLoaded: false,
          isLiked: false,
          likesCount: 0,
          currentReplyPage: 1,
          hasMoreReplies: false
        }, ...prev]);
        setCommentText('');
        setCommentsCount(prev => prev + 1);

        if (post.author?._id !== user?._id) {
          sendPushNotification(post.author?._id, {
            title: '💬 New Comment',
            body: `${user.username} commented: ${commentText.substring(0, 50)}...`,
            type: 'comment',
            data: { url: `/posts/${post._id}`, postId: post._id }
          });
        }
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  }, [post, commentText, user, sendPushNotification]);

  const handleReplySubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !post?._id || !activeReplyForm) return;

    const { commentId, parentId } = activeReplyForm;
    const targetParentId = parentId || commentId;

    try {
      const response = await commentsAPI.createComment(post._id, replyText.trim(), targetParentId);
      const newReply = response.data?.data || response.data;

      const updateNestedReplies = (items) =>
        items.map(item => {
          if (item._id === targetParentId) {
            const updatedReplies = [{
              ...newReply,
              replies: [],
              repliesCount: 0,
              showReplies: false,
              repliesLoaded: false,
              isLiked: false,
              likesCount: 0,
              currentReplyPage: 1,
              hasMoreReplies: false
            }, ...(item.replies || [])];
            return {
              ...item,
              replies: updatedReplies,
              repliesCount: (item.repliesCount || 0) + 1,
              showReplies: true,
              repliesLoaded: true,
            };
          }
          if (item.replies?.length > 0) return { ...item, replies: updateNestedReplies(item.replies) };
          return item;
        });

      setComments(prev => updateNestedReplies(prev));
      setReplyText('');
      setActiveReplyForm(null);

      const originalComment = findCommentById(comments, targetParentId);
      if (originalComment && originalComment.author?._id !== user?._id) {
        sendPushNotification(originalComment.author?._id, {
          title: '↩️ New Reply',
          body: `${user.username} replied: ${replyText.substring(0, 50)}...`,
          type: 'reply',
          data: { url: `/posts/${post._id}`, postId: post._id, commentId: targetParentId }
        });
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
    }
  }, [post, replyText, activeReplyForm, comments, user, sendPushNotification, findCommentById]);

  const handleLikeToggle = useCallback(async () => {
    if (!post?._id || !user?._id) return;

    const newLikedState = !isLiked;
    const previousLikedState = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (newLikedState) {
        await onLike?.(post._id);
        if (post.author?._id !== user?._id) {
          sendPushNotification(post.author?._id, {
            title: '❤️ New Like',
            body: `${user.username} liked your post`,
            type: 'like',
            data: { url: `/posts/${post._id}`, postId: post._id }
          });
        }
      } else {
        await onUnlike?.(post._id);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsLiked(previousLikedState);
      setLikesCount(previousLikesCount);
    }
  }, [post, user, isLiked, likesCount, onLike, onUnlike, sendPushNotification]);

  const handleCommentLikeToggle = useCallback(async (commentId, currentlyLiked) => {
    if (!user) return;

    const previousComments = [...comments];
    const updateLikeStatus = (items) =>
      items.map(item => {
        if (item._id === commentId) {
          return {
            ...item,
            isLiked: !currentlyLiked,
            likesCount: currentlyLiked ? Math.max(0, item.likesCount - 1) : item.likesCount + 1
          };
        }
        if (item.replies?.length > 0) return { ...item, replies: updateLikeStatus(item.replies) };
        return item;
      });

    setComments(prev => updateLikeStatus(prev));

    try {
      if (currentlyLiked) {
        await commentsAPI.unlikeComment(commentId);
      } else {
        await commentsAPI.likeComment(commentId);
        const comment = findCommentById(comments, commentId);
        if (comment && comment.author?._id !== user?._id) {
          sendPushNotification(comment.author?._id, {
            title: '❤️ Comment Like',
            body: `${user.username} liked your comment`,
            type: 'comment_like',
            data: { url: `/posts/${post._id}`, postId: post._id, commentId }
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
      setComments(previousComments);
    }
  }, [user, comments, post?._id, sendPushNotification, findCommentById]);

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    const previousComments = [...comments];
    const previousCount = commentsCount;

    const deleteNestedComment = (items) =>
      items.filter(item => {
        if (item._id === commentId) return false;
        if (item.replies?.length > 0) item.replies = deleteNestedComment(item.replies);
        return true;
      });

    setComments(prev => deleteNestedComment(prev));
    setCommentsCount(prev => Math.max(0, prev - 1));

    try {
      await commentsAPI.deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      setComments(previousComments);
      setCommentsCount(previousCount);
    }
  }, [comments, commentsCount]);

  const handleDeletePost = useCallback(async () => {
    if (!post?._id || !window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postsAPI.delete(post._id);
      onDelete?.(post._id);
      if (detailModalOpen) closePostDetail();
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  }, [post, onDelete, detailModalOpen, closePostDetail]);

  const toggleReplies = useCallback((commentId) => {
    setExpandedReplies(prev => {
      const newState = { ...prev, [commentId]: !prev[commentId] };

      const findComment = (items) => {
        for (const item of items) {
          if (item._id === commentId) {
            if (!item.repliesLoaded && newState[commentId]) fetchReplies(commentId, 1);
            return true;
          }
          if (item.replies?.length > 0 && findComment(item.replies)) return true;
        }
        return false;
      };

      findComment(comments);
      return newState;
    });
  }, [comments, fetchReplies]);

  const openReplyForm = useCallback((commentId, parentId = null) => {
    setActiveReplyForm({ commentId, parentId });
    setReplyText('');
  }, []);

  const closeReplyForm = useCallback(() => {
    setActiveReplyForm(null);
    setReplyText('');
  }, []);

  // ========== RENDER COMMENT ITEM ==========
  const renderCommentItem = useCallback((comment, depth = 0) => {
    const maxDepth = 5;
    const currentDepth = depth + 1;
    const canReply = currentDepth < maxDepth;
    const isReplyFormActive = activeReplyForm?.parentId === comment._id || activeReplyForm?.commentId === comment._id;
    const isExpanded = expandedReplies[comment._id];
    const hasManyReplies = comment.repliesCount > 5;
    const displayedReplies = comment.replies || [];

    return (
      <div
        key={comment._id}
        className={`comment-item depth-${depth}`}
        style={{ marginLeft: depth > 0 ? '48px' : '0' }}
        ref={el => { if (comment._id) repliesContainerRef.current[comment._id] = el; }}
      >
        <Link to={`/profile/${comment.author?.username}`} className="comment-avatar-link">
          <img
            src={comment.author?.profilePicture || 'https://i.pravatar.cc/30'}
            alt={comment.author?.username}
            className="comment-avatar"
          />
        </Link>

        <div className="comment-content">
          <div className="comment-header">
            <Link to={`/profile/${comment.author?.username}`} className="comment-username">
              {comment.author?.username || 'User'}
              {comment.author?.verified && <Icons.BadgeCheck />}
            </Link>
            <span className="comment-time">
              <Icons.Clock />
              {moment(comment.createdAt).fromNow()}
              {comment.isEdited && ' • Edited'}
            </span>
          </div>

          <div className="comment-text">{formatContent(comment.content)}</div>

          <div className="comment-actions">
            {canReply && (
              <button
                className="comment-action reply-btn"
                onClick={() => openReplyForm(
                  depth === 0 ? comment._id : activeReplyForm?.commentId || comment._id,
                  comment._id
                )}
              >
                <Icons.Reply />
                Reply
              </button>
            )}
            <button
              className={`comment-action like-btn ${comment.isLiked ? 'active' : ''}`}
              onClick={() => handleCommentLikeToggle(comment._id, comment.isLiked)}
            >
              <Icons.Heart filled={comment.isLiked} />
              {comment.likesCount || 0}
            </button>
            {user?._id === comment.author?._id && (
              <button className="comment-action delete-btn" onClick={() => handleDeleteComment(comment._id)}>
                <Icons.Trash />
                Delete
              </button>
            )}
          </div>

          {isReplyFormActive && (
            <form onSubmit={handleReplySubmit} className="reply-form">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${comment.author?.username}...`}
                className="reply-input"
                autoFocus
              />
              <div className="reply-form-actions">
                <button type="submit" className="reply-submit-btn">
                  <Icons.Send />
                  Reply
                </button>
                <button type="button" className="reply-cancel-btn" onClick={closeReplyForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {comment.repliesCount > 0 && (
            <button className="show-replies-btn" onClick={() => toggleReplies(comment._id)}>
              {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
              {isExpanded ? 'Hide' : 'Show'} {comment.repliesCount}{comment.repliesCount === 1 ? ' reply' : ' replies'}
            </button>
          )}

          {isExpanded && (
            <div className="replies-container">
              {loadingReplies[comment._id] && !displayedReplies.length ? (
                <div className="loading-replies">
                  <div className="loading-spinner small"></div>
                  <p>Loading replies...</p>
                </div>
              ) : (
                <>
                  <div
                    className={`replies-scrollable ${hasManyReplies ? 'has-many' : ''}`}
                    style={{ maxHeight: hasManyReplies ? '400px' : 'none', overflowY: hasManyReplies ? 'auto' : 'visible' }}
                  >
                    {displayedReplies.map(reply => renderCommentItem(reply, depth + 1))}

                    {comment.hasMoreReplies && (
                      <div className="load-more-replies">
                        <button
                          className="load-more-btn"
                          onClick={() => loadMoreReplies(comment._id)}
                          disabled={loadingMoreReplies[comment._id]}
                        >
                          {loadingMoreReplies[comment._id]
                            ? <><span className="spin-icon">↻</span> Loading...</>
                            : <><Icons.ChevronDown /> Load more replies</>
                          }
                        </button>
                      </div>
                    )}
                  </div>

                  {hasManyReplies && (
                    <div className="replies-summary">
                      Showing {displayedReplies.length} of {comment.repliesCount} replies
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [activeReplyForm, expandedReplies, loadingReplies, loadingMoreReplies, user, formatContent,
    handleCommentLikeToggle, handleDeleteComment, handleReplySubmit, openReplyForm, closeReplyForm,
    toggleReplies, loadMoreReplies, replyText]);

  if (!post) return null;

  const mediaItems = post.media && Array.isArray(post.media) ? post.media : [];
  const hasLegacyImage = post.image && mediaItems.length === 0;
  const allMedia = hasLegacyImage ? [{ url: post.image, type: 'image' }] : mediaItems;

  return (
    <>
      <article className={`post-card ${isDark ? 'dark' : ''} ${isDetailView ? 'detail-view' : ''}`}>
        {/* ── Header ── */}
        <header className="post-header">
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
                <h4>
                  {post.author?.username || 'Unknown User'}
                  {post.author?.verified && <Icons.BadgeCheck />}
                </h4>
              </Link>
              <div className="post-meta">
                {post.source === 'public' && (
                  <span className="recommended-badge" title="Recommended for you">
                    <Icons.Compass /> Recommended
                  </span>
                )}
                {post.source === 'following' && (
                  <span className="following-badge" title="From someone you follow">
                    <Icons.Users /> Following
                  </span>
                )}
                <span className="post-time">
                  <Icons.Calendar />
                  {moment(post.createdAt).fromNow()}
                </span>
                {post.location?.name && (
                  <>
                    <span className="meta-separator">•</span>
                    <span className="post-location">
                      <Icons.MapPin />
                      {post.location.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="post-options">
            <button
              className="options-button"
              onClick={() => setShowOptions(!showOptions)}
              aria-label="Post options"
            >
              <Icons.Ellipsis />
            </button>
            {showOptions && (
              <div className="options-dropdown">
                {user?._id === post.author?._id && (
                  <button className="dropdown-item" onClick={handleDeletePost}>
                    <Icons.Trash />
                    Delete Post
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── Content Warning ── */}
        {post.hasContentWarning && post.contentWarning && (
          <div className="content-warning">
            <div className="warning-content">
              <Icons.Warning />
              <strong>Content Warning:</strong> {post.contentWarning}
            </div>
            <button className="show-content-btn">
              <Icons.Eye />
              Show Content
            </button>
          </div>
        )}

        {/* ── Post Content ── */}
        {post.content && (
          <div
            className="post-content formatted-content"
            onClick={!isDetailView ? openPostDetail : undefined}
            style={{ cursor: !isDetailView ? 'pointer' : 'default' }}
          >
            {formatContent(post.content)}
          </div>
        )}

        {/* ── Tags ── */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.map((tag, index) => (
              <Link key={index} to={`/tag/${tag}`} className="post-tag">
                <Icons.Hashtag />{tag}
              </Link>
            ))}
          </div>
        )}

        {/* ── Media ── */}
        {hasImage() && (
          <div className="post-media">
            {hasLegacyImage && (
              <div className="media-list media-count-1">
                <div className="media-item" onClick={() => openMediaModal({ url: post.image, type: 'image' }, 0, allMedia)}>
                  <img src={post.image} alt="Post image" className="post-image" loading="lazy" />
                </div>
              </div>
            )}

            {mediaItems.length > 0 && (
              <div className={`media-list media-count-${Math.min(mediaItems.length, 10)}`}>
                {mediaItems.slice(0, 4).map((media, index) => {
                  const isVideoFile = getMediaType(media) === 'video';
                  const isLast = index === 3 && mediaItems.length > 4;

                  return (
                    <div
                      key={index}
                      className={`media-item ${isLast ? 'more-images' : ''}`}
                      data-count={isLast ? `+${mediaItems.length - 4}` : undefined}
                      onClick={() => isVideoFile
                        ? openReelsModal(media)
                        : openMediaModal(media, index, mediaItems)
                      }
                    >
                      {isVideoFile ? (
                        <>
                          <video
                            src={getMediaUrl(media)}
                            className="post-image"
                            preload="metadata"
                            muted
                            playsInline
                            onLoadedMetadata={(e) => { e.target.currentTime = 1; }}
                          />
                          <div className="video-play-icon">
                            <Icons.Play />
                          </div>
                        </>
                      ) : (
                        <img
                          src={getMediaUrl(media)}
                          alt={media.altText || `Post media ${index + 1}`}
                          className="post-image"
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Link Preview ── */}
        {post.linkPreview && (
          <div className="link-preview">
            <a href={post.linkPreview.url} target="_blank" rel="noopener noreferrer">
              {post.linkPreview.image && <img src={post.linkPreview.image} alt="Link preview" />}
              <div className="link-info">
                <div className="link-title">🔗 {post.linkPreview.title}</div>
                <div className="link-description">{post.linkPreview.description}</div>
                <div className="link-site">
                  🌐 
                  {post.linkPreview.siteName || new URL(post.linkPreview.url).hostname}
                </div>
              </div>
            </a>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="post-stats">
          <span className="stat-item">
            <Icons.Heart filled={isLiked} />
            <span className="stat-count">{likesCount}</span>
          </span>
          <span
            className="stat-item"
            onClick={() => setShowComments(!showComments)}
            style={{ cursor: 'pointer' }}
          >
            <Icons.Comment />
            <span className="stat-count">{commentsCount}</span>
          </span>
          <span
            className={`stat-item ${post.author?._id === user?._id ? 'clickable' : ''}`}
            onClick={post.author?._id === user?._id ? handleShowViewers : undefined}
            title={post.author?._id === user?._id ? 'Click to see who viewed' : ''}
          >
            <Icons.Eye />
            <span className="stat-count">{formatViewCount(viewsCount)}</span>
            {hasViewed && post.author?._id !== user?._id && (
              <span className="viewed-badge" title="You've viewed this post">
                <Icons.Check />
              </span>
            )}
          </span>
        </div>

        {/* ── Actions Bar ── */}
        <div className="post-actions-bar">
          <button
            className={`action-button ${isLiked ? 'active' : ''}`}
            onClick={handleLikeToggle}
            disabled={!post._id}
          >
            <Icons.Heart filled={isLiked} />
            <span>{isLiked ? 'Liked' : 'Like'}</span>
          </button>
          <button
            className="action-button"
            onClick={() => setShowComments(!showComments)}
            disabled={!post._id}
          >
            <Icons.Comment />
            <span>Comment</span>
          </button>
        </div>

        {/* ── Comments Section ── */}
        {showComments && (
          <section className="comments-section">
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <div className="comment-input-container">
                <Link to={`/profile/${user?.username}`} className="comment-user-avatar-link">
                  <img
                    src={user?.profilePicture || 'https://i.pravatar.cc/30'}
                    alt={user?.username}
                    className="comment-user-avatar"
                  />
                </Link>
                <input
                  type="text"
                  placeholder="Write a comment... Use @ to mention someone"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="comment-input"
                  disabled={submittingComment}
                />
                <button
                  type="submit"
                  className="comment-submit-btn"
                  disabled={submittingComment || !commentText.trim()}
                >
                  <Icons.Send />
                  {submittingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>

            <div className="comments-list">
              {loadingComments ? (
                <div className="loading-comments">
                  <div className="loading-spinner" />
                  <p>Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                <>
                  {(showAllComments ? comments : comments.slice(0, 2)).map(c => renderCommentItem(c, 0))}
                  {comments.length > 2 && !showAllComments && (
                    <button className="show-all-comments" onClick={() => setShowAllComments(true)}>
                      <Icons.Comments />
                      Show all {comments.length} comments
                    </button>
                  )}
                </>
              ) : (
                <div className="no-comments">
                  <Icons.Comment />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </section>
        )}
      </article>

      {/* ── Media Modal ── */}
      {modalOpen && selectedMedia && (
        <div className="media-modal-overlay" onClick={handleModalOverlayClick} ref={modalRef}>
          <div className="media-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeMediaModal} aria-label="Close modal">
              <Icons.Close />
            </button>

            {mediaList.length > 1 && (
              <>
                <button className="modal-nav-btn prev" onClick={() => navigateMedia(-1)}>
                  <Icons.ChevronDown style={{transform:"rotate(90deg)"}} />
                </button>
                <button className="modal-nav-btn next" onClick={() => navigateMedia(1)}>
                  <Icons.ChevronDown style={{transform:"rotate(-90deg)"}} />
                </button>
              </>
            )}

            <div className="modal-media-wrapper">
              {getMediaType(selectedMedia) === 'video' ? (
                <video
                  ref={modalVideoRef}
                  key={getMediaUrl(selectedMedia)}
                  src={getMediaUrl(selectedMedia)}
                  className="modal-video"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img src={getMediaUrl(selectedMedia)} alt="" className="modal-image" />
              )}
            </div>

            {mediaList.length > 1 && (
              <div className="modal-counter">{selectedMediaIndex + 1} / {mediaList.length}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Reels Modal ── */}
      {reelsOpen && (
        <div
          className="reels-modal-overlay reels-enhanced"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => { if (e.target === e.currentTarget) closeReelsModal(); }}
        >
          <div className="reels-modal-content">
            <button className="reels-close-btn-enhanced" onClick={closeReelsModal} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="reels-video-container-enhanced">
              {/* Loading state */}
              {loadingVideos && randomVideos.length === 0 && (
                <div className="reels-loading-container-enhanced">
                  <div className="loading-spinner-large"></div>
                  <p>Loading reels...</p>
                </div>
              )}

              {/* Error state */}
              {reelsError && randomVideos.length === 0 && (
                <div className="reels-loading-container-enhanced">
                  <span style={{ fontSize: 36, marginBottom: 12 }}>📭</span>
                  <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '0 20px' }}>
                    {reelsError}
                  </p>
                  <button
                    onClick={() => loadVideos(1, true)}
                    style={{
                      marginTop: 16,
                      padding: '10px 24px',
                      background: 'var(--p-amber)',
                      border: 'none',
                      borderRadius: '100px',
                      color: '#000',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Video */}
              {randomVideos.length > 0 && randomVideos[currentVideoIndex] && (
                <>
                  <video
                    ref={reelsVideoRef}
                    key={randomVideos[currentVideoIndex]._id}
                    src={getVideoUrl(randomVideos[currentVideoIndex])}
                    className="reels-video-enhanced"
                    loop
                    playsInline
                    onClick={togglePlayPause}
                    autoPlay
                    muted={videoMuted}
                    onError={(e) => {
                      console.error('Video failed to load:', e);
                      // Auto-skip to next if current video errors
                      if (currentVideoIndex < randomVideos.length - 1) {
                        setTimeout(() => handleNextVideo(), 800);
                      }
                    }}
                    onLoadedData={() => {
                      setInitialVideoLoaded(true);
                      if (reelsVideoRef.current) reelsVideoRef.current.volume = videoVolume;
                      if (isPlaying) {
                        reelsVideoRef.current?.play().catch(() => setIsPlaying(false));
                      }
                    }}
                  />

                  <div className="reels-gradient-overlay"></div>

                  <div className="reels-controls-overlay-enhanced">
                    <button className="reels-play-pause-enhanced" onClick={togglePlayPause}>
                      {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                    </button>
                  </div>

                  <div className="reels-volume-control">
                    <button className="reels-volume-btn" onClick={toggleMute}>
                      {videoMuted ? <Icons.VolumeOff /> : <Icons.VolumeUp />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={videoVolume}
                      onChange={handleVolumeChange}
                      className="reels-volume-slider"
                      ref={volumeSliderRef}
                    />
                  </div>

                  <div className="reels-user-info-enhanced">
                    <Link
                      to={`/profile/${randomVideos[currentVideoIndex]?.author?.username}`}
                      className="reels-user-link"
                    >
                      <img
                        src={randomVideos[currentVideoIndex]?.author?.profilePicture || 'https://i.pravatar.cc/40'}
                        alt={randomVideos[currentVideoIndex]?.author?.username}
                        className="reels-avatar-enhanced"
                      />
                      <div className="reels-user-details-enhanced">
                        <strong>@{randomVideos[currentVideoIndex]?.author?.username}</strong>
                        <p>{randomVideos[currentVideoIndex]?.content?.substring(0, 100) || ''}</p>
                      </div>
                    </Link>
                  </div>

                  <div className="reels-actions-enhanced">
                    <button
                      className={`reels-action-btn-enhanced ${reelLiked ? 'active' : ''}`}
                      onClick={handleReelLikeToggle}
                    >
                      <Icons.Heart filled={reelLiked} />
                      <span>{reelLikesCount}</span>
                    </button>

                    <button
                      className="reels-action-btn-enhanced"
                      onClick={() => setShowReelComments(!showReelComments)}
                    >
                      <Icons.Comment />
                      <span>{randomVideos[currentVideoIndex]?.commentsCount || 0}</span>
                    </button>
                  </div>

                  {currentVideoIndex > 0 && (
                    <button className="reels-nav-btn-enhanced prev" onClick={handlePrevVideo}>
                      <Icons.ChevronUp />
                    </button>
                  )}

                  {(currentVideoIndex < randomVideos.length - 1 || hasMoreVideos) && (
                    <button className="reels-nav-btn-enhanced next" onClick={handleNextVideo}>
                      <Icons.ChevronDown />
                    </button>
                  )}

                  {loadingVideos && currentVideoIndex >= randomVideos.length - 2 && (
                    <div className="reels-loading-more-enhanced">
                      <div className="loading-spinner-small"></div>
                      <span>Loading more videos...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Comments Sidebar */}
            {showReelComments && randomVideos[currentVideoIndex] && (
              <div className="reels-comments-sidebar-enhanced">
                <div className="reels-comments-header-enhanced">
                  <h3>Comments ({randomVideos[currentVideoIndex]?.commentsCount || 0})</h3>
                  <button onClick={() => setShowReelComments(false)}>
                    <Icons.Close />
                  </button>
                </div>

                <div className="reels-comments-list-enhanced">
                  {loadingReelComments ? (
                    <div className="comments-loading">
                      <div className="loading-spinner-small"></div>
                      <p>Loading comments...</p>
                    </div>
                  ) : reelComments.length > 0 ? (
                    reelComments.map(comment => (
                      <div key={comment._id} className="reels-comment-item-enhanced">
                        <Link to={`/profile/${comment.author?.username}`} className="comment-avatar">
                          <img
                            src={comment.author?.profilePicture || 'https://i.pravatar.cc/30'}
                            alt={comment.author?.username}
                          />
                        </Link>
                        <div className="comment-content-enhanced">
                          <div className="comment-header">
                            <strong>{comment.author?.username}</strong>
                            <span className="comment-time">{moment(comment.createdAt).fromNow()}</span>
                          </div>
                          <p>{comment.content}</p>
                          <div className="comment-actions">
                            <button className="comment-like-btn">
                              <Icons.Heart filled={false} />
                              <span>{comment.likesCount || 0}</span>
                            </button>
                            <button className="comment-reply-btn">Reply</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-comments-enhanced">
                      <Icons.Comment />
                      <p>No comments yet</p>
                      <p className="hint">Be the first to comment!</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleReelCommentSubmit} className="reels-comment-form-enhanced">
                  <input
                    type="text"
                    placeholder="Add a comment... Use @ to mention"
                    value={reelCommentText}
                    onChange={(e) => setReelCommentText(e.target.value)}
                    disabled={submittingReelComment}
                  />
                  <button type="submit" disabled={!reelCommentText.trim() || submittingReelComment}>
                    <Icons.Send />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Post Detail Modal ── */}
      {detailModalOpen && (
        <div
          className="post-detail-modal-overlay"
          onClick={closePostDetail}
          ref={detailModalRef}
        >
          <div className="post-detail-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closePostDetail}>
              <Icons.Close />
            </button>
            <div className="detail-content">
              <div className="detail-post-container">
                <Post
                  post={post}
                  onLike={onLike}
                  onUnlike={onUnlike}
                  onDelete={onDelete}
                  isDark={isDark}
                  isDetailView={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Post;
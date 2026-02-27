import React, { useState, useRef, useCallback, useEffect } from 'react';
import { postsAPI } from '../../services/api';
import Cropper from 'react-easy-crop';
import ReactPlayer from 'react-player';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../contexts/AuthContext';
import './PostCreate.css';

// ─── FILTER PRESETS ───────────────────────────────────────────
const FILTER_PRESETS = [
  { id: 'none',     label: 'Original',  css: '' },
  { id: 'vivid',    label: 'Vivid',     css: 'saturate(180%) contrast(110%)' },
  { id: 'warm',     label: 'Warm',      css: 'saturate(130%) hue-rotate(-15deg) brightness(105%)' },
  { id: 'cool',     label: 'Cool',      css: 'saturate(110%) hue-rotate(20deg) brightness(102%)' },
  { id: 'fade',     label: 'Fade',      css: 'contrast(85%) saturate(70%) brightness(108%)' },
  { id: 'dramatic', label: 'Dramatic',  css: 'contrast(160%) brightness(88%) saturate(120%)' },
  { id: 'noir',     label: 'Noir',      css: 'grayscale(100%) contrast(130%) brightness(90%)' },
  { id: 'sepia',    label: 'Sepia',     css: 'sepia(85%) contrast(105%)' },
  { id: 'mist',     label: 'Mist',      css: 'brightness(115%) saturate(60%) contrast(90%)' },
];

const buildFilterString = (preset, brightness, contrast, saturation) => {
  const presetCSS = FILTER_PRESETS.find(f => f.id === preset)?.css || '';
  const adjustments = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  return presetCSS ? `${presetCSS} ${adjustments}` : adjustments;
};

// ─── FORMAT FILE SIZE HELPER ─────────────────────────────────
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

// ─── CANVAS CROP HELPER ───────────────────────────────────────
const getCroppedImg = (imageSrc, pixelCrop, rotation = 0) => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const rad    = (rotation * Math.PI) / 180;
      const sin    = Math.abs(Math.sin(rad));
      const cos    = Math.abs(Math.cos(rad));
      const bBoxW  = Math.round(image.width  * cos + image.height * sin);
      const bBoxH  = Math.round(image.width  * sin + image.height * cos);

      const rotCanvas = document.createElement('canvas');
      rotCanvas.width  = bBoxW;
      rotCanvas.height = bBoxH;
      const rotCtx = rotCanvas.getContext('2d');
      rotCtx.translate(bBoxW / 2, bBoxH / 2);
      rotCtx.rotate(rad);
      rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

      const sx = Math.max(0, Math.min(Math.round(pixelCrop.x), bBoxW - 1));
      const sy = Math.max(0, Math.min(Math.round(pixelCrop.y), bBoxH - 1));
      const sw = Math.min(Math.round(pixelCrop.width),  bBoxW - sx);
      const sh = Math.min(Math.round(pixelCrop.height), bBoxH - sy);

      if (sw <= 0 || sh <= 0) {
        rotCanvas.toBlob(blob => {
          if (!blob) return reject(new Error('Canvas toBlob returned null'));
          resolve(blob);
        }, 'image/jpeg', 0.95);
        return;
      }

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width  = sw;
      cropCanvas.height = sh;
      cropCanvas.getContext('2d').drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

      cropCanvas.toBlob(blob => {
        if (!blob) return reject(new Error('Canvas toBlob returned null'));
        resolve(blob);
      }, 'image/jpeg', 0.95);
    };

    image.onerror = (e) => reject(new Error(`Image failed to load: ${e?.message || imageSrc}`));
    image.src = imageSrc;
  });
};

// ─── EMOJI PICKER COMPONENT ───────────────────────────────────
const EmojiPickerComponent = ({ onSelect, onClose }) => {
  return (
    <div className="emoji-picker-overlay" onClick={onClose}>
      <div className="emoji-picker-container" onClick={e => e.stopPropagation()}>
        <div className="emoji-picker-header">
          <span>Choose an emoji</span>
          <button className="emoji-picker-close" onClick={onClose}>✕</button>
        </div>
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onSelect(emojiData.emoji);
            onClose();
          }}
          autoFocusSearch={false}
          theme="auto"
          searchPlaceholder="Search emojis..."
          width="100%"
          height="400px"
        />
      </div>
    </div>
  );
};

// ─── MENTIONS COMPONENT ───────────────────────────────────────
const MentionsComponent = ({ searchTerm, onSelect, onClose, position }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchTerm || searchTerm.length < 1) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        // Mock user search - replace with actual API call
        const mockUsers = [
          { username: 'johndoe', name: 'John Doe', profilePicture: 'https://i.pravatar.cc/40?u=1' },
          { username: 'janedoe', name: 'Jane Doe', profilePicture: 'https://i.pravatar.cc/40?u=2' },
          { username: 'bobsmith', name: 'Bob Smith', profilePicture: 'https://i.pravatar.cc/40?u=3' },
          { username: 'alicejohnson', name: 'Alice Johnson', profilePicture: 'https://i.pravatar.cc/40?u=4' },
          { username: 'charliebrown', name: 'Charlie Brown', profilePicture: 'https://i.pravatar.cc/40?u=5' },
        ].filter(u => 
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(u => u.username !== currentUser?.username); // Don't mention yourself

        setUsers(mockUsers);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, currentUser]);

  const handleKeyDown = (e) => {
    if (users.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSelect(users[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex]);

  const handleSelect = (user) => {
    onSelect(user);
    onClose();
  };

  if (users.length === 0 && !loading) return null;

  return (
    <div className="mentions-dropdown" style={{ top: position.top, left: position.left }}>
      {loading ? (
        <div className="mentions-loading">
          <div className="loading-spinner small"></div>
          <span>Searching users...</span>
        </div>
      ) : (
        <>
          <div className="mentions-header">
            <span>Mention someone</span>
            <button className="mentions-close" onClick={onClose}>✕</button>
          </div>
          <div className="mentions-list">
            {users.map((user, index) => (
              <div
                key={user.username}
                className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(user)}
              >
                <img src={user.profilePicture} alt={user.username} className="mention-avatar" />
                <div className="mention-info">
                  <span className="mention-username">@{user.username}</span>
                  <span className="mention-name">{user.name}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── GIF PICKER COMPONENT ────────────────────────────────────
const GifPickerComponent = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // GIPHY API configuration
  const GIPHY_API_KEY = 'SvuT7pqJk5yF9NogvNFLcjXAgZlaJiuR';
  const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

  // Search for GIFs when component mounts (initial search)
  useEffect(() => {
    searchGifs('trending');
  }, []);

  const searchGifs = async (query = 'trending') => {
    setLoading(true);
    setError('');
    try {
      let url;
      if (query === 'trending') {
        url = `${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
      } else {
        url = `${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your GIPHY API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Failed to fetch GIFs: ${response.status}`);
        }
      }
      
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Failed to fetch GIFs:', err);
      setError(err.message || 'Failed to load GIFs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    if (searchTerm.trim()) {
      searchGifs(searchTerm.trim());
    } else {
      searchGifs('trending');
    }
  };

  const handleGifSelect = (gif) => {
    // Get the original GIF URL or downsized for better performance
    const gifUrl = gif.images?.original?.url || gif.images?.downsized?.url;
    
    // Create a file-like object from the GIF URL
    fetch(gifUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch GIF');
        return res.blob();
      })
      .then(blob => {
        const file = new File([blob], `gif-${gif.id}.gif`, { type: 'image/gif' });
        onSelect(file, gifUrl, gif);
      })
      .catch(err => {
        console.error('Failed to fetch GIF:', err);
        setError('Failed to load GIF. Please try another one.');
      });
  };

  return (
    <div className="gif-picker-overlay" onClick={onClose}>
      <div className="gif-picker-container" onClick={e => e.stopPropagation()}>
        <div className="gif-picker-header">
          <h3>Choose a GIF</h3>
          <button 
            type="button" 
            className="gif-picker-close" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="gif-search-form">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (searchTerm.trim()) {
                  searchGifs(searchTerm.trim());
                }
              }
            }}
            placeholder="Search for GIFs..."
            className="gif-search-input"
          />
          <button 
            type="button" 
            className="gif-search-btn"
            onClick={handleSearch}
          >
            <span>🔍</span>
          </button>
        </div>

        {error && <div className="gif-error">{error}</div>}

        {loading ? (
          <div className="gif-loading">
            <div className="loading-spinner"></div>
            <p>Loading GIFs...</p>
          </div>
        ) : (
          <div className="gif-grid">
            {gifs.map(gif => (
              <div
                key={gif.id}
                className="gif-item"
                onClick={() => handleGifSelect(gif)}
              >
                <img
                  src={gif.images?.fixed_height_small?.url || gif.images?.fixed_width?.url}
                  alt={gif.title || 'GIF'}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {gifs.length === 0 && !loading && !error && (
          <div className="gif-no-results">
            <p>No GIFs found. Try a different search!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── LINK PREVIEW COMPONENT ───────────────────────────────────
const LinkPreview = ({ url, onRemove }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        // Mock link preview - replace with actual API call
        const mockPreview = {
          title: url.replace(/^https?:\/\//, '').split('/')[0],
          description: 'Click to visit link',
          image: `https://www.google.com/s2/favicons?domain=${url}&sz=128`,
          siteName: new URL(url).hostname
        };
        setPreview(mockPreview);
      } catch (err) {
        console.error('Failed to fetch link preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchPreview();
    }
  }, [url]);

  if (loading) {
    return (
      <div className="link-preview loading">
        <div className="loading-spinner small"></div>
        <span>Loading preview...</span>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="link-preview error">
        <span>Could not load preview for {url}</span>
        <button onClick={onRemove} className="link-remove">✕</button>
      </div>
    );
  }

  return (
    <div className="link-preview">
      <img src={preview.image} alt="" className="link-favicon" />
      <div className="link-info">
        <div className="link-title">{preview.title}</div>
        <div className="link-description">{preview.description}</div>
        <div className="link-site">{preview.siteName}</div>
      </div>
      <button onClick={onRemove} className="link-remove">✕</button>
    </div>
  );
};

// ─── EDITOR PANEL ─────────────────────────────────────────────
const MediaEditor = ({ item, onApply, onCancel }) => {
  const isVideo = item.type.startsWith('video/');
  const [activeTab, setActiveTab] = useState(isVideo ? 'trim' : 'crop');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(item.edits?.rotation || 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(item.edits?.filter || 'none');
  const [brightness, setBrightness] = useState(item.edits?.brightness || 100);
  const [contrast, setContrast]     = useState(item.edits?.contrast   || 100);
  const [saturation, setSaturation] = useState(item.edits?.saturation || 100);
  const [trimStart, setTrimStart] = useState(item.edits?.trim?.start || 0);
  const [trimEnd, setTrimEnd]     = useState(item.edits?.trim?.end   || 0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [applying, setApplying] = useState(false);
  const playerRef = useRef(null);

  const liveFilter = buildFilterString(selectedFilter, brightness, contrast, saturation);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      if (isVideo) {
        onApply({
          ...item,
          edits: { ...item.edits, trim: { start: trimStart, end: trimEnd } }
        });
        return;
      }

      let baseBlob;
      if (croppedAreaPixels &&
          (croppedAreaPixels.width > 0) &&
          (croppedAreaPixels.height > 0)) {
        baseBlob = await getCroppedImg(item.preview, croppedAreaPixels, rotation);
      } else {
        baseBlob = await fetch(item.preview).then(r => r.blob());
      }

      const tempUrl = URL.createObjectURL(baseBlob);
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload  = () => res(i);
        i.onerror = rej;
        i.src = tempUrl;
      });
      URL.revokeObjectURL(tempUrl);

      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  || img.width;
      canvas.height = img.naturalHeight || img.height;

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Decoded image has zero dimensions');
      }

      const ctx = canvas.getContext('2d');
      const filterString = liveFilter.trim();
      if (filterString && filterString !== 'brightness(100%) contrast(100%) saturate(100%)') {
        ctx.filter = filterString;
      }
      ctx.drawImage(img, 0, 0);

      const finalBlob = await new Promise((res, rej) => {
        canvas.toBlob(blob => {
          if (!blob) {
            rej(new Error('canvas.toBlob() returned null'));
          } else {
            res(blob);
          }
        }, 'image/jpeg', 0.95);
      });

      const editedFile    = new File([finalBlob], item.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      const editedPreview = URL.createObjectURL(finalBlob);

      onApply({
        ...item,
        editedFile,
        editedPreview,
        edits: {
          filter:     selectedFilter,
          brightness,
          contrast,
          saturation,
          rotation,
          crop: croppedAreaPixels ?? null,
        }
      });
    } catch (err) {
      console.error('[MediaEditor] handleApply failed:', err);
      alert(`Could not apply edits: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const ASPECT_OPTIONS = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:5', value: 4 / 5 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
  ];

  return (
    <div className="editor-overlay" onClick={onCancel}>
      <div className="editor-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="editor-header">
          <span className="editor-title">
            {isVideo ? '▶ Edit Video' : '✦ Edit Photo'}
          </span>
          <button className="editor-close" onClick={onCancel}>✕</button>
        </div>

        {/* Tab bar */}
        {!isVideo && (
          <div className="editor-tabs">
            {['crop', 'filter', 'adjust'].map(tab => (
              <button
                key={tab}
                className={`editor-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'crop' && '⊡ Crop'}
                {tab === 'filter' && '◈ Filter'}
                {tab === 'adjust' && '⧗ Adjust'}
              </button>
            ))}
          </div>
        )}

        {/* Canvas / Preview */}
        <div className="editor-canvas-area">
          {isVideo ? (
            <div className="video-preview-wrapper">
              <ReactPlayer
                ref={playerRef}
                url={item.preview}
                controls
                width="100%"
                height="100%"
                onDuration={d => { setVideoDuration(d); if (!trimEnd) setTrimEnd(d); }}
              />
            </div>
          ) : (
            <div
              className="crop-canvas-wrapper"
              style={{ filter: liveFilter }}
            >
              <Cropper
                image={item.preview}
                crop={crop}
                zoom={zoom}
                rotation={activeTab === 'crop' ? rotation : 0}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="editor-controls">
          {/* ─ CROP TAB ─ */}
          {activeTab === 'crop' && !isVideo && (
            <div className="controls-section">
              <div className="control-row">
                <span className="control-label">Aspect</span>
                <div className="aspect-pills">
                  {ASPECT_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      className={`aspect-pill ${aspectRatio === opt.value ? 'active' : ''}`}
                      onClick={() => setAspectRatio(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="control-row">
                <span className="control-label">Zoom</span>
                <input type="range" min={1} max={3} step={0.01} value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))} className="range-input" />
                <span className="range-value">{zoom.toFixed(1)}×</span>
              </div>
              <div className="control-row">
                <span className="control-label">Rotate</span>
                <input type="range" min={-180} max={180} step={1} value={rotation}
                  onChange={e => setRotation(parseInt(e.target.value))} className="range-input" />
                <span className="range-value">{rotation}°</span>
              </div>
              <button className="reset-btn" onClick={() => { setRotation(0); setZoom(1); setCrop({ x: 0, y: 0 }); }}>
                Reset
              </button>
            </div>
          )}

          {/* ─ FILTER TAB ─ */}
          {activeTab === 'filter' && !isVideo && (
            <div className="filters-grid">
              {FILTER_PRESETS.map(f => (
                <button
                  key={f.id}
                  className={`filter-chip ${selectedFilter === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(f.id)}
                >
                  <div
                    className="filter-thumb"
                    style={{
                      backgroundImage: `url(${item.preview})`,
                      filter: f.css || 'none'
                    }}
                  />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ─ ADJUST TAB ─ */}
          {activeTab === 'adjust' && !isVideo && (
            <div className="controls-section">
              {[
                { label: 'Brightness', value: brightness, set: setBrightness, min: 0, max: 200 },
                { label: 'Contrast',   value: contrast,   set: setContrast,   min: 0, max: 200 },
                { label: 'Saturation', value: saturation, set: setSaturation, min: 0, max: 200 },
              ].map(ctrl => (
                <div className="control-row" key={ctrl.label}>
                  <span className="control-label">{ctrl.label}</span>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={1} value={ctrl.value}
                    onChange={e => ctrl.set(parseInt(e.target.value))} className="range-input" />
                  <span className="range-value">{ctrl.value}%</span>
                </div>
              ))}
              <button className="reset-btn"
                onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}>
                Reset
              </button>
            </div>
          )}

          {/* ─ VIDEO TRIM ─ */}
          {isVideo && (
            <div className="controls-section">
              <div className="control-row">
                <span className="control-label">Start</span>
                <input type="range" min={0} max={videoDuration} step={0.1} value={trimStart}
                  onChange={e => setTrimStart(parseFloat(e.target.value))} className="range-input" />
                <span className="range-value">{trimStart.toFixed(1)}s</span>
              </div>
              <div className="control-row">
                <span className="control-label">End</span>
                <input type="range" min={0} max={videoDuration} step={0.1} value={trimEnd}
                  onChange={e => setTrimEnd(parseFloat(e.target.value))} className="range-input" />
                <span className="range-value">{trimEnd.toFixed(1)}s</span>
              </div>
              <div className="trim-duration-info">
                Duration: <strong>{(trimEnd - trimStart).toFixed(1)}s</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <button className="editor-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="editor-btn-apply" onClick={handleApply} disabled={applying}>
            {applying ? <span className="apply-spinner" /> : null}
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────
const PostCreate = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [sizeWarning, setSizeWarning] = useState('');

  // Links and mentions
  const [links, setLinks] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  
  // Emoji and GIF pickers
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB in bytes
  const MAX_FILES = 10;

  const canSubmit = content.trim() || media.length > 0;

  // Calculate total media size
  const calculateTotalSize = () => {
    return media.reduce((total, item) => {
      const fileSize = item.editedFile?.size || item.file?.size || 0;
      return total + fileSize;
    }, 0);
  };

  const totalSize = calculateTotalSize();
  const sizePercentage = Math.min((totalSize / MAX_TOTAL_SIZE) * 100, 100);
  const isNearLimit = totalSize > MAX_TOTAL_SIZE * 0.9; // 90% of limit
  const isOverLimit = totalSize > MAX_TOTAL_SIZE;

  // Update size warning when media changes
  useEffect(() => {
    if (totalSize > MAX_TOTAL_SIZE) {
      setSizeWarning(`Total size (${formatFileSize(totalSize)}) exceeds 50MB limit. Please remove some files.`);
    } else if (totalSize > MAX_TOTAL_SIZE * 0.8) {
      setSizeWarning(`Approaching storage limit: ${formatFileSize(totalSize)} / 50MB used`);
    } else {
      setSizeWarning('');
    }
  }, [totalSize]);

  // Extract links from content
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const foundLinks = content.match(urlRegex) || [];
    setLinks(foundLinks);
  }, [content]);

  // Handle mentions
  useEffect(() => {
    const handleMentionDetection = () => {
      const text = content;
      const cursorPos = cursorPosition;
      
      // Find if we're typing a mention
      const beforeCursor = text.substring(0, cursorPos);
      const mentionMatch = beforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        const searchTerm = mentionMatch[1];
        setMentionSearch(searchTerm);
        
        // Calculate position for mentions dropdown
        if (textareaRef.current) {
          const { offsetTop, offsetLeft } = getCaretCoordinates();
          setMentionPosition({
            top: offsetTop + 20,
            left: offsetLeft
          });
        }
        
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    };

    handleMentionDetection();
  }, [content, cursorPosition]);

  // Helper to get caret coordinates
  const getCaretCoordinates = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { offsetTop: 0, offsetLeft: 0 };

    const { selectionStart } = textarea;
    const text = textarea.value;
    
    // Create a mirror div to calculate position
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    mirror.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      font-weight: ${style.fontWeight};
      letter-spacing: ${style.letterSpacing};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      border: ${style.border};
      width: ${textarea.offsetWidth}px;
    `;
    
    mirror.textContent = text.substring(0, selectionStart);
    document.body.appendChild(mirror);
    
    const coordinates = {
      offsetTop: mirror.offsetHeight,
      offsetLeft: mirror.offsetWidth
    };
    
    document.body.removeChild(mirror);
    return coordinates;
  };

  const processFiles = (files) => {
    const valid = Array.from(files).filter(f => {
      const ok = f.type.startsWith('image/') || f.type.startsWith('video/');
      if (!ok) {
        setError(`File "${f.name}" is not a supported image or video format.`);
      }
      return ok;
    });

    if (media.length + valid.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }

    // Check if adding these files would exceed size limit
    const newTotalSize = totalSize + valid.reduce((sum, f) => sum + f.size, 0);
    if (newTotalSize > MAX_TOTAL_SIZE) {
      setError(`Total file size would exceed 50MB limit. Current: ${formatFileSize(totalSize)}, Adding: ${formatFileSize(valid.reduce((sum, f) => sum + f.size, 0))}`);
      return;
    }

    const newMedia = valid.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      editedPreview: null,
      editedFile: null,
      name: file.name,
      type: file.type,
      size: file.size,
      edits: { filter: 'none', brightness: 100, contrast: 100, saturation: 100, rotation: 0, crop: null, trim: null }
    }));
    
    setMedia(prev => [...prev, ...newMedia]);
    setError('');
  };

  const handleFileInput = e => processFiles(e.target.files);

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const removeMedia = index => {
    setMedia(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      if (copy[index].editedPreview) URL.revokeObjectURL(copy[index].editedPreview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleEditorApply = updatedItem => {
    setMedia(prev => {
      const copy = [...prev];
      if (copy[editingIndex].editedPreview) URL.revokeObjectURL(copy[editingIndex].editedPreview);
      copy[editingIndex] = updatedItem;
      return copy;
    });
    setEditingIndex(null);
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = cursorPosition;
    const end = cursorPosition;
    const newContent = content.substring(0, start) + emoji + content.substring(end);
    
    setContent(newContent);
    
    // Set cursor position after the inserted emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeCursor = content.substring(0, cursorPosition);
    const mentionStart = beforeCursor.lastIndexOf('@');
    
    const newContent = 
      content.substring(0, mentionStart) + 
      `@${user.username} ` + 
      content.substring(cursorPosition);
    
    setContent(newContent);
    setMentions(prev => [...prev, user]);
    setShowMentions(false);
    
    // Set cursor after the mention
    setTimeout(() => {
      textarea.focus();
      const newPosition = mentionStart + user.username.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 10);
  };

  // Handle GIF selection
  const handleGifSelect = (file, gifUrl, gifData) => {
    // Add GIF as media
    if (media.length >= MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }

    // Check size limit
    if (totalSize + file.size > MAX_TOTAL_SIZE) {
      setError(`Adding this GIF would exceed 50MB limit. Current: ${formatFileSize(totalSize)}, GIF: ${formatFileSize(file.size)}`);
      return;
    }

    const newGifMedia = {
      file,
      preview: gifUrl,
      editedPreview: null,
      editedFile: null,
      name: `gif-${gifData.id}.gif`,
      type: 'image/gif',
      size: file.size,
      isGif: true,
      gifData: gifData,
      edits: { filter: 'none', brightness: 100, contrast: 100, saturation: 100, rotation: 0, crop: null }
    };

    setMedia(prev => [...prev, newGifMedia]);
    setShowGifPicker(false);
    setError('');
  };

  // Remove link from preview
  const removeLink = (linkToRemove) => {
    const newContent = content.replace(linkToRemove, '').replace(/\s+/g, ' ').trim();
    setContent(newContent);
  };

  const clearAll = () => {
    media.forEach(m => { 
      URL.revokeObjectURL(m.preview); 
      if (m.editedPreview) URL.revokeObjectURL(m.editedPreview); 
    });
    setContent(''); 
    setTags([]); 
    setTagInput(''); 
    setVisibility('public');
    setMedia([]); 
    setError('');
    setSizeWarning('');
    setUploadProgress(0);
    setMentions([]);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!canSubmit) { 
      setError('Add some text or at least one photo/video.'); 
      return; 
    }
    
    // Final size check
    if (totalSize > MAX_TOTAL_SIZE) {
      setError(`Total media size (${formatFileSize(totalSize)}) exceeds 50MB limit. Please remove some files.`);
      return;
    }

    setLoading(true); 
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content);
      formData.append('visibility', visibility);
      if (tags.length) formData.append('tags', tags.join(','));
      
      // Add mentions as metadata
      if (mentions.length) {
        formData.append('mentions', JSON.stringify(mentions.map(m => m.username)));
      }
      
      const mediaEdits = [];
      for (const item of media) {
        formData.append('media', item.editedFile || item.file);
        mediaEdits.push(item.edits || null);
      }
      if (media.length) formData.append('mediaEdits', JSON.stringify(mediaEdits));
      
      // Simulate upload progress (in real app, you'd use axios progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      const response = await postsAPI.create(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        if (response.data.success) {
          onPostCreated?.(response.data.data);
          clearAll();
        }
      }, 500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish. Try again.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const VISIBILITY_OPTIONS = [
    { value: 'public',    icon: '🌐', label: 'Public',         desc: 'Everyone' },
    { value: 'followers', icon: '👥', label: 'Followers',      desc: 'Your followers' },
  ];

  // Render content with highlighted mentions and links
  const renderContentPreview = () => {
    if (!content) return null;

    const parts = [];
    let lastIndex = 0;
    
    // Match both mentions and links
    const combinedRegex = /(@\w+)|(https?:\/\/[^\s]+)/g;
    let match;
    
    while ((match = combinedRegex.exec(content)) !== null) {
      const [fullMatch] = match;
      const index = match.index;
      
      // Add text before the match
      if (index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, index)}
          </span>
        );
      }
      
      // Add the matched entity with appropriate styling
      if (fullMatch.startsWith('@')) {
        parts.push(
          <span key={`mention-${index}`} className="content-mention">
            {fullMatch}
          </span>
        );
      } else {
        parts.push(
          <a 
            key={`link-${index}`} 
            href={fullMatch} 
            target="_blank" 
            rel="noopener noreferrer"
            className="content-link"
          >
            {fullMatch}
          </a>
        );
      }
      
      lastIndex = index + fullMatch.length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    return <div className="content-preview">{parts}</div>;
  };

  return (
    <div className="pc-root">
      <div className="pc-card">

        {/* ── HEADER ── */}
        <div className="pc-header">
          <div className="pc-header-mark">✦</div>
          <div>
            <h2 className="pc-title">New Post</h2>
            <p className="pc-subtitle">Text, GIFs, emojis, photos, or video — your story.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pc-form">

          {/* ── TEXT AREA WITH EMOJI/GIF BUTTONS ── */}
          <div className="pc-field">
            <div className="textarea-toolbar">
              <button
                type="button"
                className="toolbar-btn emoji-btn"
                onClick={() => {
                  if (textareaRef.current) {
                    setCursorPosition(textareaRef.current.selectionStart);
                  }
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                title="Add emoji"
              >
                <span>😊</span>
              </button>
              <button
                type="button"
                className="toolbar-btn gif-btn"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                title="Add GIF"
              >
                <span>GIF</span>
              </button>
            </div>
            
            <textarea
              ref={textareaRef}
              className="pc-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              onSelect={(e) => setCursorPosition(e.target.selectionStart)}
              onClick={(e) => setCursorPosition(e.target.selectionStart)}
              onKeyUp={(e) => setCursorPosition(e.target.selectionStart)}
              placeholder="What's on your mind… Use @ to mention someone, paste links to share URLs"
              rows={4}
              maxLength={5000}
              disabled={loading}
            />
            <div className="pc-char-row">
              <span className="pc-char-count" style={{ opacity: content.length > 4000 ? 1 : 0.35 }}>
                {content.length}/5000
              </span>
            </div>

            {/* Content Preview with highlighted mentions/links */}
            {content && renderContentPreview()}

            {/* Mentions Dropdown */}
            {showMentions && (
              <MentionsComponent
                searchTerm={mentionSearch}
                onSelect={handleMentionSelect}
                onClose={() => setShowMentions(false)}
                position={mentionPosition}
              />
            )}

            {/* Link Previews */}
            {links.length > 0 && (
              <div className="link-previews">
                {links.map((link, index) => (
                  <LinkPreview
                    key={`${link}-${index}`}
                    url={link}
                    onRemove={() => removeLink(link)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Emoji Picker Modal */}
          {showEmojiPicker && (
            <EmojiPickerComponent
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}

          {/* GIF Picker Modal */}
          {showGifPicker && (
            <GifPickerComponent
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          )}

          {/* ── MEDIA DROP ZONE ── */}
          <div
            className={`pc-dropzone ${dragOver ? 'drag-over' : ''} ${media.length > 0 ? 'has-media' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => media.length < MAX_FILES && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={handleFileInput}
              disabled={loading || media.length >= MAX_FILES}
            />

            {media.length === 0 ? (
              <div className="pc-drop-prompt">
                <div className="pc-drop-icon">⊕</div>
                <span className="pc-drop-label">Drop photos &amp; videos here</span>
                <span className="pc-drop-hint">or click to browse · max 10 files, 50MB total</span>
              </div>
            ) : (
              <>
                <div className="pc-media-grid" onClick={e => e.stopPropagation()}>
                  {media.map((item, idx) => {
                    const isVid = item.type.startsWith('video/');
                    const isGif = item.type === 'image/gif' || item.isGif;
                    const displaySrc = item.editedPreview || item.preview;
                    
                    return (
                      <div key={idx} className={`pc-media-item ${item.editedFile ? 'edited' : ''} ${isGif ? 'gif-item' : ''}`}>
                        {isVid ? (
                          <video src={item.preview} className="pc-media-thumb" muted playsInline />
                        ) : (
                          <img src={displaySrc} alt={item.name} className="pc-media-thumb" />
                        )}
                        {isVid && <div className="pc-video-badge">▶</div>}
                        {isGif && <div className="pc-gif-badge">GIF</div>}
                        {item.editedFile && <div className="pc-edited-badge">✓</div>}
                        <div className="pc-media-actions">
                          {!isGif && (
                            <button type="button" className="pc-media-btn edit"
                              onClick={() => setEditingIndex(idx)} title="Edit">
                              ✎
                            </button>
                          )}
                          <button type="button" className="pc-media-btn remove"
                            onClick={() => removeMedia(idx)} title="Remove">
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {media.length < MAX_FILES && (
                    <button
                      type="button"
                      className="pc-add-more"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span>＋</span>
                    </button>
                  )}
                </div>

                {/* Storage Usage Bar */}
                {media.length > 0 && (
                  <div className="storage-usage-container">
                    <div className="storage-usage-header">
                      <span className="storage-label">
                        <span className="storage-icon">💾</span> Storage Used
                      </span>
                      <span className={`storage-value ${isNearLimit ? 'warning' : ''} ${isOverLimit ? 'error' : ''}`}>
                        {formatFileSize(totalSize)} / 50MB
                      </span>
                    </div>
                    <div className="storage-bar">
                      <div 
                        className={`storage-fill ${isNearLimit ? 'warning' : ''} ${isOverLimit ? 'error' : ''}`}
                        style={{ width: `${sizePercentage}%` }}
                      />
                    </div>
                    {sizeWarning && (
                      <div className={`storage-warning ${isOverLimit ? 'error' : ''}`}>
                        ⚠️ {sizeWarning}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── VISIBILITY ── */}
          <div className="pc-field pc-field-row">
            <span className="pc-field-label">Audience</span>
            <div className="pc-vis-group">
              {VISIBILITY_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`pc-vis-option ${visibility === opt.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={e => setVisibility(e.target.value)}
                    disabled={loading}
                  />
                  <span className="pc-vis-icon">{opt.icon}</span>
                  <span className="pc-vis-label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── TAGS ── */}
          <div className="pc-field">
            <div className="pc-tags-input-row">
              <span className="pc-tags-hash">#</span>
              <input
                className="pc-tags-input"
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag and press Enter"
                disabled={loading || tags.length >= 10}
              />
              <button type="button" className="pc-tags-add-btn" onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 10}>
                Add
              </button>
              <span className="pc-tags-count">{tags.length}/10</span>
            </div>
            {tags.length > 0 && (
              <div className="pc-tags-list">
                {tags.map((tag, i) => (
                  <span key={i} className="pc-tag">
                    #{tag}
                    <button type="button" className="pc-tag-remove" onClick={() => {
                      setTags(prev => prev.filter((_, j) => j !== i));
                    }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── UPLOAD PROGRESS ── */}
          {loading && uploadProgress > 0 && (
            <div className="upload-progress-container">
              <div className="upload-progress-header">
                <span className="upload-label">Uploading post...</span>
                <span className="upload-percentage">{uploadProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div 
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {uploadProgress < 100 && (
                <p className="upload-hint">
                  Please don't close this window while uploading
                </p>
              )}
            </div>
          )}

          {/* ── ERROR ── */}
          {error && (
            <div className="pc-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div className="pc-actions">
            <button type="button" className="pc-btn-clear" onClick={clearAll} disabled={loading}>
              Clear
            </button>
            <button
              type="submit"
              className={`pc-btn-publish ${loading ? 'loading' : ''}`}
              disabled={loading || !canSubmit || isOverLimit}
            >
              {loading ? (
                <>
                  <span className="pc-spinner" />
                  Uploading {uploadProgress > 0 ? `${uploadProgress}%` : '...'}
                </>
              ) : (
                'Publish Post'
              )}
            </button>
          </div>

        </form>
      </div>

      {/* ── EDITOR MODAL ── */}
      {editingIndex !== null && media[editingIndex] && (
        <MediaEditor
          item={media[editingIndex]}
          onApply={handleEditorApply}
          onCancel={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
};

export default PostCreate;
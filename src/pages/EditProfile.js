// pages/EditProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './EditProfile.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    profilePicture: '',
    coverPicture: '',
    privacySettings: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowTags: true,
      allowMessagesFrom: 'everyone'
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || '',
        coverPicture: user.coverPicture || '',
        privacySettings: user.privacySettings || {
          profileVisibility: 'public',
          showOnlineStatus: true,
          allowTags: true,
          allowMessagesFrom: 'everyone'
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('privacySettings.')) {
      const settingName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        privacySettings: {
          ...prev.privacySettings,
          [settingName]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateProfile(formData);
      
      if (response.data.user) {
        updateUser(response.data.user);
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          navigate(`/profile/${response.data.user.username}`);
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // In production, upload to Cloudinary/CDN first
    // For demo, we'll just show a local URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        [field]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="edit-profile-container">
      <div className="card">
        <div className="page-header">
          <h2>Edit Profile</h2>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/profile/${user?.username}`)}
          >
            Cancel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Profile Picture */}
          <div className="form-group image-upload-group">
            <label>Profile Picture</label>
            <div className="image-preview-container">
              <img
                src={formData.profilePicture || 'https://i.pravatar.cc/150'}
                alt="Profile"
                className="profile-preview"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'profilePicture')}
                className="image-upload-input"
                id="profile-picture-upload"
              />
              <label htmlFor="profile-picture-upload" className="upload-btn">
                Change Photo
              </label>
            </div>
          </div>

          {/* Cover Picture */}
          <div className="form-group image-upload-group">
            <label>Cover Picture</label>
            <div className="image-preview-container">
              <img
                src={formData.coverPicture || 'https://via.placeholder.com/800x200'}
                alt="Cover"
                className="cover-preview"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'coverPicture')}
                className="image-upload-input"
                id="cover-picture-upload"
              />
              <label htmlFor="cover-picture-upload" className="upload-btn">
                Change Cover
              </label>
            </div>
          </div>

          {/* Basic Info */}
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              maxLength="50"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              maxLength="30"
            />
            <small className="form-help">
              This will change your profile URL
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              maxLength="500"
              rows="4"
            />
            <small className="form-help">
              {formData.bio.length}/500 characters
            </small>
          </div>

          {/* Privacy Settings */}
          <div className="privacy-section">
            <h3>Privacy Settings</h3>
            
            <div className="form-group">
              <label htmlFor="profileVisibility">Profile Visibility</label>
              <select
                id="profileVisibility"
                name="privacySettings.profileVisibility"
                value={formData.privacySettings.profileVisibility}
                onChange={handleChange}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="followers_only">Followers Only</option>
              </select>
            </div>

            <div className="form-checkbox-group">
              <input
                type="checkbox"
                id="showOnlineStatus"
                name="privacySettings.showOnlineStatus"
                checked={formData.privacySettings.showOnlineStatus}
                onChange={handleChange}
              />
              <label htmlFor="showOnlineStatus">Show online status</label>
            </div>

            <div className="form-checkbox-group">
              <input
                type="checkbox"
                id="allowTags"
                name="privacySettings.allowTags"
                checked={formData.privacySettings.allowTags}
                onChange={handleChange}
              />
              <label htmlFor="allowTags">Allow others to tag me</label>
            </div>

            <div className="form-group">
              <label htmlFor="allowMessagesFrom">Who can message me</label>
              <select
                id="allowMessagesFrom"
                name="privacySettings.allowMessagesFrom"
                value={formData.privacySettings.allowMessagesFrom}
                onChange={handleChange}
              >
                <option value="everyone">Everyone</option>
                <option value="followers_only">Followers Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
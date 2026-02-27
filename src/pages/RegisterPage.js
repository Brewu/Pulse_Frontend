import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './RegisterPage.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showRequirements, setShowRequirements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({});
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showDeclineMessage, setShowDeclineMessage] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Show terms modal on component mount (only once per session)
  useEffect(() => {
    const hasSeenTerms = sessionStorage.getItem('hasSeenTerms');
    if (!hasSeenTerms) {
      setShowTermsModal(true);
      sessionStorage.setItem('hasSeenTerms', 'true');
    }
  }, []);

  // Password requirements check
  const passwordRequirements = {
    minLength: formData.password.length >= 8,
    hasNumber: /\d/.test(formData.password),
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const calculatePasswordStrength = () => {
    const requirements = Object.values(passwordRequirements);
    const metCount = requirements.filter(Boolean).length;
    return (metCount / requirements.length) * 100;
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate username format
  const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  // Validate form fields
  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'username':
        if (!value) error = 'Username is required';
        else if (!isValidUsername(value))
          error = 'Username must be 3-20 characters and can only contain letters, numbers, and underscores';
        break;
      case 'email':
        if (!value) error = 'Email is required';
        else if (!isValidEmail(value)) error = 'Please enter a valid email address';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (value.length < 8) error = 'Password must be at least 8 characters';
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field on change
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength());
      // Also validate confirm password if it exists
      if (formData.confirmPassword) {
        const confirmError = validateField('confirmPassword', formData.confirmPassword);
        setErrors(prev => ({
          ...prev,
          confirmPassword: confirmError
        }));
      }
    }

    if (name === 'confirmPassword') {
      const error = validateField('confirmPassword', value);
      setErrors(prev => ({
        ...prev,
        confirmPassword: error
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const getStrengthColor = () => {
    if (passwordStrength < 40) return '#ef4444';
    if (passwordStrength < 70) return '#f59e0b';
    return '#10b981';
  };

  const getStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    setShowDeclineMessage(false);
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setShowDeclineMessage(true);
    
    // Show decline message for 3 seconds then close the app/tab
    setTimeout(() => {
      // Try to close the window
      window.close();
      
      // If window.close() is blocked (common in modern browsers),
      // show a message and redirect to a blank page
      if (!window.closed) {
        document.body.innerHTML = `
          <div style="
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              background: white;
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              max-width: 400px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
              <div style="font-size: 64px; margin-bottom: 20px;">👋</div>
              <h2 style="color: #333; margin-bottom: 16px;">You've declined the terms</h2>
              <p style="color: #666; margin-bottom: 24px; line-height: 1.6;">
                Since you didn't accept our terms and conditions, you can't create an account. 
                This tab will now close automatically.
              </p>
              <button 
                onclick="window.close()"
                style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 30px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s ease;
                "
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'"
              >
                Close Tab
              </button>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                If the tab doesn't close, please close it manually.
              </p>
            </div>
          </div>
        `;
      }
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    // Check if there are any errors
    if (Object.values(newErrors).some(error => error)) {
      return;
    }

    // Check password strength
    if (passwordStrength < 40) {
      alert('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        name: formData.username.trim() // Use username as display name initially
      };

      await register(userData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        general: error.response?.data?.message || 'Registration failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // If user declined, show the decline message overlay
  if (showDeclineMessage) {
    return (
      <div className="decline-overlay">
        <div className="decline-message">
          <div className="decline-emoji">👋</div>
          <h2>You've declined the terms</h2>
          <p>
            Since you didn't accept our terms and conditions, you can't create an account. 
            This tab will close automatically in a few seconds.
          </p>
          <div className="decline-timer">
            <div className="timer-spinner"></div>
            <span>Closing application...</span>
          </div>
          <button 
            className="decline-close-btn"
            onClick={() => window.close()}
          >
            Close Now
          </button>
          <p className="decline-note">
            If the tab doesn't close, please close it manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="terms-modal-overlay">
          <div className="terms-modal">
            <div className="terms-modal-header">
              <span className="terms-modal-icon">📋</span>
              <h3>Terms & Conditions</h3>
            </div>
            
            <div className="terms-modal-content">
              <div className="terms-section">
                <h4>📸 Media Storage Policy</h4>
                <p>
                  To ensure optimal performance and manage storage costs effectively, 
                  <strong> monthly post deletion may apply</strong> for inactive or older content.
                </p>
              </div>

          

              <div className="terms-section">
                <h4>💾 Why We Do This:</h4>
                <p>
                  As a growing community platform, we need to manage our storage resources 
                  wisely. This policy helps us maintain fast performance and keep the service 
                  free for everyone while we scale our infrastructure.
                </p>
              </div>

              <div className="terms-section highlight">
                <h4>✅ Your Rights:</h4>
                <p>
                  You can export your data at any time. We'll provide a 7-day grace period 
                  before any deletion, and you can always request restoration of your content 
                  by contacting support.
                </p>
              </div>

              <div className="terms-section warning">
                <h4>⚠️ Important:</h4>
                <p>
                  By declining these terms, you will not be able to create an account. 
                  The app will close automatically if you decline.
                </p>
              </div>
            </div>

            <div className="terms-modal-footer">
              <button 
                className="terms-decline-btn"
                onClick={handleDeclineTerms}
              >
                Decline & Exit
              </button>
              <button 
                className="terms-accept-btn"
                onClick={handleAcceptTerms}
              >
                I Understand & Accept
              </button>
            </div>

            <button 
              className="terms-modal-close"
              onClick={handleDeclineTerms}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={`auth-box ${success ? 'success' : ''}`}>
        {/* Success animation */}
        {success && (
          <div className="success-animation">
            <div className="checkmark-circle">
              <div className="checkmark draw"></div>
            </div>
          </div>
        )}

        <div className="welcome-header">
          <span className="welcome-emoji">🚀</span>
        </div>

        <h2 className="auth-title">Join Pulse</h2>
        <p className="auth-subtitle">
          Create your account to get started
        </p>

        {/* General error message */}
        {errors.general && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">👤</span> Username
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">@</span>
              <input
                type="text"
                name="username"
                className={`input-field with-icon ${touched.username && errors.username ? 'error' : ''}`}
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                disabled={loading}
                minLength="3"
                maxLength="20"
              />
            </div>
            {touched.username && errors.username && (
              <p className="error-text">⚠️ {errors.username}</p>
            )}
            <small className="input-hint">
              3-20 characters, letters, numbers, and underscores only
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📧</span> Email
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                name="email"
                className={`input-field with-icon ${touched.email && errors.email ? 'error' : ''}`}
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                disabled={loading}
              />
            </div>
            {touched.email && errors.email && (
              <p className="error-text">⚠️ {errors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🔒</span> Password
            </label>
            <div className="password-input-container">
              <div className="input-icon-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  type="password"
                  name="password"
                  className={`input-field with-icon ${touched.password && errors.password ? 'error' : ''}`}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setShowRequirements(true)}
                  onBlur={(e) => {
                    handleBlur(e);
                    setShowRequirements(false);
                  }}
                  required
                  disabled={loading}
                  minLength="8"
                />
              </div>
            </div>

            {/* Password strength indicator */}
            {formData.password && (
              <div className="password-strength-container">
                <div className="password-strength-header">
                  <span>Password strength:</span>
                  <span className="strength-text" style={{ color: getStrengthColor() }}>
                    {getStrengthText()}
                  </span>
                </div>
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${passwordStrength}%`,
                      backgroundColor: getStrengthColor()
                    }}
                  />
                </div>
              </div>
            )}

            {/* Password requirements tooltip */}
            {showRequirements && (
              <div className="password-requirements-tooltip">
                <p className="requirements-title">Password must contain:</p>
                <div className={`requirement-item ${passwordRequirements.minLength ? 'valid' : ''}`}>
                  <span className="requirement-icon">
                    {passwordRequirements.minLength ? '✅' : '❌'}
                  </span>
                  At least 8 characters
                </div>
                <div className={`requirement-item ${passwordRequirements.hasNumber ? 'valid' : ''}`}>
                  <span className="requirement-icon">
                    {passwordRequirements.hasNumber ? '✅' : '❌'}
                  </span>
                  At least one number
                </div>
                <div className={`requirement-item ${passwordRequirements.hasUpperCase ? 'valid' : ''}`}>
                  <span className="requirement-icon">
                    {passwordRequirements.hasUpperCase ? '✅' : '❌'}
                  </span>
                  At least one uppercase letter
                </div>
                <div className={`requirement-item ${passwordRequirements.hasLowerCase ? 'valid' : ''}`}>
                  <span className="requirement-icon">
                    {passwordRequirements.hasLowerCase ? '✅' : '❌'}
                  </span>
                  At least one lowercase letter
                </div>
                <div className={`requirement-item ${passwordRequirements.hasSpecial ? 'valid' : ''}`}>
                  <span className="requirement-icon">
                    {passwordRequirements.hasSpecial ? '✅' : '❌'}
                  </span>
                  At least one special character
                </div>
              </div>
            )}

            {touched.password && errors.password && (
              <p className="error-text">⚠️ {errors.password}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">✓</span> Confirm Password
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">✓</span>
              <input
                type="password"
                name="confirmPassword"
                className={`input-field with-icon ${touched.confirmPassword && errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                disabled={loading}
              />
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="error-text">⚠️ {errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || Object.values(errors).some(error => error)}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner-small" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </p>
        </div>

        {/* Storage policy notice */}
        <div className="storage-notice">
          <p>
            🔔 <strong>Note:</strong> By creating an account, you agree to our{' '}
            <button 
              className="terms-link"
              onClick={() => setShowTermsModal(true)}
            >
              Terms & Conditions
            </button>
            , including our monthly post deletion policy for storage management.
          </p>
        </div>

        <div className="terms-footer">
          By creating an account, you agree to our{' '}
          <button 
            className="terms-link"
            onClick={() => setShowTermsModal(true)}
          >
            Terms
          </button>{' '}
          and{' '}
          <a href="/privacy" className="terms-link">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
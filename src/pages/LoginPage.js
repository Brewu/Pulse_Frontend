import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import './RegisterPage.css';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [identifierType, setIdentifierType] = useState('email');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showDeclineMessage, setShowDeclineMessage] = useState(false);

  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Detect if input is email or username
  useEffect(() => {
    if (identifier.includes('@') && identifier.includes('.')) {
      setIdentifierType('email');
    } else {
      setIdentifierType('username');
    }
  }, [identifier]);

  // Show terms modal on component mount (only once per session)
  useEffect(() => {
    const hasSeenTerms = sessionStorage.getItem('hasSeenTerms');
    if (!hasSeenTerms) {
      setShowTermsModal(true);
      sessionStorage.setItem('hasSeenTerms', 'true');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
      setSuccess(true);

      if (rememberMe) {
        localStorage.setItem('rememberedIdentifier', identifier);
        localStorage.setItem('rememberedIdentifierType', identifierType);
      } else {
        localStorage.removeItem('rememberedIdentifier');
        localStorage.removeItem('rememberedIdentifierType');
      }

      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = authAPI.getGoogleAuthUrl();
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
                Since you didn't accept our terms and conditions, you can't access the app. 
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

  // Load remembered identifier on component mount
  useEffect(() => {
    const rememberedIdentifier = localStorage.getItem('rememberedIdentifier');
    const rememberedType = localStorage.getItem('rememberedIdentifierType');
    if (rememberedIdentifier) {
      setIdentifier(rememberedIdentifier);
      setIdentifierType(rememberedType || 'email');
      setRememberMe(true);
    }

    // Check for Google OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
      authAPI.handleGoogleCallback(token)
        .then(response => {
          if (response.data.success) {
            googleLogin(response.data.user, token);
            window.history.replaceState({}, document.title, '/login');
            setSuccess(true);
            setTimeout(() => navigate('/'), 500);
          }
        })
        .catch(err => {
          console.error('Google callback error:', err);
          setError('Failed to complete Google login');
        });
    } else if (error) {
      setError('Google login failed. Please try again.');
      window.history.replaceState({}, document.title, '/login');
    }
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getInputPlaceholder = () => {
    return identifierType === 'email'
      ? 'john@example.com'
      : 'johndoe';
  };

  const getInputIcon = () => {
    return identifierType === 'email' ? '✉️' : '👤';
  };

  // If user declined, show the decline message overlay
  if (showDeclineMessage) {
    return (
      <div className="decline-overlay">
        <div className="decline-message">
          <div className="decline-emoji">👋</div>
          <h2>You've declined the terms</h2>
          <p>
            Since you didn't accept our terms and conditions, you can't access the app.
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
                  By declining these terms, you will not be able to access the application.
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
        {/* Welcome back message */}
        <div className="welcome-header">
          <span className="welcome-emoji">👋</span>
        </div>

        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">
          Sign in with your email, username, or Google account
        </p>

        {/* Identifier type indicator */}
        {identifier && (
          <div className="identifier-type-badge">
            Logging in with {identifierType === 'email' ? '📧 email' : '👤 username'}
          </div>
        )}

        {/* Error message display */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📧👤</span> Email or Username
            </label>
            <div className="input-icon-wrapper">
              <span className="input-icon">{getInputIcon()}</span>
              <input
                type="text"
                className="input-field with-icon"
                placeholder={getInputPlaceholder()}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                autoFocus
              />
            </div>
            <small className="input-hint">
              Use your email address or username
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🔒</span> Password
            </label>
            <div className="password-input-container">
              <div className="input-icon-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field with-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="password-toggle-btn"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Remember me and Forgot password row */}
          <div className="auth-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="checkbox-input"
              />
              <span className="checkbox-text">Remember me</span>
            </label>

            <Link
              to="/forgot-password"
              className="forgot-password-link"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !identifier || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Social login options */}
        <div className="social-login-section">
          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">
            {/* Google login button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="social-btn google-btn"
            >
              {googleLoading ? (
                <>
                  <span className="spinner-small" />
                  Connecting...
                </>
              ) : (
                <>
                  <span className="google-icon">G</span>
                  Google
                </>
              )}
            </button>

            {/* GitHub login button */}
         
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link
              to="/register"
              className="auth-link"
            >
              Create free account
            </Link>
          </p>
        </div>

        {/* Storage policy notice */}
        <div className="storage-notice">
          <p>
            🔔 <strong>Note:</strong> By signing in, you agree to our{' '}
            <button
              className="terms-link"
              onClick={() => setShowTermsModal(true)}
            >
              Terms & Conditions
            </button>
            , including our monthly post deletion policy for storage management.
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="demo-credentials">
          <p className="demo-title">🔍 Demo Credentials:</p>
          <div className="demo-grid">
            <div><span className="demo-label">Email:</span> demo@pulse.com</div>
            <div><span className="demo-label">Username:</span> demouser</div>
            <div><span className="demo-label">Password:</span> demo123</div>
            <div className="demo-note">
              Or use <span className="google-highlight">Google Sign In</span> with any account
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
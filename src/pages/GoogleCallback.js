// pages/GoogleCallback.js

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleLogin } = useAuth(); // Make sure this is destructured correctly

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');

    const handleCallback = async () => {
      if (token) {
        try {
          console.log('✅ Google callback received token:', token.substring(0, 20) + '...');
          
          // Fetch user data with token
          const response = await authAPI.handleGoogleCallback(token);
          console.log('📡 User data response:', response.data);
          
          if (response.data.success) {
            // Use googleLogin to set user in context
            googleLogin(response.data.user, token);
            console.log('✅ Google login successful, redirecting to home...');
            navigate('/');
          } else {
            console.error('❌ Google callback failed:', response.data.message);
            navigate('/login?error=google-auth-failed');
          }
        } catch (err) {
          console.error('❌ Google callback error:', err);
          navigate('/login?error=server-error');
        }
      } else if (error) {
        console.error('❌ Google returned error:', error);
        navigate(`/login?error=${error}`);
      } else {
        console.error('❌ No token or error in callback');
        navigate('/login');
      }
    };

    handleCallback();
  }, [location, navigate, googleLogin]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div className="loading-spinner" style={{
        width: '50px',
        height: '50px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTop: '3px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p>Completing Google sign in...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleCallback;
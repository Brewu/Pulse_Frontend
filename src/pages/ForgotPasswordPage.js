// pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
    const [method, setMethod] = useState('email');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const countryCodes = [
        { code: '+1', country: '🇺🇸 US/Canada' },
        { code: '+44', country: '🇬🇧 UK' },
        { code: '+233', country: '🇬🇭 Ghana' },
        { code: '+234', country: '🇳🇬 Nigeria' },
        { code: '+27', country: '🇿🇦 South Africa' },
        { code: '+254', country: '🇰🇪 Kenya' },
        { code: '+91', country: '🇮🇳 India' },
        { code: '+61', country: '🇦🇺 Australia' },
        { code: '+49', country: '🇩🇪 Germany' },
        { code: '+33', country: '🇫🇷 France' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = method === 'email'
                ? { method: 'email', email }
                : { method: 'sms', phoneNumber, phoneCountryCode: countryCode };

            await authAPI.forgotPassword(data);
            setSuccess(true);
            setSubmittedEmail(email);
        } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSuccess(false);
        setEmail('');
        setPhoneNumber('');
        setError('');
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>
                        🔐
                    </span>
                    <h2 className="auth-title">Reset Your Password</h2>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        {!success
                            ? 'Choose how to receive your password reset link'
                            : 'Check your email or phone for the reset link'}
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div className="error-message" style={{
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '20px',
                        color: '#c00',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⚠️</span>
                        {error}
                    </div>
                )}

                {!success ? (
                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Method toggle */}
                        <div className="method-toggle" style={{
                            display: 'flex',
                            gap: '10px',
                            marginBottom: '24px',
                            background: '#f5f5f5',
                            padding: '4px',
                            borderRadius: '12px'
                        }}>
                            <button
                                type="button"
                                className={`method-btn ${method === 'email' ? 'active' : ''}`}
                                onClick={() => setMethod('email')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: method === 'email' ? 'white' : 'transparent',
                                    color: method === 'email' ? '#667eea' : '#666',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: method === 'email' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                📧 Email
                            </button>
                            <button
                                type="button"
                                className={`method-btn ${method === 'sms' ? 'active' : ''}`}
                                onClick={() => setMethod('sms')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: method === 'sms' ? 'white' : 'transparent',
                                    color: method === 'sms' ? '#667eea' : '#666',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: method === 'sms' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                📱 SMS
                            </button>
                        </div>

                        {/* Email input */}
                        {method === 'email' ? (
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div className="input-icon-wrapper">
                                    <span className="input-icon">✉️</span>
                                    <input
                                        type="email"
                                        className="input-field with-icon"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                                    We'll send a password reset link to this email
                                </p>
                            </div>
                        ) : (
                            /* Phone input */
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <div className="phone-input-group" style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="country-code-select"
                                        style={{
                                            width: '120px',
                                            padding: '12px',
                                            border: '2px solid #e1e1e1',
                                            borderRadius: '8px',
                                            background: 'white',
                                            fontSize: '14px'
                                        }}
                                        disabled={loading}
                                    >
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code}>
                                                {c.country} {c.code}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="tel"
                                        className="phone-input"
                                        placeholder="1234567890"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            border: '2px solid #e1e1e1',
                                            borderRadius: '8px',
                                            fontSize: '14px'
                                        }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                                    We'll send a password reset link via SMS
                                </p>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                marginTop: '20px'
                            }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <span className="spinner-small" style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    Sending...
                                </span>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>

                        {/* Back to login link */}
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <Link
                                to="/login"
                                style={{
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                ← Back to Login
                            </Link>
                        </div>
                    </form>
                ) : (
                    /* Success message */
                    <div className="success-message" style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{
                            fontSize: '64px',
                            marginBottom: '20px',
                            animation: 'bounce 1s ease'
                        }}>
                            ✉️
                        </div>
                        <h3 style={{ marginBottom: '10px', color: '#333' }}>Check Your {method === 'email' ? 'Email' : 'Phone'}</h3>
                        <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
                            {method === 'email' ? (
                                <>We've sent a password reset link to <strong>{email}</strong></>
                            ) : (
                                <>We've sent a password reset link via SMS to <strong>{countryCode} {phoneNumber}</strong></>
                            )}
                        </p>
                        <div style={{
                            background: '#f8f9fa',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '24px'
                        }}>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                                ⏱️ The link will expire in <strong>10 minutes</strong>
                            </p>
                            <p style={{ fontSize: '13px', color: '#999' }}>
                                Didn't receive it? Check your spam folder or{' '}
                                <button
                                    onClick={resetForm}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#667eea',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                    }}
                                >
                                    try again
                                </button>
                            </p>
                        </div>
                        <Link
                            to="/login"
                            className="btn-primary"
                            style={{
                                display: 'inline-block',
                                padding: '12px 30px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '30px',
                                fontWeight: '600'
                            }}
                        >
                            Back to Login
                        </Link>
                    </div>
                )}

                {/* Security note */}
                <div style={{
                    marginTop: '30px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#999',
                    textAlign: 'center'
                }}>
                    🔒 We'll never share your information. This is for account recovery only.
                </div>
            </div>

            {/* CSS animations */}
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
        </div>
    );
};

export default ForgotPasswordPage;
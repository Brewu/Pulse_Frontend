import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode (installed)
        const isInStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isInStandalone);

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // Listen for the beforeinstallprompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Don't show immediately, wait a bit
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Track installation
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setShowPrompt(false);
            setIsStandalone(true);
        });

        // For iOS, show prompt after a delay if not installed
        if (isIOSDevice && !isInStandalone) {
            setTimeout(() => setShowPrompt(true), 3000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Store in localStorage that user dismissed
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    // Don't show if already installed or user dismissed before
    if (isStandalone || showPrompt === false || localStorage.getItem('pwa-prompt-dismissed')) {
        return null;
    }

    // iOS specific prompt
    if (isIOS) {
        return (
            <div className="pwa-prompt-overlay">
                <div className="pwa-prompt ios-prompt">
                    <button className="close-btn" onClick={handleDismiss}>×</button>
                    <div className="prompt-icon">📱</div>
                    <h3>Install Pulse App</h3>
                    <p>Get the best experience with our app on your home screen!</p>

                    <div className="ios-instructions">
                        <div className="instruction-step">
                            <span className="step-number">1</span>
                            <span>Tap the <strong>Share button</strong> <span className="share-icon">⎙</span></span>
                        </div>
                        <div className="instruction-step">
                            <span className="step-number">2</span>
                            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                        </div>
                        <div className="instruction-step">
                            <span className="step-number">3</span>
                            <span>Tap <strong>"Add"</strong> in the top right</span>
                        </div>
                    </div>

                    <div className="prompt-actions">
                        <button className="dismiss-btn" onClick={handleDismiss}>
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Chrome prompt
    return (
        <div className="pwa-prompt-bottom">
            <div className="prompt-content">
                <img src="/icons/192.png" alt="Pulse" className="prompt-app-icon" />
                <div className="prompt-text">
                    <h4>Install Pulse</h4>
                    <p>Add to home screen for quick access</p>
                </div>
                <button className="install-btn" onClick={handleInstallClick}>
                    Install
                </button>
                <button className="close-btn-small" onClick={handleDismiss}>×</button>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
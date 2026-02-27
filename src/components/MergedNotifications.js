import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const MergedNotificationIcon = ({ unreadCount, messageCount, totalCount, isMobile = false }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className={`merged-notification-container ${isMobile ? 'mobile' : ''}`}>
            <div
                className="merged-notification-icon"
                onMouseEnter={() => setShowDetails(true)}
                onMouseLeave={() => setShowDetails(false)}
                onClick={() => setShowDetails(!showDetails)}
                role="button"
                tabIndex={0}
                aria-label="Notifications"
            >
                {/* Main Bell Icon */}
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Chat Bubble Overlay */}
                <div className="chat-overlay">
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 3H3C2.46957 3 1.96086 3.21071 1.58579 3.58579C1.21071 3.96086 1 4.46957 1 5V15C1 15.5304 1.21071 16.0391 1.58579 16.4142C1.96086 16.7893 2.46957 17 3 17H7L11 21V17H17C17.5304 17 18.0391 16.7893 18.4142 16.4142C18.7893 16.0391 19 15.5304 19 15V5C19 4.46957 18.7893 3.96086 18.4142 3.58579C18.0391 3.21071 17.5304 3 17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* Total Count Badge */}
                {totalCount > 0 && (
                    <span className="total-badge">
                        {totalCount > 99 ? '99+' : totalCount}
                    </span>
                )}
            </div>

            {/* Detailed Popup */}
            {showDetails && (unreadCount > 0 || messageCount > 0) && (
                <div className="notification-details-popup">
                    <div className="popup-arrow"></div>

                    {unreadCount > 0 && (
                        <div className="detail-item notifications">
                            <span className="detail-icon">🔔</span>
                            <span className="detail-text">
                                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}

                    {messageCount > 0 && (
                        <div className="detail-item messages">
                            <span className="detail-icon">💬</span>
                            <span className="detail-text">
                                {messageCount} unread message{messageCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}

                    <div className="popup-actions">
                        <Link to="/notifications" className="popup-link" onClick={() => setShowDetails(false)}>
                            View All
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MergedNotificationIcon;
import React from 'react';

const ErrorAlert = ({ 
  message, 
  onRetry, 
  onDismiss,
  title = 'Error',
  variant = 'default' 
}) => {
  const variantClasses = {
    default: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    critical: 'bg-red-100 border-red-300 text-red-800'
  };

  const iconColors = {
    default: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
    critical: 'text-red-500'
  };

  return (
    <div className={`rounded-lg border p-4 mb-4 ${variantClasses[variant]}`}>
      <div className="flex items-start">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg 
            className={`h-5 w-5 ${iconColors[variant]}`} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        
        {/* Error Content */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="mt-1 text-sm">
            <p>{message || 'An unexpected error occurred'}</p>
          </div>
          
          {/* Actions */}
          <div className="mt-3 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-700 hover:text-red-600 focus:outline-none"
              >
                <span>Try again</span>
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none"
              >
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Close Button */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex rounded-md p-1.5 text-gray-500 hover:text-gray-600 focus:outline-none"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified version for quick use
export const SimpleErrorAlert = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
    <p className="text-red-600 mb-3">{message || 'Something went wrong'}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

export default ErrorAlert;
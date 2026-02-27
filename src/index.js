// src/main.jsx (or main.tsx / index.jsx — your root render file)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Create the query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// Only register service worker in production and with proper error handling
if (process.env.NODE_ENV === 'production') {
  // Use the imported serviceWorkerRegistration (recommended)
  serviceWorkerRegistration.register({
    onSuccess: (registration) => {
      console.log('✅ Service Worker registered successfully via serviceWorkerRegistration');
    },
    onUpdate: (registration) => {
      console.log('🆕 Service Worker update available');
      // Optional: notify user
      if (window.confirm('New version available! Reload to update?')) {
        window.location.reload();
      }
    }
  });
  
  // REMOVE this duplicate registration code - it's causing the conflict
  /*
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  }
  */
} else {
  // In development, unregister any existing service workers
  serviceWorkerRegistration.unregister();
}
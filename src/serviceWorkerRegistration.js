// src/serviceWorkerRegistration.js

// This optional code is used to register a service worker.
// register() is not called by default.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if PUBLIC_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used to
      // serve assets; see https://github.com/facebook/create-react-app/issues/2374
      console.log('Service worker registration skipped: different origin');
      return;
    }

    window.addEventListener('load', () => {
      // Try multiple possible service worker paths
      const possiblePaths = [
        '/service-worker.js',
        '/sw.js',
        `${process.env.PUBLIC_URL}/service-worker.js`,
        '/static/js/service-worker.js'
      ];

      // Try to register with the first path, if it fails try the next
      tryRegisterWithFallback(possiblePaths, 0, config);
    });
  }
}

function tryRegisterWithFallback(paths, index, config) {
  if (index >= paths.length) {
    console.log('❌ All service worker registration attempts failed');
    return;
  }

  const swUrl = paths[index];
  console.log(`🔄 Attempting to register service worker at: ${swUrl}`);

  // First check if the file exists and has correct MIME type
  fetch(swUrl, { 
    method: 'HEAD',
    cache: 'no-cache'
  })
    .then(response => {
      const contentType = response.headers.get('content-type');
      const status = response.status;
      
      console.log(`📦 Service worker check at ${swUrl}:`, {
        status,
        contentType,
        ok: response.ok
      });

      // Check if response is OK and has JavaScript MIME type
      if (response.ok && contentType && contentType.includes('javascript')) {
        // Good to go - register the service worker
        registerValidSW(swUrl, config);
      } else if (response.status === 404) {
        // File not found, try next path
        console.log(`⚠️ Service worker not found at ${swUrl}, trying next...`);
        tryRegisterWithFallback(paths, index + 1, config);
      } else {
        // Wrong MIME type or other issue, try next path
        console.log(`⚠️ Service worker at ${swUrl} has invalid MIME type: ${contentType}, trying next...`);
        tryRegisterWithFallback(paths, index + 1, config);
      }
    })
    .catch(error => {
      console.log(`⚠️ Failed to fetch service worker at ${swUrl}:`, error.message);
      // Try next path on network error
      tryRegisterWithFallback(paths, index + 1, config);
    });
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl, { 
      scope: '/',
      updateViaCache: 'none' // Prevent caching issues
    })
    .then((registration) => {
      console.log(`✅ Service Worker registered successfully at ${swUrl}`);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                '🆕 New content is available and will be used when all ' +
                  'tabs for this page are closed.'
              );

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('📦 Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error(`❌ Error during service worker registration at ${swUrl}:`, error.message);
      
      // Check for specific error types
      if (error.message.includes('MIME type')) {
        console.error('⚠️ MIME type error: Vercel is serving HTML instead of JavaScript');
        console.log('💡 Solution: Update vercel.json to properly serve service-worker.js');
      } else if (error.message.includes('SSL certificate')) {
        console.error('⚠️ SSL certificate error');
      }
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      const status = response.status;
      
      console.log(`📦 Checking service worker at ${swUrl}:`, {
        status,
        contentType
      });
      
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            console.log('⚠️ Invalid service worker, reloading page...');
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch((error) => {
      console.log('📱 No internet connection found. App is running in offline mode.');
      console.log('Error details:', error.message);
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('✅ Service worker unregistered');
      })
      .catch((error) => {
        console.error('❌ Error unregistering service worker:', error.message);
      });
  }
}

// Add this to check Vercel configuration
export function diagnoseServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service workers are not supported in this browser');
    return;
  }

  console.log('🔍 Running service worker diagnostics...');
  
  // Check if we're on Vercel
  const isVercel = window.location.hostname.includes('vercel.app');
  console.log(`🌐 Environment: ${isVercel ? 'Vercel' : window.location.hostname}`);
  
  // Try to fetch the service worker directly
  fetch('/service-worker.js', { method: 'HEAD' })
    .then(response => {
      console.log('📦 /service-worker.js response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: response.url
      });
      
      if (response.headers.get('content-type')?.includes('html')) {
        console.error('❌ Vercel is serving HTML instead of service-worker.js');
        console.log('💡 Fix: Update vercel.json with proper service worker route');
      }
    })
    .catch(err => console.error('❌ Failed to fetch service worker:', err.message));
  
  // Check current registrations
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log(`📋 Current service worker registrations: ${registrations.length}`);
    registrations.forEach((reg, i) => {
      console.log(`  [${i}] Scope: ${reg.scope}, Active: ${!!reg.active}`);
    });
  });
}
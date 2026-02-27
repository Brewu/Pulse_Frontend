// services/tokenService.js
import api from './api'
class TokenService {
  constructor() {
    this.refreshPromise = null;
  }

  async refreshToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await api.post('/auth/refresh', {
          refreshToken
        });

        const { token } = response.data;
        localStorage.setItem('token', token);
        
        console.log('✅ Token refreshed successfully');
        resolve(token);
      } catch (error) {
        console.error('❌ Failed to refresh token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        reject(error);
      } finally {
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }

  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }
}

export default new TokenService();
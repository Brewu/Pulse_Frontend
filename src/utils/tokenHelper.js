// src/utils/tokenHelper.js
export const getValidToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp < Date.now() / 1000) {
      console.log('Token expired');
      localStorage.removeItem('token');
      return null;
    }
    return token;
  } catch {
    localStorage.removeItem('token');
    return null;
  }
};

export const isTokenValid = () => {
  return !!getValidToken();
};
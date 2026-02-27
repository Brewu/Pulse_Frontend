// contexts/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      const response = await authAPI.login(identifier, password);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // ========== NEW: Google Login Method ==========
  const googleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    googleLogin, // Add this
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
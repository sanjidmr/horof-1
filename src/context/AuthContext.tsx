'use client';

import React, { createContext, useContext, useState } from 'react';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, role: 'customer' | 'admin') => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedUser = localStorage.getItem('forestcraft_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (email: string, role: 'customer' | 'admin') => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      email,
      role
    };
    setUser(newUser);
    localStorage.setItem('forestcraft_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('forestcraft_user');
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

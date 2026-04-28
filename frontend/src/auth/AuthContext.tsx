import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; emailVerificationRequired?: boolean; email?: string }>;
  register: (data: any) => Promise<{ emailVerificationRequired?: boolean; email?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = (user: User | null) => {
    setUserState(user);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUserState(JSON.parse(stored));
      }
      const response = await authApi.getMe();
      if (response.data.success) {
        setUserState(response.data.data);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      setUserState(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { data } = response.data;

    if (data.mfaRequired) {
      return { mfaRequired: true };
    }

    if (data.emailVerificationRequired) {
      return { emailVerificationRequired: true, email: data.email };
    }

    if (data.accessToken) {
      localStorage.setItem('access_token', data.accessToken);
    }
    if (data.user) {
      setUserState(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return {};
  };

  const register = async (data: any) => {
    const response = await authApi.register(data);
    const { data: resData } = response.data;
    if (resData.emailVerificationRequired) {
      return { emailVerificationRequired: true, email: resData.email };
    }
    if (resData.accessToken) {
      localStorage.setItem('access_token', resData.accessToken);
    }
    if (resData.user) {
      setUserState(resData.user);
      localStorage.setItem('user', JSON.stringify(resData.user));
    }
    return {};
  };

  const verifyEmail = async (email: string, code: string) => {
    const response = await authApi.verifyEmail(email, code);
    const { data } = response.data;
    if (data.accessToken) {
      localStorage.setItem('access_token', data.accessToken);
    }
    if (data.user) {
      setUserState(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  };

  const resendCode = async (email: string) => {
    await authApi.resendCode(email);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUserState(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.data.success) {
        setUserState(response.data.data);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, resendCode, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

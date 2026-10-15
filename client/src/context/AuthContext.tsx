import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (email: string, role: 'author' | 'admin') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize socket and load profile on mount
  useEffect(() => {
    socketService.connect();

    const checkAuth = async () => {
      const storedToken = api.getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: userProfile } = await api.getMe();
        setUser(userProfile);
        if (userProfile.role === 'admin') {
          socketService.joinAdminRoom();
        } else {
          socketService.joinAuthorRoom(userProfile.id);
        }
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        api.setToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: loggedInUser, token: authToken } = await api.login(email, password);
      setUser(loggedInUser);
      setToken(authToken);

      if (loggedInUser.role === 'admin') {
        socketService.joinAdminRoom();
      } else {
        socketService.joinAuthorRoom(loggedInUser.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string, role: 'author' | 'admin') => {
    const defaultPassword = role === 'admin' ? 'Admin@123' : 'Author@123';
    await login(email, defaultPassword);
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, quickLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

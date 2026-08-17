import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserRole, PermissionCheck } from '../types/auth';
import { getStoredUserSession, saveUserSession, clearUserSession, checkPermissions } from '../services/api/auth';

interface AuthContextType {
  user: UserSession;
  permissions: PermissionCheck;
  login: (role: UserRole, name?: string) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession>(() => getStoredUserSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const permissions = checkPermissions(user.role);

  const login = (role: UserRole, name?: string) => {
    const updated: UserSession = {
      ...user,
      role,
      name: name || user.name,
      badgeOrId: `NPG-${role.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setUser(updated);
    saveUserSession(updated);
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    clearUserSession();
    setUser({
      id: 'usr-guest',
      name: 'Guest Viewer',
      badgeOrId: 'NPG-GUEST-00',
      role: 'VIEWER',
      department: 'Public Traffic Observer',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        login,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
      }}
    >
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

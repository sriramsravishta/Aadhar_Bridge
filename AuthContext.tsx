import { createContext, useContext, useState, ReactNode } from 'react';
import * as scanService from '../services/scanService';

/**
 * AuthContext — simplified for Azure migration.
 * 
 * Supabase GoTrue authentication has been removed.
 * Authentication is now just setting a local employee ID (no server session).
 * The employee ID is stored in component state and used for scoping queue records.
 */

interface AuthContextType {
  userId: string | null;
  login: (employeeId: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  const login = async (employeeId: string): Promise<boolean> => {
    const result = await scanService.login(employeeId);
    if (result) {
      setUserId(result.user_id);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await scanService.logout();
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
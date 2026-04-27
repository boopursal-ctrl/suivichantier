import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { User, AppModule, UserRole } from '../types';

import { mysqlService } from '../services/mysqlService';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasModuleAccess: (module: AppModule) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction de débogage améliorée
  const debug = (message: string, data?: any) => {
    console.log(`🔐 [Auth] ${message}`, data || '');
  };

  // 1. Vérifier et restaurer la session au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      debug('Initializing auth (MySQL Only Mode)...');

      // Restaurer depuis localStorage
      const storedUser = localStorage.getItem('user');
      const storedAuthTime = localStorage.getItem('auth_time');

      if (storedUser && storedAuthTime) {
        const authTime = parseInt(storedAuthTime);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        if (now - authTime < maxAge) {
          debug('Restoring user from localStorage', JSON.parse(storedUser).email);
          setUser(JSON.parse(storedUser));
        } else {
          debug('Session expired, clearing localStorage');
          localStorage.removeItem('user');
          localStorage.removeItem('auth_time');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const logout = async () => {
    debug('🚪 Logging out (MySQL mode)...');
    setUser(null);
    localStorage.clear();
    debug('✅ Logout successful');
    window.location.href = '/';
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    debug('🔑 Login attempt', { email });
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = pass.trim();

      // --- AUTHENTIFICATION MYSQL (Heberjahiz) ---
      debug('Attempting MySQL authentication...');
      const mysqlResponse = await mysqlService.query('login', {}, {
        email: cleanEmail,
        password: cleanPass
      });

      if (mysqlResponse.status === 'success' && mysqlResponse.user) {
        debug('✅ MySQL Login successful');
        const mysqlUser: User = {
          id: mysqlResponse.user.id.toString(),
          email: mysqlResponse.user.email,
          name: mysqlResponse.user.name,
          role: mysqlResponse.user.role,
          isActive: true,
          allowedModules: mysqlResponse.user.allowed_modules || ['dashboard']
        };
        setUser(mysqlUser);
        localStorage.setItem('user', JSON.stringify(mysqlUser));
        localStorage.setItem('auth_time', Date.now().toString());
        setLoading(false);
        return { success: true };
      } else {
        return { 
          success: false, 
          message: mysqlResponse.message || "Email ou mot de passe incorrect (MySQL)" 
        };
      }
    } catch (error: any) {
      debug('❌ MySQL Login exception:', error);
      return { 
        success: false, 
        message: "Erreur de connexion au serveur MySQL (Heberjahiz). Vérifiez votre connexion internet ou le fichier connect.php." 
      };
    } finally {
      setLoading(false);
    }
  };

  const hasModuleAccess = (module: AppModule): boolean => {
    if (!user) {
      debug('❌ hasModuleAccess: No user');
      return false;
    }

    if (user.role === 'ADMIN') {
      debug(`✅ hasModuleAccess: Admin access granted to ${module}`);
      return true;
    }

    const hasAccess = user.allowedModules?.includes(module) || false;
    debug(`🔒 hasModuleAccess: ${module} = ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    return hasAccess;
  };

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-8 border-blue-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-gray-800">3F INDUSTRIE</h1>
          <div className="space-y-2">
            <p className="text-gray-600 font-medium">Chargement de votre session</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-6">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    hasModuleAccess,
    loading
  };

  debug('🎯 AuthProvider rendering', {
    isAuthenticated: !!user,
    userEmail: user?.email,
    loading,
    userInLocalStorage: !!localStorage.getItem('user')
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppModule, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

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

  // Fonction de débogage
  const debug = (message: string, data?: any) => {
    console.log(`🔐 [Auth] ${message}`, data || '');
  };

  // Fonction pour stocker la session de manière persistante
  const storeSession = (userData: User | null, sessionData: any = null) => {
    try {
      if (userData) {
        // Stocker l'utilisateur
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('auth_time', Date.now().toString());
        debug('User stored in localStorage', { email: userData.email });
      }
      
      if (sessionData) {
        // Stocker les tokens Supabase
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          expires_at: sessionData.expires_at
        }));
      }
    } catch (error) {
      console.error('Error storing session:', error);
    }
  };

  // Fonction pour récupérer la session persistante
  const restoreSession = (): User | null => {
    try {
      const storedUser = localStorage.getItem('user');
      const authTime = localStorage.getItem('auth_time');
      
      if (storedUser && authTime) {
        const user = JSON.parse(storedUser);
        const time = parseInt(authTime);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours max
        
        // Vérifier si la session n'est pas trop vieille
        if (now - time < maxAge) {
          debug('User restored from localStorage', { email: user.email });
          return user;
        } else {
          debug('Session expired, cleaning up');
          localStorage.removeItem('user');
          localStorage.removeItem('auth_time');
          localStorage.removeItem('supabase.auth.token');
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
    return null;
  };

  // Vérifier la session au chargement
  useEffect(() => {
    const initializeAuth = async () => {
      debug('Initializing auth...');
      setLoading(true);
      
      // 1. Essayer de restaurer depuis localStorage (pour un chargement instantané)
      const restoredUser = restoreSession();
      if (restoredUser) {
        debug('Setting restored user immediately');
        setUser(restoredUser);
        setLoading(false);
      }
      
      // 2. Vérifier la session Supabase
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          debug('Supabase session error:', error.message);
        }
        
        if (session?.user) {
          debug('Supabase session found', { user: session.user.email });
          await fetchProfile(session.user.id, session.user.email!);
        } else {
          debug('No Supabase session found');
          // Si Supabase dit qu'il n'y a pas de session mais localStorage en avait une, nettoyer
          if (restoredUser) {
            debug('Clearing invalid session from localStorage');
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_time');
            localStorage.removeItem('supabase.auth.token');
          }
          setLoading(false);
        }
      } catch (error) {
        debug('Error checking session:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debug(`Auth state changed: ${event}`);
        
        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              debug('User signed in', { email: session.user.email });
              await fetchProfile(session.user.id, session.user.email!);
            }
            break;
            
          case 'SIGNED_OUT':
            debug('User signed out');
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_time');
            localStorage.removeItem('supabase.auth.token');
            setLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            debug('Token refreshed');
            if (session) {
              localStorage.setItem('auth_time', Date.now().toString());
            }
            break;
            
          case 'USER_UPDATED':
            debug('User updated');
            if (session?.user) {
              await fetchProfile(session.user.id, session.user.email!);
            }
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    debug('Fetching profile for user:', { userId, email });
    
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // AUTO-PROVISIONING: Créer le profil s'il n'existe pas
      if (!data && (error?.code === 'PGRST116' || !error)) {
        debug('Profile not found, auto-creating...');
        
        const newProfile = {
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: 'ADMIN',
          is_active: true,
          allowed_modules: ['dashboard', 'chantiers', 'stock', 'clients', 'monteurs', 'rapports', 'admin']
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();
          
        if (createError) {
          debug('Error creating profile:', createError);
          throw createError;
        }
        
        data = createdProfile;
        debug('Profile created successfully');
      }

      if (data) {
        // Map DB profile to App User
        const appUser: User = {
          id: data.id,
          email: data.email || email,
          name: data.name || email.split('@')[0],
          role: (data.role as UserRole) || 'USER',
          isActive: data.is_active ?? true,
          allowedModules: data.allowed_modules || ['dashboard']
        };
        
        debug('Profile loaded', { user: appUser.email, role: appUser.role });
        
        // Vérifier si le compte est actif
        if (appUser.isActive) {
          // Récupérer la session actuelle pour stockage
          const { data: { session } } = await supabase.auth.getSession();
          
          setUser(appUser);
          storeSession(appUser, session);
          debug('User set in state and stored');
        } else {
          debug('Account is inactive');
          alert("Votre compte a été désactivé par un administrateur.");
          await supabase.auth.signOut();
          setUser(null);
          localStorage.clear();
        }
      }
    } catch (error) {
      debug('Error fetching profile:', error);
    } finally {
      setLoading(false);
      debug('Loading set to false');
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    debug('Login attempt', { email });
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        debug('Login error:', error.message);
        return { 
          success: false, 
          message: error.message === 'Invalid login credentials' 
            ? 'Email ou mot de passe incorrect' 
            : error.message 
        };
      }

      if (data.user && data.session) {
        debug('Login successful, waiting for profile...');
        // Le profil sera chargé par onAuthStateChange
        // Attendre un peu pour laisser le temps au profil de se charger
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true };
      }
      
      return { success: false, message: 'Erreur inconnue' };
    } catch (error: any) {
      debug('Login exception:', error);
      return { success: false, message: error.message || 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    debug('Logging out...');
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.clear();
      debug('Logout successful');
      
      // Forcer un rechargement pour nettoyer tout l'état
      window.location.href = '/';
    } catch (error) {
      debug('Logout error:', error);
    }
  };

  const hasModuleAccess = (module: AppModule): boolean => {
    if (!user) {
      debug('hasModuleAccess: No user');
      return false;
    }
    
    // L'admin a accès à tout
    if (user.role === 'ADMIN') {
      debug(`hasModuleAccess: Admin access granted to ${module}`);
      return true;
    }
    
    const hasAccess = user.allowedModules?.includes(module) || false;
    debug(`hasModuleAccess: ${module} = ${hasAccess}`);
    return hasAccess;
  };

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-10 h-10 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="mt-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800">3F INDUSTRIE</h2>
          <p className="mt-2 text-gray-600">Chargement de votre session...</p>
          <p className="mt-1 text-sm text-gray-500">Vérification de l'authentification</p>
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

  debug('AuthProvider rendering', { 
    isAuthenticated: !!user, 
    userEmail: user?.email,
    loading 
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

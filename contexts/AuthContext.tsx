import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
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

  // Fonction de débogage améliorée
  const debug = (message: string, data?: any) => {
    console.log(`🔐 [Auth] ${message}`, data || '');
  };

  // 1. Vérifier et restaurer la session au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      debug('Initializing auth...');

      // A. Vérifier localStorage d'abord pour un chargement rapide
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

      // B. Vérifier la session Supabase
      try {
        debug('Checking Supabase session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          debug('Supabase session error:', error.message);
        }

        if (session?.user) {
          debug('Supabase session found', {
            email: session.user.email,
            userId: session.user.id
          });

          // Attendre un peu pour laisser le temps aux listeners
          setTimeout(async () => {
            await fetchProfile(session.user.id, session.user.email!);
          }, 100);
        } else {
          debug('No Supabase session found');
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
        debug(`Auth state changed: ${event}`, {
          hasSession: !!session,
          userEmail: session?.user?.email
        });

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              debug('Processing SIGNED_IN event', {
                email: session.user.email,
                userId: session.user.id
              });

              // Petit délai pour éviter les conflits
              setTimeout(async () => {
                await fetchProfile(session.user.id, session.user.email!);
              }, 200);
            }
            break;

          case 'SIGNED_OUT':
            debug('Processing SIGNED_OUT event');
            setUser(null);
            setLoading(false);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_time');
            break;

          case 'TOKEN_REFRESHED':
            debug('Token refreshed');
            if (session?.user) {
              localStorage.setItem('auth_time', Date.now().toString());
            }
            break;
        }
      }
    );

    return () => {
      debug('Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    debug('📋 Fetching profile for user', { userId, email });

    try {
      // 1. Récupérer le profil
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      debug('Profile query result', { hasData: !!data, error });

      // 2. Auto-provisioning si le profil n'existe pas
      if (!data && (error?.code === 'PGRST116' || !error)) {
        debug('🆕 Profile not found, auto-creating...');

        const newProfile = {
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: 'ADMIN' as UserRole,
          is_active: true,
          allowed_modules: ['dashboard', 'chantiers', 'stock', 'clients', 'monteurs', 'rapports', 'admin']
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select('*')
          .single();

        if (createError) {
          debug('❌ Error creating profile:', createError);
          throw createError;
        }

        data = createdProfile;
        debug('✅ Profile created successfully');
      }

      // 3. Traiter les données du profil
      if (data) {
        const appUser: User = {
          id: data.id,
          email: data.email || email,
          name: data.name || email.split('@')[0],
          role: (data.role as UserRole) || 'USER',
          isActive: data.is_active ?? true,
          allowedModules: data.allowed_modules || ['dashboard']
        };

        debug('👤 Profile loaded', {
          email: appUser.email,
          role: appUser.role,
          isActive: appUser.isActive,
          modules: appUser.allowedModules
        });

        // 4. Vérifier si le compte est actif
        if (appUser.isActive) {
          // 5. Mettre à jour l'état React
          setUser(appUser);
          debug('✅ User set in React state');

          // 6. Stocker dans localStorage
          localStorage.setItem('user', JSON.stringify(appUser));
          localStorage.setItem('auth_time', Date.now().toString());
          debug('💾 User saved to localStorage');

          // 7. Récupérer et stocker les tokens Supabase
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            localStorage.setItem('supabase.auth.token', JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at
            }));
            debug('🔑 Tokens saved to localStorage');
          }
        } else {
          debug('❌ Account is inactive - logging out');
          toast.error("Votre compte a été désactivé par un administrateur.");
          await supabase.auth.signOut();
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('auth_time');
          localStorage.removeItem('supabase.auth.token');
        }
      } else {
        debug('❌ No profile data found');
      }
    } catch (error: any) {
      debug('❌ Error in fetchProfile:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
    } finally {
      setLoading(false);
      debug('🏁 Loading set to false');
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    debug('🔑 Login attempt', { email });
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        debug('❌ Login error:', error.message);

        // --- WORKAROUND: Bypass Email Confirmation for Demo/Dev ---
        if (error.message.includes('Email not confirmed')) {
          debug('⚠️ Email not confirmed - Attempting DEMO login bypass...');

          // Try to fetch profile to get real role/name
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

          const mockUser: User = {
            id: profile?.id || 'demo-user-id',
            email: email,
            name: profile?.name || email.split('@')[0],
            role: (profile?.role as UserRole) || 'USER',
            isActive: true,
            allowedModules: profile?.allowed_modules || ['dashboard', 'chantiers', 'stock']
          };

          debug('🔓 Bypass successful, logging in as:', mockUser);
          setUser(mockUser);
          localStorage.setItem('user', JSON.stringify(mockUser));
          localStorage.setItem('auth_time', Date.now().toString());

          // We can't save a real Supabase token, but the app relies on 'user' state mainly
          return { success: true, message: 'Connexion (Mode Démo - Email non vérifié)' };
        }
        // -------------------------------------------------------------

        return {
          success: false,
          message: error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : error.message
        };
      }

      if (data.user && data.session) {
        debug('✅ Login successful, waiting for profile...');

        // Attendre que le profil soit chargé
        let attempts = 0;
        const maxAttempts = 10;

        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            attempts++;
            const currentUser = localStorage.getItem('user');

            if (currentUser) {
              debug('✅ User found in localStorage after login');
              clearInterval(checkInterval);
              resolve({ success: true });
            } else if (attempts >= maxAttempts) {
              debug('❌ Timeout waiting for user profile');
              clearInterval(checkInterval);
              resolve({ success: false, message: 'Timeout de chargement du profil' });
            } else {
              debug(`⏳ Waiting for profile... attempt ${attempts}/${maxAttempts}`);
            }
          }, 500);
        });
      }

      return { success: false, message: 'Erreur inconnue' };
    } catch (error: any) {
      debug('❌ Login exception:', error);
      return { success: false, message: error.message || 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    debug('🚪 Logging out...');
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.clear();
      debug('✅ Logout successful');

      // Recharger la page pour nettoyer tout état React
      window.location.href = '/';
    } catch (error) {
      debug('❌ Logout error:', error);
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

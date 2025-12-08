import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppModule, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
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

  // Fonction pour sauvegarder l'utilisateur dans localStorage
  const saveUserToStorage = (userData: User | null) => {
    try {
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('last_login', Date.now().toString());
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('last_login');
      }
    } catch (error) {
      console.error('Erreur de sauvegarde dans localStorage:', error);
    }
  };

  // Fonction pour restaurer l'utilisateur depuis localStorage
  const restoreUserFromStorage = (): User | null => {
    try {
      const storedUser = localStorage.getItem('user');
      const lastLogin = localStorage.getItem('last_login');
      
      if (storedUser && lastLogin) {
        // Vérifier si la session n'est pas trop ancienne (24h max)
        const loginTime = parseInt(lastLogin, 10);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        
        if (now - loginTime < maxAge) {
          return JSON.parse(storedUser);
        } else {
          // Session expirée, nettoyer
          localStorage.removeItem('user');
          localStorage.removeItem('last_login');
        }
      }
    } catch (error) {
      console.error('Erreur de restauration depuis localStorage:', error);
    }
    return null;
  };

  // Vérifier la session au chargement
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      
      // 1. Essayer de restaurer depuis localStorage d'abord (pour un chargement rapide)
      const storedUser = restoreUserFromStorage();
      if (storedUser) {
        setUser(storedUser);
        setLoading(false);
        console.log('Utilisateur restauré depuis localStorage');
      }
      
      // 2. Vérifier la session Supabase (pour la validité réelle)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email!);
      } else {
        // Si pas de session Supabase mais localStorage disait le contraire, nettoyer
        if (storedUser) {
          setUser(null);
          saveUserToStorage(null);
          localStorage.removeItem('user');
          localStorage.removeItem('last_login');
        }
        setLoading(false);
      }
    };
    
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id, session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        saveUserToStorage(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Rafraîchir le dernier login
        localStorage.setItem('last_login', Date.now().toString());
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // AUTO-PROVISIONING: Si le profil n'existe pas, on le crée automatiquement
      if (!data && (error?.code === 'PGRST116' || !error)) {
        console.log("Profil introuvable, création automatique...");
        
        const newProfile = {
            id: userId,
            email: email,
            name: email.split('@')[0],
            role: 'ADMIN', // On donne ADMIN par défaut pour débloquer l'accès
            is_active: true,
            allowed_modules: ['dashboard', 'chantiers', 'stock', 'clients', 'monteurs', 'rapports', 'admin']
        };

        const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();
            
        if (createError) {
            console.error("Erreur création profil auto:", createError);
        } else {
            data = createdProfile;
        }
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
        
        // Bloquer l'accès si le compte est désactivé
        if (appUser.isActive) {
            setUser(appUser);
            saveUserToStorage(appUser);
            localStorage.setItem('last_login', Date.now().toString());
        } else {
            alert("Votre compte a été désactivé par un administrateur.");
            await supabase.auth.signOut();
            setUser(null);
            saveUserToStorage(null);
        }
      }
    } catch (error) {
      console.error("Erreur récupération profil:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        console.error("Erreur login Supabase:", error.message);
        setLoading(false);
        return false;
      }

      if (data.user) {
        // Attendre que le profil soit chargé (géré par fetchProfile)
        // Ajouter un petit délai pour s'assurer que tout est chargé
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (e) {
      console.error(e);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      saveUserToStorage(null);
      localStorage.clear();
      
      // Forcer un rechargement complet pour nettoyer l'état
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasModuleAccess = (module: AppModule): boolean => {
    if (!user) return false;
    // Admin a accès à tout
    if (user.role === 'ADMIN') return true;
    // Sinon vérifier les permissions
    return user.allowedModules?.includes(module) || false;
  };

  // Afficher un loader pendant le chargement initial
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="loader border-4 border-gray-200 border-t-blue-600 rounded-full w-12 h-12 animate-spin"></div>
        <p className="mt-4 text-gray-600">Chargement de la session...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      hasModuleAccess,
      loading
    }}>
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

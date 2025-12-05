
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

  // Vérifier la session au chargement
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id, session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
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
        } else {
            alert("Votre compte a été désactivé par un administrateur.");
            await supabase.auth.signOut();
            setUser(null);
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        // Renvoie l'erreur pour l'afficher dans l'UI
        console.error("Erreur login Supabase:", error.message);
        return false;
      }

      if (data.user) {
        // Le profil sera chargé par le listener onAuthStateChange
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasModuleAccess = (module: AppModule): boolean => {
    if (!user) return false;
    // Admin a accès à tout par défaut, mais on respecte allowedModules pour la cohérence UI
    return user.allowedModules?.includes(module) || false;
  };

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

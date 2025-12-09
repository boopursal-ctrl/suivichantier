// contexts/DataContext.tsx - VERSION CORRIGÉE
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chantier, Monteur, Client, LigneCout, AffectationMonteur, Versement, ArticleStock, MouvementStock, User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface DataContextType {
  chantiers: Chantier[];
  addChantier: (c: Chantier) => Promise<void>;
  updateChantier: (c: Chantier) => Promise<void>;
  deleteChantier: (id: string) => Promise<void>;

  monteurs: Monteur[];
  addMonteur: (m: Monteur) => Promise<void>;
  updateMonteur: (m: Monteur) => Promise<void>;
  deleteMonteur: (matricule: number) => Promise<void>;

  affectations: AffectationMonteur[];
  addAffectation: (a: AffectationMonteur) => Promise<void>;
  removeAffectation: (id: string) => Promise<void>;

  lignesCouts: LigneCout[];
  addCout: (c: LigneCout) => Promise<void>;
  deleteCout: (id: string) => Promise<void>;
  
  versements: Versement[];
  addVersement: (v: Versement) => Promise<void>;
  deleteVersement: (id: string) => Promise<void>;

  clients: Client[];
  addClient: (c: Client) => Promise<void>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  users: User[];
  addUser: (u: User) => Promise<void>;
  updateUser: (u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  articles: ArticleStock[];
  addArticle: (a: ArticleStock) => Promise<void>;
  mouvements: MouvementStock[];
  addMouvement: (m: MouvementStock) => Promise<void>;
  
  loadingData: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loadingData, setLoadingData] = useState(false);

  // State local
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [monteurs, setMonteurs] = useState<Monteur[]>([]);
  const [affectations, setAffectations] = useState<AffectationMonteur[]>([]);
  const [lignesCouts, setLignesCouts] = useState<LigneCout[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);

  // Charger toutes les données
  const fetchAllData = async () => {
    if (!user) {
      console.log('⏸️ No user, skipping data fetch');
      return;
    }

    setLoadingData(true);
    console.log('🔄 Fetching all data for user:', user.email);

    try {
      // Charger les données en parallèle
      const [
        monteursResult,
        chantiersResult,
        clientsResult,
        coutsResult,
        affectResult,
        versementsResult,
        articlesResult,
        mouvementsResult,
        profilesResult
      ] = await Promise.all([
        supabase.from('monteurs').select('*').order('nom_monteur', { ascending: true }),
        supabase.from('chantiers').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('lignes_couts').select('*'),
        supabase.from('affectations').select('*'),
        supabase.from('versements').select('*'),
        supabase.from('articles_stock').select('*'),
        supabase.from('mouvements_stock').select('*').order('date', { ascending: false }),
        supabase.from('profiles').select('*')
      ]);

      // Gérer les résultats
      if (monteursResult.error) console.error('❌ Error fetching monteurs:', monteursResult.error);
      if (chantiersResult.error) console.error('❌ Error fetching chantiers:', chantiersResult.error);
      if (clientsResult.error) console.error('❌ Error fetching clients:', clientsResult.error);

      // Mettre à jour les états
      setMonteurs(monteursResult.data || []);
      setChantiers(chantiersResult.data || []);
      setClients(clientsResult.data || []);
      setLignesCouts(coutsResult.data || []);
      setAffectations(affectResult.data || []);
      setVersements(versementsResult.data || []);
      setArticles(articlesResult.data || []);
      setMouvements(mouvementsResult.data || []);

      // Transformer les profiles en users
      if (profilesResult.data) {
        const mappedUsers: User[] = profilesResult.data.map((p: any) => ({
          id: p.id,
          email: p.email,
          name: p.name || p.email || 'Utilisateur',
          role: p.role,
          isActive: p.is_active,
          allowedModules: p.allowed_modules
        }));
        setUsers(mappedUsers);
      }

      console.log('✅ Data loaded successfully');

    } catch (error) {
      console.error('❌ Exception in fetchAllData:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      // Nettoyer les données si déconnecté
      setChantiers([]);
      setMonteurs([]);
      setClients([]);
      setAffectations([]);
      setLignesCouts([]);
      setVersements([]);
      setArticles([]);
      setMouvements([]);
      setUsers([]);
    }
  }, [user]);

  const refreshData = async () => {
    await fetchAllData();
  };

  // --- ACTIONS MONTEURS ---
  const addMonteur = async (monteur: Monteur) => {
    try {
      console.log('➕ Adding monteur:', monteur);
      
      const { data, error } = await supabase
        .from('monteurs')
        .insert([monteur])
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding monteur:', error);
        throw error;
      }
      
      if (data) {
        setMonteurs(prev => [...prev, data as Monteur]);
        console.log('✅ Monteur added successfully');
      }
    } catch (error) {
      console.error('❌ Exception adding monteur:', error);
      throw error;
    }
  };

  const updateMonteur = async (monteur: Monteur) => {
    try {
      const { error } = await supabase
        .from('monteurs')
        .update(monteur)
        .eq('matricule', monteur.matricule);

      if (error) {
        console.error('❌ Error updating monteur:', error);
        throw error;
      }
      
      setMonteurs(prev => prev.map(m => 
        m.matricule === monteur.matricule ? monteur : m
      ));
    } catch (error) {
      console.error('❌ Exception updating monteur:', error);
      throw error;
    }
  };

  const deleteMonteur = async (matricule: number) => {
    try {
      console.log('🗑️ Deleting monteur with matricule:', matricule);
      
      const { error } = await supabase
        .from('monteurs')
        .delete()
        .eq('matricule', matricule);

      if (error) {
        console.error('❌ Error deleting monteur:', error);
        throw error;
      }
      
      setMonteurs(prev => prev.filter(m => m.matricule !== matricule));
      console.log('✅ Monteur deleted successfully');
    } catch (error) {
      console.error('❌ Exception deleting monteur:', error);
      throw error;
    }
  };

  // --- ACTIONS CHANTIERS ---
  const addChantier = async (chantier: Chantier) => {
    try {
      console.log('➕ Adding chantier:', chantier);
      
      const { id_chantier, ...rest } = chantier;
      const { data, error } = await supabase
        .from('chantiers')
        .insert([{
          ...rest,
          monteurs_locaux: chantier.monteurs_locaux || []
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding chantier:', error);
        throw error;
      }

      if (data) {
        setChantiers(prev => [...prev, data as Chantier]);
        console.log('✅ Chantier added successfully');
      }
    } catch (error) {
      console.error('❌ Exception adding chantier:', error);
      throw error;
    }
  };

  const updateChantier = async (chantier: Chantier) => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .update({
          ...chantier,
          monteurs_locaux: chantier.monteurs_locaux || []
        })
        .eq('id_chantier', chantier.id_chantier);

      if (error) {
        console.error('❌ Error updating chantier:', error);
        throw error;
      }

      setChantiers(prev => prev.map(c => 
        c.id_chantier === chantier.id_chantier ? chantier : c
      ));
    } catch (error) {
      console.error('❌ Exception updating chantier:', error);
      throw error;
    }
  };

  const deleteChantier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .delete()
        .eq('id_chantier', id);

      if (error) {
        console.error('❌ Error deleting chantier:', error);
        throw error;
      }

      setChantiers(prev => prev.filter(c => c.id_chantier !== id));
    } catch (error) {
      console.error('❌ Exception deleting chantier:', error);
      throw error;
    }
  };

  // ... Les autres fonctions restent similaires ...

  const value: DataContextType = {
    loadingData,
    refreshData,
    chantiers, addChantier, updateChantier, deleteChantier,
    monteurs, addMonteur, updateMonteur, deleteMonteur,
    affectations, 
    addAffectation: async (a) => {
      try {
        const { id_affectation, ...rest } = a;
        const { data, error } = await supabase.from('affectations').insert([rest]).select();
        if (error) throw error;
        if (data) setAffectations(prev => [...prev, data[0] as AffectationMonteur]);
      } catch (error) {
        console.error('Error adding affectation:', error);
        throw error;
      }
    },
    removeAffectation: async (id) => {
      try {
        const { error } = await supabase.from('affectations').delete().eq('id_affectation', id);
        if (error) throw error;
        setAffectations(prev => prev.filter(a => a.id_affectation !== id));
      } catch (error) {
        console.error('Error removing affectation:', error);
        throw error;
      }
    },
    lignesCouts, 
    addCout: async (c) => {
      try {
        const { id_cout, ...rest } = c;
        const { data, error } = await supabase.from('lignes_couts').insert([rest]).select();
        if (error) throw error;
        if (data) setLignesCouts(prev => [...prev, data[0] as LigneCout]);
      } catch (error) {
        console.error('Error adding cout:', error);
        throw error;
      }
    },
    deleteCout: async (id) => {
      try {
        const { error } = await supabase.from('lignes_couts').delete().eq('id_cout', id);
        if (error) throw error;
        setLignesCouts(prev => prev.filter(c => c.id_cout !== id));
      } catch (error) {
        console.error('Error deleting cout:', error);
        throw error;
      }
    },
    versements, 
    addVersement: async (v) => {
      try {
        const { id_versement, ...rest } = v;
        const { data, error } = await supabase.from('versements').insert([rest]).select();
        if (error) throw error;
        if (data) setVersements(prev => [...prev, data[0] as Versement]);
      } catch (error) {
        console.error('Error adding versement:', error);
        throw error;
      }
    },
    deleteVersement: async (id) => {
      try {
        const { error } = await supabase.from('versements').delete().eq('id_versement', id);
        if (error) throw error;
        setVersements(prev => prev.filter(v => v.id_versement !== id));
      } catch (error) {
        console.error('Error deleting versement:', error);
        throw error;
      }
    },
    clients, 
    addClient: async (c) => {
      try {
        const { id_client, ...rest } = c;
        const { data, error } = await supabase.from('clients').insert([rest]).select();
        if (error) throw error;
        if (data) setClients(prev => [...prev, data[0] as Client]);
      } catch (error) {
        console.error('Error adding client:', error);
        throw error;
      }
    },
    updateClient: async (c) => {
      try {
        const { error } = await supabase.from('clients').update(c).eq('id_client', c.id_client);
        if (error) throw error;
        setClients(prev => prev.map(cl => cl.id_client === c.id_client ? c : cl));
      } catch (error) {
        console.error('Error updating client:', error);
        throw error;
      }
    },
    deleteClient: async (id) => {
      try {
        const { error } = await supabase.from('clients').delete().eq('id_client', id);
        if (error) throw error;
        setClients(prev => prev.filter(c => c.id_client !== id));
      } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
      }
    },
    users, 
    addUser: async (u) => {
      try {
        const { id, password, ...rest } = u;
        const { data, error } = await supabase.from('profiles').insert([{
          id: id,
          email: rest.email,
          name: rest.name,
          role: rest.role,
          is_active: rest.isActive,
          allowed_modules: rest.allowedModules
        }]).select();

        if (error) throw error;

        if (data) {
          const mapped: User = {
            id: data[0].id,
            email: data[0].email,
            name: data[0].name,
            role: data[0].role,
            isActive: data[0].is_active,
            allowedModules: data[0].allowed_modules
          };
          setUsers(prev => [...prev, mapped]);
        }
      } catch (error) {
        console.error('Error adding user:', error);
        throw error;
      }
    },
    updateUser: async (u) => {
      try {
        const { error } = await supabase.from('profiles').update({
          name: u.name,
          role: u.role,
          is_active: u.isActive,
          allowed_modules: u.allowedModules
        }).eq('id', u.id);

        if (error) throw error;
        setUsers(prev => prev.map(user => user.id === u.id ? u : user));
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },
    deleteUser: async (id) => {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    },
    articles, 
    addArticle: async (a) => {
      try {
        const { id_article, ...rest } = a;
        const { data, error } = await supabase.from('articles_stock').insert([rest]).select();
        if (error) throw error;
        if (data) setArticles(prev => [...prev, data[0] as ArticleStock]);
      } catch (error) {
        console.error('Error adding article:', error);
        throw error;
      }
    },
    mouvements, 
    addMouvement: async (m) => {
      try {
        const { id_mouvement, ...rest } = m;
        const { data: moveData, error: moveError } = await supabase.from('mouvements_stock').insert([rest]).select();
        
        if (moveError) throw moveError;

        if (moveData) {
          setMouvements(prev => [moveData[0] as MouvementStock, ...prev]);
          
          // Update article quantity
          const article = articles.find(a => a.id_article === m.id_article);
          if (article) {
            const newQty = m.type === 'ENTREE' 
              ? Number(article.quantite) + Number(m.quantite)
              : Number(article.quantite) - Number(m.quantite);

            const { error: artError } = await supabase
              .from('articles_stock')
              .update({ quantite: newQty })
              .eq('id_article', article.id_article);

            if (artError) throw artError;

            setArticles(prev => prev.map(a => 
              a.id_article === article.id_article ? { ...a, quantite: newQty } : a
            ));
          }
        }
      } catch (error) {
        console.error('Error adding mouvement:', error);
        throw error;
      }
    }
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

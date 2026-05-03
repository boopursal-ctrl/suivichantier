// contexts/DataContext.tsx - VERSION CORRIGÉE
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chantier, Monteur, Client, LigneCout, AffectationMonteur, Versement, ArticleStock, MouvementStock, User, UserRole, Interimaire } from '../types';
import { mysqlService } from '../services/mysqlService';
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
  updateAffectation: (a: AffectationMonteur) => Promise<void>;

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
  stock: ArticleStock[]; // Alias for articles
  mouvements: MouvementStock[];
  addMouvement: (m: MouvementStock) => Promise<void>;

  loadingData: boolean;
  refreshData: () => Promise<void>;

  interimaires: Interimaire[];
  addInterimaire: (i: Interimaire) => Promise<void>;
  updateInterimaire: (i: Interimaire) => Promise<void>;
  logAction: (action: string, entityType: 'chantier' | 'resource' | 'finance' | 'system', entityId: string, details?: any) => Promise<void>;
  
  globalLaborCost: { [id_chantier: string]: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const debug = (...args: any[]) => {
  console.log('📊 [Data]', ...args);
};

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
  const [interimaires, setInterimaires] = useState<Interimaire[]>([]);
  const [globalLaborCost, setGlobalLaborCost] = useState<{ [id_chantier: string]: number }>({});

  // Charger toutes les données
  const fetchAllData = async () => {
    if (!user) {
      console.log('⏸️ No user, skipping data fetch');
      return;
    }

    setLoadingData(true);
    console.log('🔄 Fetching all data for user:', user.email);

    try {
      // Charger les données en parallèle (Priorité MySQL pour stabilité)
      debug('🔄 Starting Promise.all for all tables...');

      const [
        monteursResult,
        chantiersResult,
        clientsResult,
        coutsResult,
        affectResult,
        versementsResult,
        articlesResult,
        mouvementsResult,
        profilesResult,
        interimairesResult,
        financeSummaryResult
      ] = await Promise.all([
        mysqlService.query('get_monteurs')
          .then(data => { debug('✅ Monteurs loaded (MySQL)'); return { data, error: null }; })
          .catch(() => { debug('⚠️ Monteurs MySQL failed, returning empty'); return { data: [], error: null }; }),
        mysqlService.query('get_chantiers')
          .then(data => { debug('✅ Chantiers loaded (MySQL)'); return { data, error: null }; })
          .catch(() => { debug('⚠️ Chantiers MySQL failed, returning empty'); return { data: [], error: null }; }),
        mysqlService.query('get_clients')
          .then(data => { debug('✅ Clients loaded (MySQL)'); return { data, error: null }; })
          .catch(() => { debug('⚠️ Clients MySQL failed, returning empty'); return { data: [], error: null }; }),
        
        // Pour l'instant, on désactive les appels Supabase sur les autres tables pour éviter les erreurs DNS incessantes
        mysqlService.query('get_couts').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_affectations').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_versements').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_stock').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_mouvements').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_users').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_interimaires').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null })),
        mysqlService.query('get_global_finance_summary').then(data => ({ data, error: null })).catch(() => ({ data: [], error: null }))
      ]);

      debug('📊 Data results received, processing...');

      // Gérer les résultats
      if (monteursResult.error) console.error('❌ Error fetching monteurs:', monteursResult.error);
      if (chantiersResult.error) console.error('❌ Error fetching chantiers:', chantiersResult.error);
      if (clientsResult.error) console.error('❌ Error fetching clients:', clientsResult.error);

      // Mettre à jour les états avec vérification de type et conversion des booléens
      const formattedMonteurs = (Array.isArray(monteursResult.data) ? monteursResult.data : []).map((m: any) => ({
        ...m,
        is_blacklisted: m.is_blacklisted === "1" || m.is_blacklisted === 1 || m.is_blacklisted === true,
        actif: m.actif === "1" || m.actif === 1 || m.actif === true || m.actif === undefined
      }));
      setMonteurs(formattedMonteurs);

      const formattedInterim = (Array.isArray(interimairesResult.data) ? interimairesResult.data : []).map((i: any) => ({
        ...i,
        is_blacklisted: i.is_blacklisted === "1" || i.is_blacklisted === 1 || i.is_blacklisted === true
      }));
      setInterimaires(formattedInterim);
      
      setChantiers(Array.isArray(chantiersResult.data) ? chantiersResult.data : []);
      setClients(Array.isArray(clientsResult.data) ? clientsResult.data : []);
      setLignesCouts(Array.isArray(coutsResult.data) ? coutsResult.data : []);
      setAffectations(Array.isArray(affectResult.data) ? affectResult.data : []);
      setVersements(Array.isArray(versementsResult.data) ? versementsResult.data : []);
      setArticles(Array.isArray(articlesResult.data) ? articlesResult.data : []);
      setMouvements(Array.isArray(mouvementsResult.data) ? mouvementsResult.data : []);

      // Traitement du résumé financier
      if (Array.isArray(financeSummaryResult.data)) {
        const laborMap: { [key: string]: number } = {};
        financeSummaryResult.data.forEach((item: any) => {
          const id = String(item.id_chantier || '').trim();
          if (id) {
            laborMap[id] = Number(item.total_main_doeuvre_reelle || 0);
          }
        });
        setGlobalLaborCost(laborMap);
      }

      // Transformer les profiles en users avec vérification
      if (Array.isArray(profilesResult.data)) {
        const mappedUsers: User[] = profilesResult.data.map((p: any) => ({
          id: p.id,
          email: p.email,
          name: p.name || p.email || 'Utilisateur',
          role: p.role,
          isActive: Boolean(p.is_active),
          allowedModules: Array.isArray(p.allowed_modules) ? p.allowed_modules : ['dashboard']
        }));
        setUsers(mappedUsers);
      } else {
        setUsers([]);
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
  // Dans DataContext.tsx - Correction de addMonteur
  const addMonteur = async (monteur: Monteur) => {
    try {
      debug('👷 Adding monteur to MySQL...');
      await mysqlService.query('save_monteur', {}, monteur);
      setMonteurs(prev => [...prev, monteur]);
    } catch (error) {
      console.error('❌ Exception adding monteur:', error);
      throw error;
    }
  };

  const updateMonteur = async (monteur: Monteur) => {
    try {
      debug('👷 Updating monteur in MySQL...');
      await mysqlService.query('save_monteur', {}, monteur);
      setMonteurs(prev => prev.map(m => m.matricule === monteur.matricule ? monteur : m));
    } catch (error) {
      console.error('❌ Exception updating monteur:', error);
      throw error;
    }
  };

  const deleteMonteur = async (matricule: number) => {
    try {
      debug('👷 Deleting monteur from MySQL...');
      await mysqlService.query('delete_monteur', { matricule: String(matricule) });
      setMonteurs(prev => prev.filter(m => m.matricule !== matricule));
    } catch (error) {
      console.error('❌ Exception deleting monteur:', error);
      throw error;
    }
  };
  // --- ACTIONS CHANTIERS ---
  const addChantier = async (chantier: Chantier) => {
    try {
      debug('🏗️ Adding chantier to MySQL...');
      await mysqlService.query('save_chantier', {}, chantier);
      setChantiers(prev => [...prev, chantier]);
    } catch (error) {
      console.error('❌ Exception adding chantier:', error);
      throw error;
    }
  };

  const updateChantier = async (chantier: Chantier) => {
    try {
      debug('🏗️ Updating chantier in MySQL...');
      await mysqlService.query('save_chantier', {}, chantier);
      setChantiers(prev => prev.map(c => c.id_chantier === chantier.id_chantier ? chantier : c));
    } catch (error) {
      console.error('❌ Exception updating chantier:', error);
      throw error;
    }
  };

  const deleteChantier = async (id: string) => {
    try {
      debug('🏗️ Deleting chantier from MySQL...');
      await mysqlService.query('delete_chantier', { id_chantier: id });
      
      const chantierToDelete = chantiers.find(c => c.id_chantier === id);
      
      setChantiers(prev => prev.filter(c => c.id_chantier !== id));
      await logAction('DELETE_CHANTIER', 'chantier', id, { ref: chantierToDelete?.ref_chantier, nom: chantierToDelete?.nom_client });
    } catch (error) {
      console.error('❌ Exception deleting chantier:', error);
      throw error;
    }
  };

  const logAction = async (action: string, entityType: 'chantier' | 'resource' | 'finance' | 'system', entityId: string, details?: any) => {
    if (!user) return;
    try {
      // Log vers MySQL uniquement
      await mysqlService.query('save_audit_log', {}, {
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: JSON.stringify(details || {}),
        respo_user_id: user.id
      });
    } catch (e) {
      // Silencieux : les logs ne doivent pas bloquer l'application
    }
  };

  const value: DataContextType = {
    loadingData,
    refreshData,
    logAction,
    chantiers, addChantier, updateChantier, deleteChantier,
    monteurs, addMonteur, updateMonteur, deleteMonteur,
    affectations,
    addAffectation: async (a) => {
      try {
        debug('🔗 Adding affectation to MySQL...');
        await mysqlService.query('save_affectation', {}, a);
        setAffectations(prev => [...prev, a]);
      } catch (error) {
        console.error('Error adding affectation:', error);
        throw error;
      }
    },
    removeAffectation: async (id) => {
      try {
        debug('🔗 Removing affectation from MySQL...');
        await mysqlService.query('delete_affectation', { id });
        setAffectations(prev => prev.filter(a => a.id_affectation !== id));
      } catch (error) {
        console.error('Error removing affectation:', error);
        throw error;
      }
    },
    updateAffectation: async (a) => {
      try {
        debug('🔗 Updating affectation in MySQL...');
        await mysqlService.query('save_affectation', {}, a);
        setAffectations(prev => prev.map(aff => aff.id_affectation === a.id_affectation ? a : aff));
      } catch (error) {
        console.error('Error updating affectation:', error);
        throw error;
      }
    },
    lignesCouts,
    addCout: async (c) => {
      try {
        debug('💰 Adding cout to MySQL...');
        await mysqlService.query('save_cout', {}, c);
        setLignesCouts(prev => [...prev, c]);
      } catch (error) {
        console.error('Error adding cout:', error);
        throw error;
      }
    },
    deleteCout: async (id) => {
      try {
        debug('💰 Deleting cout from MySQL...');
        await mysqlService.query('delete_cout', { id });
        setLignesCouts(prev => prev.filter(c => c.id_cout !== id));
      } catch (error) {
        console.error('Error deleting cout:', error);
        throw error;
      }
    },
    versements,
    addVersement: async (v) => {
      try {
        debug('💸 Adding versement to MySQL...');
        await mysqlService.query('save_versement', {}, v);
        setVersements(prev => [...prev, v]);
      } catch (error) {
        console.error('Error adding versement:', error);
        throw error;
      }
    },
    deleteVersement: async (id) => {
      try {
        debug('💸 Deleting versement from MySQL...');
        await mysqlService.query('delete_versement', { id });
        setVersements(prev => prev.filter(v => v.id_versement !== id));
      } catch (error) {
        console.error('Error deleting versement:', error);
        throw error;
      }
    },
    clients,
    addClient: async (c) => {
      try {
        debug('👥 Adding client to MySQL...');
        await mysqlService.query('save_client', {}, c);
        setClients(prev => [...prev, c]);
      } catch (error) {
        console.error('Error adding client:', error);
        throw error;
      }
    },
    updateClient: async (c) => {
      try {
        debug('👥 Updating client in MySQL...');
        await mysqlService.query('save_client', {}, c);
        setClients(prev => prev.map(cl => cl.id_client === c.id_client ? c : cl));
      } catch (error) {
        console.error('Error updating client:', error);
        throw error;
      }
    },
    deleteClient: async (id) => {
      try {
        debug('👥 Deleting client from MySQL...');
        await mysqlService.query('delete_client', { id });
        setClients(prev => prev.filter(c => c.id_client !== id));
      } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
      }
    },
    users,
    addUser: async (u) => {
      try {
        console.log('👤 addUser: Création 100% MySQL...');

        const newUserId = crypto.randomUUID();
        
        const userData = {
          id: newUserId,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive !== false,
          allowedModules: u.allowedModules || ['dashboard'],
          password: u.password || '12345678'
        };

        await mysqlService.query('save_user', {}, userData);
        
        const mapped: User = {
          id: newUserId,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          allowedModules: u.allowedModules || ['dashboard']
        };
        
        setUsers(prev => [...prev, mapped]);
        console.log('✅ Utilisateur créé avec succès (MySQL)');
      } catch (error) {
        console.error('❌ Exception addUser:', error);
        throw error;
      }
    },
    updateUser: async (u) => {
      try {
        // Sync MySQL uniquement
        await mysqlService.query('save_user', {}, u);
        setUsers(prev => prev.map(user => user.id === u.id ? u : user));
        console.log('✅ Utilisateur mis à jour (MySQL)');
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },
    deleteUser: async (id) => {
      try {
        // Sync MySQL uniquement
        await mysqlService.query('delete_user', { id });
        setUsers(prev => prev.filter(u => u.id !== id));
        console.log('✅ Utilisateur supprimé (MySQL)');
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    },
    articles,
    stock: articles, // Export articles as 'stock' alias
    addArticle: async (a) => {
      try {
        debug('📦 Adding article to MySQL...');
        await mysqlService.query('save_article', {}, a);
        setArticles(prev => [...prev, a]);
      } catch (error) {
        console.error('Error adding article:', error);
        throw error;
      }
    },
    mouvements,
    addMouvement: async (m) => {
      try {
        debug('🔄 Adding mouvement to MySQL...');
        await mysqlService.query('save_mouvement', {}, m);
        
        // Refresh local state (MySQL calculates stock automatically in connect.php, but we update UI here)
        const op = m.type === 'ENTREE' ? 1 : -1;
        const newQty = Number(m.quantite) * op;
        
        setMouvements(prev => [m, ...prev]);
        setArticles(prev => prev.map(art => 
          art.id_article === m.id_article ? { ...art, quantite: Number(art.quantite) + newQty } : art
        ));
      } catch (error) {
        console.error('Error adding mouvement:', error);
        throw error;
      }
    },
    interimaires,
    addInterimaire: async (i) => {
      try {
        debug('👷 Adding interimaire to MySQL...');
        await mysqlService.query('save_interimaire', {}, i);
        setInterimaires(prev => [...prev, i]);
      } catch (error) {
        console.error('Error adding interimaire:', error);
        throw error;
      }
    },
    updateInterimaire: async (i) => {
      try {
        debug('👷 Updating interimaire in MySQL...');
        await mysqlService.query('save_interimaire', {}, i);
        setInterimaires(prev => prev.map(item => item.id === i.id ? i : item));
      } catch (error) {
        console.error('Error updating interimaire:', error);
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

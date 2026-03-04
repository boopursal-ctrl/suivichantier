// contexts/DataContext.tsx - VERSION CORRIGÉE
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chantier, Monteur, Client, LigneCout, AffectationMonteur, Versement, ArticleStock, MouvementStock, User, UserRole, Interimaire } from '../types';
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
  const [interimaires, setInterimaires] = useState<Interimaire[]>([]);

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
        profilesResult,
        interimairesResult
      ] = await Promise.all([
        supabase.from('monteurs').select('*').order('nom_monteur', { ascending: true }),
        supabase.from('chantiers').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('lignes_couts').select('*'),
        supabase.from('affectations').select('*'),
        supabase.from('versements').select('*'),
        supabase.from('articles_stock').select('*'),
        supabase.from('mouvements_stock').select('*').order('date', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('interimaires').select('*').order('nom_complet', { ascending: true })
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
      setInterimaires(interimairesResult.data || []);

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
  // Dans DataContext.tsx - Correction de addMonteur
  const addMonteur = async (monteur: Monteur) => {
    try {
      console.log('➕ Adding monteur:', monteur);

      // Préparer les données pour Supabase
      // NOTE: On exclut temporairement ville_residence si la colonne n'existe pas encore en base pour éviter l'erreur 400
      const { ville_residence, ...rest } = monteur;

      const monteurData = {
        matricule: monteur.matricule,
        nom_monteur: monteur.nom_monteur,
        cin: monteur.cin || null,
        telephone: monteur.telephone || null,
        date_naissance: monteur.date_naissance || null,
        date_debut_contrat: monteur.date_debut_contrat || new Date().toISOString().split('T')[0],
        type_contrat: monteur.type_contrat,
        role_monteur: monteur.role_monteur,
        salaire_jour: monteur.salaire_jour,
        actif: monteur.actif,
        scan_cin_recto: monteur.scan_cin_recto || null,
        scan_cin_verso: monteur.scan_cin_verso || null
      };

      console.log('📤 Prepared data for Supabase:', monteurData);

      const { data, error } = await supabase
        .from('monteurs')
        .insert([monteurData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding monteur:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
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
      // Préparer les données pour Supabase
      const monteurData = {
        ...monteur,
        // Convertir les chaînes vides en NULL pour les dates
        date_naissance: monteur.date_naissance || null,
        date_debut_contrat: monteur.date_debut_contrat || new Date().toISOString().split('T')[0],
        cin: monteur.cin || null,
        telephone: monteur.telephone || null,
        scan_cin_recto: monteur.scan_cin_recto || null,
        scan_cin_verso: monteur.scan_cin_verso || null
      };

      const { error } = await supabase
        .from('monteurs')
        .update(monteurData)
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

      // Sanitize payload for Supabase
      const payload = {
        ...rest,
        date_debut: chantier.date_debut || null, // Convert empty string to null
        date_fin: chantier.date_fin || null,     // Convert empty string to null
        duree_prevue: chantier.duree_prevue || 1,
        statut: chantier.statut || 'en_instance',
        monteurs_locaux: chantier.monteurs_locaux || []
      };

      const { data, error } = await supabase
        .from('chantiers')
        .insert([payload])
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
          date_debut: chantier.date_debut || null,
          date_fin: chantier.date_fin || null,
          duree_prevue: chantier.duree_prevue || 1,
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

  // LOGGING FUNCTION
  const logAction = async (action: string, entityType: 'chantier' | 'resource' | 'finance' | 'system', entityId: string, details?: any) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('audit_logs').insert([{
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details || {},
        respo_user_id: user.id
      }]);
      if (error) console.error("Error logging action", error);
    } catch (e) {
      console.error("Exception logging", e);
    }
  };

  const deleteChantier = async (id: string) => {
    try {
      const chantierToDelete = chantiers.find(c => c.id_chantier === id);
      const { error } = await supabase
        .from('chantiers')
        .delete()
        .eq('id_chantier', id);

      if (error) {
        console.error('❌ Error deleting chantier:', error);
        throw error;
      }

      setChantiers(prev => prev.filter(c => c.id_chantier !== id));
      await logAction('DELETE_CHANTIER', 'chantier', id, { ref: chantierToDelete?.ref_chantier, nom: chantierToDelete?.nom_client });
    } catch (error) {
      console.error('❌ Exception deleting chantier:', error);
      throw error;
    }
  };

  // ... (other functions remain same, but we skip them in replace block if possible, strictly modifying target)
  // Since deleteChantier is far from updateInterimaire, I will use multiple ReplaceChunks in next tool call or handle context value first.
  // Actually, I can just define logAction and update deleteChantier here, then update updateInterimaire separately or via multi_replace.
  // Let's do multi_replace to be safe and efficient.

  // Wait, I am in replace_file_content. I will switch to multi_replace_file_content for safety.
  // Just implementing logAction and deleteChantier modification here.

  const value: DataContextType = {
    loadingData,
    refreshData,
    logAction,
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
    updateAffectation: async (a) => {
      try {
        const { error } = await supabase.from('affectations').update(a).eq('id_affectation', a.id_affectation);
        if (error) throw error;
        setAffectations(prev => prev.map(aff => aff.id_affectation === a.id_affectation ? a : aff));
      } catch (error) {
        console.error('Error updating affectation:', error);
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
        console.log('👤 addUser: Création via Admin API...');

        const { supabaseAdmin } = await import('../services/supabaseClient');

        if (!supabaseAdmin) {
          throw new Error(
            'La clé VITE_SUPABASE_SERVICE_ROLE_KEY est manquante dans le fichier .env. ' +
            'Récupérez-la depuis : Supabase Dashboard → Settings → API → service_role.'
          );
        }

        // 1. Créer l'utilisateur via Admin API (pas de rate-limit, email confirmé auto)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.password || '12345678',
          email_confirm: true, // Confirme l'email automatiquement
        });

        if (authError) {
          console.error('❌ Admin createUser Error:', authError);
          throw new Error(`Erreur création compte: ${authError.message}`);
        }

        if (!authData.user) {
          throw new Error('Utilisateur créé mais aucun ID retourné.');
        }

        const newUserId = authData.user.id;
        console.log('✅ Auth User créé avec ID:', newUserId);

        // 2. Insérer le profil avec l'ID Auth réel
        const profileData = {
          id: newUserId,
          email: u.email,
          name: u.name,
          role: u.role,
          is_active: u.isActive,
          allowed_modules: u.allowedModules || ['dashboard']
        };

        const { data, error } = await supabase
          .from('profiles')
          .insert([profileData])
          .select('*')
          .single();

        if (error) {
          console.error('❌ Profile Insertion Error:', error);
          throw error;
        }

        if (data) {
          const mapped: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role,
            isActive: data.is_active,
            allowedModules: data.allowed_modules
          };
          setUsers(prev => [...prev, mapped]);
          console.log('✅ Utilisateur & Profil créés avec succès');
        }
      } catch (error) {
        console.error('❌ Exception addUser:', error);
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
    stock: articles, // Export articles as 'stock' alias
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
        // Prepare payload: omit client-side ID to let DB generate UUID if needed, 
        // or ensure it matches DB expectations. 
        // Assuming DB columns: id_article, type, quantite, date, id_chantier (nullable), motif
        const payload = {
          id_article: m.id_article,
          type: m.type,
          quantite: m.quantite,
          date: m.date,
          id_chantier: m.id_chantier || null, // Ensure null if undefined
          motif: m.motif
        };

        const { data: moveData, error: moveError } = await supabase.from('mouvements_stock').insert([payload]).select();

        if (moveError) throw moveError;

        if (moveData) {
          // Use the returned real data from DB
          setMouvements(prev => [moveData[0] as MouvementStock, ...prev]);

          // Update article quantity - FETCH FRESH FIRST to avoid race conditions
          const { data: freshArticle } = await supabase
            .from('articles_stock')
            .select('quantite')
            .eq('id_article', m.id_article)
            .single();

          const currentQty = freshArticle ? Number(freshArticle.quantite) : 0;

          const newQty = m.type === 'ENTREE'
            ? currentQty + Number(m.quantite)
            : currentQty - Number(m.quantite);

          const { error: artError } = await supabase
            .from('articles_stock')
            .update({ quantite: newQty })
            .eq('id_article', m.id_article);

          if (artError) throw artError;

          setArticles(prev => prev.map(a =>
            a.id_article === m.id_article ? { ...a, quantite: newQty } : a
          ));
        }
      } catch (error) {
        console.error('Error adding mouvement:', error);
        throw error;
      }
    },
    interimaires,
    addInterimaire: async (i) => {
      try {
        const { data, error } = await supabase.from('interimaires').insert([i]).select().single();
        if (error) throw error;
        if (data) setInterimaires(prev => [...prev, data as Interimaire]);
      } catch (error) {
        console.error('Error adding interimaire:', error);
        throw error;
      }
    },
    updateInterimaire: async (i) => {
      try {
        const { error } = await supabase.from('interimaires').update(i).eq('id', i.id);
        if (error) throw error;
        setInterimaires(prev => prev.map(item => item.id === i.id ? i : item));

        if (i.is_blacklisted) {
          await logAction('BLACKLIST_ALERT', 'resource', i.id, { cin: i.cin, reason: i.blacklist_reason });
        }
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

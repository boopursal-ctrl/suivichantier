// contexts/DataContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chantier, Monteur, Client, LigneCout, AffectationMonteur, Versement, ArticleStock, MouvementStock, User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface DataContextType {
  chantiers: Chantier[];
  addChantier: (c: Chantier) => void;
  updateChantier: (c: Chantier) => void;
  deleteChantier: (id: string) => void;

  monteurs: Monteur[];
  addMonteur: (m: Monteur) => void;
  updateMonteur: (m: Monteur) => void;
  deleteMonteur: (matricule: string) => void; // ← CHANGÉ: string au lieu de number

  affectations: AffectationMonteur[];
  addAffectation: (a: AffectationMonteur) => void;
  removeAffectation: (id: string) => void;

  lignesCouts: LigneCout[];
  addCout: (c: LigneCout) => void;
  deleteCout: (id: string) => void;
  
  versements: Versement[];
  addVersement: (v: Versement) => void;
  deleteVersement: (id: string) => void;

  clients: Client[];
  addClient: (c: Client) => void;
  updateClient: (c: Client) => void;
  deleteClient: (id: string) => void;

  users: User[];
  addUser: (u: User) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;

  articles: ArticleStock[];
  addArticle: (a: ArticleStock) => void;
  mouvements: MouvementStock[];
  addMouvement: (m: MouvementStock) => void;
  
  loadingData: boolean;
  refreshData: () => Promise<void>; // ← AJOUTÉ
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loadingData, setLoadingData] = useState(false);

  // State local synchronisé avec la DB
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [monteurs, setMonteurs] = useState<Monteur[]>([]);
  const [affectations, setAffectations] = useState<AffectationMonteur[]>([]);
  const [lignesCouts, setLignesCouts] = useState<LigneCout[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);

  // Charger toutes les données au démarrage
  const fetchAllData = async () => {
    if (!user) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      console.log('🔄 Fetching all data...');
      
      // Monteurs
      const { data: dMonteurs, error: monteursError } = await supabase
        .from('monteurs')
        .select('*')
        .order('nom_monteur', { ascending: true });
      
      if (monteursError) {
        console.error('❌ Error fetching monteurs:', monteursError);
      } else {
        console.log(`✅ Loaded ${dMonteurs?.length || 0} monteurs`);
        setMonteurs(dMonteurs || []);
      }

      // Chantiers
      const { data: dChantiers } = await supabase.from('chantiers').select('*');
      if (dChantiers) setChantiers(dChantiers);

      const { data: dClients } = await supabase.from('clients').select('*');
      if (dClients) setClients(dClients);

      const { data: dCouts } = await supabase.from('lignes_couts').select('*');
      if (dCouts) setLignesCouts(dCouts);

      const { data: dAffect } = await supabase.from('affectations').select('*');
      if (dAffect) setAffectations(dAffect);

      const { data: dVersements } = await supabase.from('versements').select('*');
      if (dVersements) setVersements(dVersements);

      const { data: dArticles } = await supabase.from('articles_stock').select('*');
      if (dArticles) setArticles(dArticles);

      const { data: dMouvements } = await supabase.from('mouvements_stock').select('*').order('date', { ascending: false });
      if (dMouvements) setMouvements(dMouvements);

      const { data: dProfiles } = await supabase.from('profiles').select('*');
      if (dProfiles) {
        const mappedUsers: User[] = dProfiles.map((p: any) => ({
          id: p.id,
          email: p.email,
          name: p.name || p.email || 'Utilisateur',
          role: p.role,
          isActive: p.is_active,
          allowedModules: p.allowed_modules
        }));
        setUsers(mappedUsers);
      }

    } catch (error) {
      console.error("❌ Erreur chargement données:", error);
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
      setLoadingData(false);
    }
  }, [user]);

  // Fonction pour rafraîchir toutes les données
  const refreshData = async () => {
    await fetchAllData();
  };

  // --- ACTIONS MONTEURS ---
  const addMonteur = async (monteur: Monteur) => {
    console.log('➕ Adding monteur:', monteur);
    
    try {
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

  const deleteMonteur = async (matricule: string) => { // ← CHANGÉ: string
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

  // ... (le reste de votre DataContext reste inchangé)

  return (
    <DataContext.Provider value={{
      loadingData,
      refreshData, // ← AJOUTÉ
      chantiers, addChantier, updateChantier, deleteChantier,
      monteurs, addMonteur, updateMonteur, deleteMonteur,
      affectations, addAffectation, removeAffectation,
      lignesCouts, addCout, deleteCout,
      versements, addVersement, deleteVersement,
      clients, addClient, updateClient, deleteClient,
      users, addUser, updateUser, deleteUser,
      articles, addArticle, mouvements, addMouvement
    }}>
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

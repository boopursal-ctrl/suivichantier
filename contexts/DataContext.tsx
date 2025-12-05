
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
  deleteMonteur: (matricule: number) => void;

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
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoadingData(true);
    try {
      const { data: dChantiers } = await supabase.from('chantiers').select('*');
      if (dChantiers) setChantiers(dChantiers);

      const { data: dClients } = await supabase.from('clients').select('*');
      if (dClients) setClients(dClients);

      const { data: dMonteurs } = await supabase.from('monteurs').select('*');
      if (dMonteurs) setMonteurs(dMonteurs);

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
          name: p.name || p.email || 'Utilisateur', // Fallback si nom vide
          role: p.role,
          isActive: p.is_active,
          allowedModules: p.allowed_modules
        }));
        setUsers(mappedUsers);
      }

    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoadingData(false);
    }
  };

  // --- ACTIONS CHANTIERS ---
  const addChantier = async (chantier: Chantier) => {
    const { id_chantier, ...rest } = chantier; // Let DB generate ID if needed, or use specific ID logic
    // We use .select() to get the inserted object with the real ID
    const { data, error } = await supabase.from('chantiers').insert([{
        ...rest,
        // Ensure jsonb compatibility
        monteurs_locaux: chantier.monteurs_locaux || [] 
    }]).select();

    if (error) console.error(error);
    if (data) setChantiers([...chantiers, data[0] as Chantier]);
  };

  const updateChantier = async (chantier: Chantier) => {
    const { error } = await supabase.from('chantiers').update({
        ...chantier,
        monteurs_locaux: chantier.monteurs_locaux || []
    }).eq('id_chantier', chantier.id_chantier);
    
    if (!error) {
      setChantiers(chantiers.map(c => c.id_chantier === chantier.id_chantier ? chantier : c));
    }
  };

  const deleteChantier = async (id: string) => {
    const { error } = await supabase.from('chantiers').delete().eq('id_chantier', id);
    if (!error) {
      setChantiers(chantiers.filter(c => c.id_chantier !== id));
    }
  };

  // --- ACTIONS CLIENTS ---
  const addClient = async (client: Client) => {
    const { id_client, ...rest } = client;
    const { data, error } = await supabase.from('clients').insert([rest]).select();
    if (data) setClients([...clients, data[0] as Client]);
  };

  const updateClient = async (client: Client) => {
    const { error } = await supabase.from('clients').update(client).eq('id_client', client.id_client);
    if (!error) setClients(clients.map(c => c.id_client === client.id_client ? client : c));
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id_client', id);
    if (!error) setClients(clients.filter(c => c.id_client !== id));
  };

  // --- ACTIONS MONTEURS ---
  const addMonteur = async (monteur: Monteur) => {
    const { data, error } = await supabase.from('monteurs').insert([monteur]).select();
    if (data) setMonteurs([...monteurs, data[0] as Monteur]);
  };

  const updateMonteur = async (monteur: Monteur) => {
    const { error } = await supabase.from('monteurs').update(monteur).eq('matricule', monteur.matricule);
    if (!error) setMonteurs(monteurs.map(m => m.matricule === monteur.matricule ? monteur : m));
  };

  const deleteMonteur = async (matricule: number) => {
    const { error } = await supabase.from('monteurs').delete().eq('matricule', matricule);
    if (!error) setMonteurs(monteurs.filter(m => m.matricule !== matricule));
  };

  // --- ACTIONS AFFECTATIONS ---
  const addAffectation = async (affectation: AffectationMonteur) => {
    const { id_affectation, ...rest } = affectation;
    const { data, error } = await supabase.from('affectations').insert([rest]).select();
    if (data) setAffectations([...affectations, data[0] as AffectationMonteur]);
  };

  const removeAffectation = async (id: string) => {
    const { error } = await supabase.from('affectations').delete().eq('id_affectation', id);
    if (!error) setAffectations(affectations.filter(a => a.id_affectation !== id));
  };

  // --- ACTIONS COÛTS ---
  const addCout = async (cout: LigneCout) => {
    const { id_cout, ...rest } = cout;
    const { data, error } = await supabase.from('lignes_couts').insert([rest]).select();
    if (data) setLignesCouts([...lignesCouts, data[0] as LigneCout]);
  };

  const deleteCout = async (id: string) => {
    const { error } = await supabase.from('lignes_couts').delete().eq('id_cout', id);
    if (!error) setLignesCouts(lignesCouts.filter(c => c.id_cout !== id));
  };

  // --- ACTIONS VERSEMENTS ---
  const addVersement = async (versement: Versement) => {
    const { id_versement, ...rest } = versement;
    const { data, error } = await supabase.from('versements').insert([rest]).select();
    if (data) setVersements([...versements, data[0] as Versement]);
  };

  const deleteVersement = async (id: string) => {
    const { error } = await supabase.from('versements').delete().eq('id_versement', id);
    if (!error) setVersements(versements.filter(v => v.id_versement !== id));
  };

  // --- ACTIONS STOCK ---
  const addArticle = async (article: ArticleStock) => {
    const { id_article, ...rest } = article;
    const { data, error } = await supabase.from('articles_stock').insert([rest]).select();
    if (data) setArticles([...articles, data[0] as ArticleStock]);
  };

  const addMouvement = async (mouvement: MouvementStock) => {
    const { id_mouvement, ...rest } = mouvement;
    // 1. Insert Movement
    const { data: moveData, error: moveError } = await supabase.from('mouvements_stock').insert([rest]).select();
    
    if (moveData) {
      setMouvements([moveData[0] as MouvementStock, ...mouvements]);
      
      // 2. Update Article Quantity
      const article = articles.find(a => a.id_article === mouvement.id_article);
      if (article) {
        const newQty = mouvement.type === 'ENTREE' 
          ? Number(article.quantite) + Number(mouvement.quantite)
          : Number(article.quantite) - Number(mouvement.quantite);

        const { error: artError } = await supabase
          .from('articles_stock')
          .update({ quantite: newQty })
          .eq('id_article', article.id_article);

        if (!artError) {
          setArticles(articles.map(a => a.id_article === article.id_article ? { ...a, quantite: newQty } : a));
        }
      }
    }
  };

  // --- ACTIONS USERS (Profiles) ---
  const addUser = async (user: User) => {
    // Note: On ne peut pas créer un Auth User depuis le client sans clef admin.
    // On simule l'ajout dans la table profiles pour l'affichage,
    // mais en production il faut utiliser l'invitation Supabase ou une Edge Function.
    alert("Note: En production, utilisez le dashboard Supabase pour inviter l'utilisateur. Ici nous créons uniquement le profil.");
    
    const { id, password, ...rest } = user;
    const { data, error } = await supabase.from('profiles').insert([{
        id: id, // Normalement l'ID vient de auth.users
        email: rest.email,
        name: rest.name,
        role: rest.role,
        is_active: rest.isActive,
        allowed_modules: rest.allowedModules
    }]).select();

    if (data) {
        const mapped: User = {
            id: data[0].id,
            email: data[0].email,
            name: data[0].name,
            role: data[0].role,
            isActive: data[0].is_active,
            allowedModules: data[0].allowed_modules
        };
        setUsers([...users, mapped]);
    }
  };

  const updateUser = async (user: User) => {
    const { error } = await supabase.from('profiles').update({
        name: user.name,
        role: user.role,
        is_active: user.isActive,
        allowed_modules: user.allowedModules
    }).eq('id', user.id);

    if (!error) setUsers(users.map(u => u.id === user.id ? user : u));
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) setUsers(users.filter(u => u.id !== id));
  };

  return (
    <DataContext.Provider value={{
      loadingData,
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

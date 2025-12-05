
export type StatutChantier = 'actif' | 'terminé' | 'archivé';
export type TypeCout = 'transport_commun' | 'hebergement' | 'restauration' | 'transport_local' | 'outillage_affecte' | 'sous_traitant';
export type TypeMouvement = 'ENTREE' | 'SORTIE';
export type TypeContrat = 'CDI' | 'CDD' | 'ANAPEC' | 'FREELANCE';

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'COMPTABILITE' | 'TECHNIQUE' | 'ADMINISTRATIF';
export type RoleMonteur = 'OUVRIER' | 'CHEF_CHANTIER';
export type AppModule = 'dashboard' | 'chantiers' | 'stock' | 'clients' | 'monteurs' | 'rapports' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  password?: string; // In a real app, this is hashed. Here for mock auth.
  isActive: boolean;
  allowedModules: AppModule[];
}

export interface Client {
  id_client: string;
  nom_client: string; // STEEP PLASTIQUE, etc.
  code_client: string; // C646
  ice?: string; // Identifiant Commun de l'Entreprise (Maroc)
  ville_code: string; // 539
  adresse?: string;
  contact_responsable: string;
  telephone?: string;
  email?: string;
}

export interface Monteur {
  matricule: number; // 208
  nom_monteur: string; // OMAR
  role_monteur?: RoleMonteur; // Chef ou Ouvrier
  cin?: string; 
  date_naissance?: string; 
  telephone?: string; 
  salaire_jour: number; 
  type_contrat?: TypeContrat; 
  date_debut_contrat?: string; 
  actif: boolean;
  scan_cin_recto?: string; // URL de l'image
  scan_cin_verso?: string; // URL de l'image
}

export interface LigneCout {
  id_cout: string;
  id_chantier: string;
  type_cout: TypeCout;
  montant_prevu: number;
  cout_unitaire: number;
  quantite: number;
  montant_reel: number;
  commentaire?: string;
  statut: 'validé' | 'en attente';
}

export interface AffectationMonteur {
  id_affectation: string;
  id_chantier: string;
  matricule: number;
  nom_monteur: string;
  salaire_jour: number;
  zone_travail: string;
  date_entree: string;
  date_sortie: string;
  jours_arret: number;
}

export interface Versement {
  id_versement: string;
  id_chantier: string;
  montant: number;
  date: string;
  numero: 1 | 2 | 3 | number; // Updated to allow more flexibility
}

// Nouvelle interface pour la traçabilité RH des intérimaires
export interface MonteurLocal {
  id: string;
  nom_complet: string;
  cin: string;
  salaire_jour: number;
  jours_travailles: number;
}

export interface Chantier {
  id_chantier: string;
  numero_ordre: number;
  ref_chantier: string; // 13-C602-240724
  id_client: string;
  code_client: string;
  nom_client: string;
  date_debut: string;
  date_fin: string;
  budget_prevu: number;
  trans_compta: 'Manuel' | 'Auto';
  responsable_chantier: string;
  plan_reference: string;
  documents_at_rc: boolean;
  vehicule_utilise: boolean;
  statut: StatutChantier;
  ville_code: string;
  // Modification pour supporter la liste détaillée
  monteurs_locaux?: MonteurLocal[];
  
  // Nouveaux champs demandés
  adresse?: string; // Adresse spécifique du chantier
  commentaire?: string; // Observations / Contraintes accès
}

export interface ArticleStock {
  id_article: string;
  reference: string;
  nom: string;
  categorie: 'EPI' | 'OUTILLAGE' | 'CONSOMMABLE' | 'MATERIEL';
  quantite: number;
  unite: string;
  seuil_alerte: number;
  emplacement?: string;
}

export interface MouvementStock {
  id_mouvement: string;
  id_article: string;
  type: TypeMouvement;
  quantite: number;
  date: string;
  id_chantier?: string; // Si sortie vers chantier
  motif?: string;
}

export interface DashboardStats {
  activeCount: number;
  completedCount: number;
  totalBudgetPrevu: number;
  totalBudgetReel: number;
  globalDifference: number;
  margeMoyenne: number;
  alertCount: number;
}

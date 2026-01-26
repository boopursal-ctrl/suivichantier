

export type StatutChantier = 'actif' | 'terminé' | 'archivé' | 'en_instance';
export type TypeCout = 'transport_commun' | 'hebergement' | 'restauration' | 'transport_local' | 'outillage_affecte' | 'sous_traitant' | 'autre' | 'main_doeuvre_extra' | 'prime' | 'heures_supp';
export type TypeMouvement = 'ENTREE' | 'SORTIE';
export type TypeContrat = 'CDI' | 'CDD' | 'ANAPEC' | 'FREELANCE';
export type StatutContrat = 'actif' | 'clos' | 'suspendu';


// ... (skipping unchanged parts)

export interface MouvementStock {
  id_mouvement: string;
  id_article: string;
  type: TypeMouvement;
  quantite: number;
  date: string;
  id_chantier?: string; // Si sortie vers chantier
  motif?: string;
  beneficiaire_id?: string; // ID monteur/intérimaire pour tracing individuel
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'COMPTABILITE' | 'TECHNIQUE' | 'ADMINISTRATIF';
export type RoleMonteur = 'OUVRIER' | 'CHEF_CHANTIER';
export type AppModule = 'dashboard' | 'chantiers' | 'stock' | 'clients' | 'monteurs' | 'rapports' | 'admin' | 'matrice' | 'planning' | 'chef_chantier' | 'pointage_mensuel' | 'contrats';

export type StadeAvancement = 'démarrage' | 'en_cours' | 'avancé' | 'presque_terminé' | 'finalisé';

export interface HistoriqueAvancement {
  date: string;
  pourcentage: number;
  commentaire?: string;
  stade: StadeAvancement;
}

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
  matricule: number;
  nom_monteur: string;
  telephone?: string | null; // ← Peut être null
  cin?: string | null;
  date_naissance?: string | null; // ← Peut être null
  date_debut_contrat?: string | null;
  type_contrat: TypeContrat;
  role_monteur: RoleMonteur;
  salaire_jour: number;
  actif: boolean;
  scan_cin_recto?: string | null;
  scan_cin_verso?: string | null;
  ville_residence?: string; // Ville de résidence pour calculs frais déplacement
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface pour les contrats des monteurs par chantier
export interface Contrat {
  id_contrat: string; // UUID
  matricule: number; // Référence au monteur
  nom_monteur: string; // Nom du monteur (dénormalisé pour faciliter les requêtes)
  id_chantier: string; // Référence au chantier
  ref_chantier: string; // Référence du chantier (dénormalisé)
  nom_client: string; // Nom du client (dénormalisé)

  // Informations personnelles (reprises du monteur)
  cin?: string;
  date_naissance?: string;
  adresse?: string;
  ville_residence?: string;
  nationalite?: string;

  // Informations du contrat
  type_contrat: TypeContrat;
  role_monteur: RoleMonteur; // OUVRIER ou CHEF_CHANTIER
  salaire_journalier: number;

  // Dates
  date_debut: string; // Date de début du contrat (= date d'affectation au chantier)
  date_fin?: string; // Date de fin du contrat (= date de clôture ou réaffectation)

  // Statut
  statut: StatutContrat; // 'actif', 'clos', 'suspendu'

  // Métadonnées
  created_at?: string;
  updated_at?: string;
  created_by?: string; // Email de l'utilisateur qui a créé le contrat
  closed_by?: string; // Email de l'utilisateur qui a clôturé le contrat
  motif_cloture?: string; // Raison de la clôture (réaffectation, fin de chantier, etc.)
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
  related_monteur_id?: string; // ID (matricule or local id) to link expense to a specific worker
  statut: 'validé' | 'en attente';
  created_at?: string;
}

export interface AffectationMonteur {
  id_affectation: string;
  id_chantier: string;
  matricule: number;
  nom_monteur: string;
  salaire_jour: number;
  zone_travail: string;
  date_entree: string;
  date_sortie?: string; // Optional: if undefined, means currently active
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
  date_debut?: string;
  date_fin?: string;
  ville_residence?: string;
  type?: 'INTERIMAIRE' | 'PREVU';
}


// Nouvelle interface centralisée pour la gestion des intérimaires
export interface Interimaire {
  id: string; // UUID unique
  cin: string; // Clé unique fonctionnelle
  nom_complet: string;
  telephone?: string;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  created_at?: string;
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
  duree_prevue?: number; // Durée en jours (pour la planification)
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
  chef_chantier?: string; // Chef de Chantier (Terrain)

  // Avancement
  taux_avancement?: number; // 0-100
  stade_avancement?: StadeAvancement;
  historique_avancement?: HistoriqueAvancement[];
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
  beneficiaire_id?: string; // ID monteur/intérimaire pour tracing individuel
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

export interface AuditLog {
  id: string;
  action: string; // 'DELETE_CHANTIER', 'BLACKLIST_TOGGLE', etc.
  entity_type: 'chantier' | 'resource' | 'finance' | 'system';
  entity_id: string;
  details: any;
  user_email?: string; // For display
  created_at: string;
}

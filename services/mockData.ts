



import { Chantier, Client, Monteur, LigneCout, AffectationMonteur, Versement, ArticleStock, MouvementStock, User } from '../types';

export const USERS: User[] = [
  { 
    id: 'u1', 
    email: 'admin@btp-maroc.ma', 
    name: 'Mouad Admin', 
    role: 'ADMIN', 
    password: '123', 
    isActive: true, 
    allowedModules: ['dashboard', 'chantiers', 'stock', 'clients', 'monteurs', 'rapports', 'admin'] 
  },
  { 
    id: 'u2', 
    email: 'manager@btp-maroc.ma', 
    name: 'Karim Chef', 
    role: 'MANAGER', 
    password: '123', 
    isActive: true, 
    allowedModules: ['dashboard', 'chantiers', 'stock', 'monteurs'] 
  },
  { 
    id: 'u3', 
    email: 'rh@btp-maroc.ma', 
    name: 'Sarah RH', 
    role: 'ADMINISTRATIF', 
    password: '123', 
    isActive: true, 
    allowedModules: ['dashboard', 'monteurs', 'clients'] 
  },
  { 
    id: 'u4', 
    email: 'compta@btp-maroc.ma', 
    name: 'Amine Finance', 
    role: 'COMPTABILITE', 
    password: '123', 
    isActive: true, 
    allowedModules: ['dashboard', 'rapports', 'chantiers'] 
  },
  { 
    id: 'u5', 
    email: 'tech@btp-maroc.ma', 
    name: 'Youssef Tech', 
    role: 'TECHNIQUE', 
    password: '123', 
    isActive: true, 
    allowedModules: ['dashboard', 'stock', 'chantiers'] 
  }
];

export const CLIENTS: Client[] = [
  { id_client: '1', nom_client: 'STEEP PLASTIQUE', code_client: 'C646', ice: '001528372000054', ville_code: '539', adresse: 'Zone Franche Kenitra', contact_responsable: 'M. Alami', telephone: '0661123456', email: 'achat@steep.ma' },
  { id_client: '2', nom_client: 'LEAR CORPORATION', code_client: 'C602', ice: '000112233445566', ville_code: '535', adresse: 'Technopolis Rabat', contact_responsable: 'Mme. Benjelloun', telephone: '0661987654', email: 'finance@lear.com' },
  { id_client: '3', nom_client: 'COPAG', code_client: 'C369', ice: '002233445566778', ville_code: '528', adresse: 'Zone Industrielle Ait Melloul', contact_responsable: 'M. Tazi', telephone: '0663456789' },
  { id_client: '4', nom_client: 'AMA DETERGENT', code_client: 'C473', ice: '009988776655443', ville_code: '523', adresse: 'Jorf Lasfar El Jadida', contact_responsable: 'M. Kadiri', telephone: '0523344556' },
  { id_client: '5', nom_client: 'DUFRY MAROC', code_client: 'C374', ice: '112233445566778', ville_code: '524', adresse: 'Aéroport Menara Marrakech', contact_responsable: 'M. Bennani', telephone: '0661000000' },
];

export const MONTEURS: Monteur[] = [
  { matricule: 208, nom_monteur: 'OMAR', salaire_jour: 120, actif: true, cin: 'KB123456', role_monteur: 'OUVRIER' },
  { matricule: 237, nom_monteur: 'NABIL', salaire_jour: 100, actif: true, cin: 'J456123', role_monteur: 'OUVRIER' },
  { matricule: 236, nom_monteur: 'MOUAD', salaire_jour: 100, actif: true, cin: 'BE987654', role_monteur: 'OUVRIER' },
  { matricule: 138, nom_monteur: 'ABDELGHAFOUR', salaire_jour: 100, actif: true, cin: 'WA123456', role_monteur: 'OUVRIER' },
  { matricule: 159, nom_monteur: 'SAID', salaire_jour: 150, actif: true, cin: 'G123456', role_monteur: 'CHEF_CHANTIER' }, // Responsable
  { matricule: 238, nom_monteur: 'ABDELOUAFI', salaire_jour: 100, actif: true, cin: 'D987654', role_monteur: 'OUVRIER' },
  { matricule: 239, nom_monteur: 'SALAH', salaire_jour: 100, actif: true, cin: 'F123456', role_monteur: 'OUVRIER' },
  { matricule: 103, nom_monteur: 'KHALID', salaire_jour: 120, actif: true, cin: 'T123456', role_monteur: 'CHEF_CHANTIER' },
];

export const CHANTIERS: Chantier[] = [
  {
    id_chantier: '1',
    numero_ordre: 13,
    ref_chantier: '13-C602-240724',
    id_client: '2',
    code_client: 'C602',
    nom_client: 'LEAR CORPORATION',
    date_debut: '2024-06-10',
    date_fin: '2024-07-11',
    budget_prevu: 50940,
    trans_compta: 'Auto',
    responsable_chantier: 'SAID',
    plan_reference: '882-02-03-V1-C602-23',
    documents_at_rc: true,
    vehicule_utilise: true,
    statut: 'actif',
    ville_code: '535',
    adresse: 'Zone Sud - Extension B',
    commentaire: 'Attention accès limité le weekend.',
    monteurs_locaux: []
  },
  {
    id_chantier: '2',
    numero_ordre: 14,
    ref_chantier: '14-C369-150324',
    id_client: '3',
    code_client: 'C369',
    nom_client: 'COPAG',
    date_debut: '2024-06-03',
    date_fin: '2024-07-19',
    budget_prevu: 22300,
    trans_compta: 'Manuel',
    responsable_chantier: 'KHALID',
    plan_reference: 'XXXX',
    documents_at_rc: true,
    vehicule_utilise: true,
    statut: 'actif',
    ville_code: '528',
    adresse: 'Hangar Principal',
    commentaire: 'Installation progressive selon disponibilité des dalles.',
    monteurs_locaux: [
      { id: 'ml1', nom_complet: 'Ahmed Intérim', cin: 'J998877', salaire_jour: 100, jours_travailles: 17 },
      { id: 'ml2', nom_complet: 'Yassine Helper', cin: 'J112233', salaire_jour: 100, jours_travailles: 17 }
    ]
  },
  {
    id_chantier: '3',
    numero_ordre: 15,
    ref_chantier: '15-C473-250724',
    id_client: '4',
    code_client: 'C473',
    nom_client: 'AMA DETERGENT',
    date_debut: '2024-08-01',
    date_fin: '2024-08-15',
    budget_prevu: 21310,
    trans_compta: 'Auto',
    responsable_chantier: 'SAID',
    plan_reference: 'AMA-EXT-24',
    documents_at_rc: false,
    vehicule_utilise: true,
    statut: 'actif',
    ville_code: '523',
    adresse: 'Usine Jorf',
    commentaire: 'En attente validation plans.',
    monteurs_locaux: []
  }
];

export const LIGNES_COUTS: LigneCout[] = [
  // Chantier 1
  { id_cout: '101', id_chantier: '1', type_cout: 'transport_commun', montant_prevu: 480, cout_unitaire: 120, quantite: 4, montant_reel: 500, statut: 'validé', commentaire: 'Ticket autocar' },
  { id_cout: '102', id_chantier: '1', type_cout: 'hebergement', montant_prevu: 10800, cout_unitaire: 100, quantite: 108, montant_reel: 10500, statut: 'validé', commentaire: 'Appartement' },
  { id_cout: '103', id_chantier: '1', type_cout: 'restauration', montant_prevu: 7560, cout_unitaire: 70, quantite: 108, montant_reel: 7560, statut: 'validé' },
  { id_cout: '104', id_chantier: '1', type_cout: 'outillage_affecte', montant_prevu: 1500, cout_unitaire: 1500, quantite: 1, montant_reel: 2000, statut: 'en attente', commentaire: 'Achat perceuse urgence' },
  
  // Chantier 2
  { id_cout: '201', id_chantier: '2', type_cout: 'transport_commun', montant_prevu: 200, cout_unitaire: 50, quantite: 4, montant_reel: 200, statut: 'validé' },
  { id_cout: '202', id_chantier: '2', type_cout: 'hebergement', montant_prevu: 6800, cout_unitaire: 100, quantite: 68, montant_reel: 6800, statut: 'validé' },
  { id_cout: '203', id_chantier: '2', type_cout: 'restauration', montant_prevu: 4760, cout_unitaire: 70, quantite: 68, montant_reel: 4760, statut: 'validé' },
  { id_cout: '204', id_chantier: '2', type_cout: 'transport_local', montant_prevu: 1700, cout_unitaire: 25, quantite: 68, montant_reel: 1700, statut: 'validé', commentaire: 'Ça dépends de la ville' },
];

export const AFFECTATIONS: AffectationMonteur[] = [
  // Chantier 1
  { id_affectation: 'a1', id_chantier: '1', matricule: 208, nom_monteur: 'OMAR', salaire_jour: 120, zone_travail: '535', date_entree: '2024-06-10', date_sortie: '2024-07-03', jours_arret: 0 },
  { id_affectation: 'a2', id_chantier: '1', matricule: 237, nom_monteur: 'NABIL', salaire_jour: 100, zone_travail: '535', date_entree: '2024-06-10', date_sortie: '2024-07-03', jours_arret: 0 },
  { id_affectation: 'a3', id_chantier: '1', matricule: 236, nom_monteur: 'MOUAD', salaire_jour: 100, zone_travail: '535', date_entree: '2024-06-15', date_sortie: '2024-07-03', jours_arret: 2 },
  
  // Chantier 2 (AMA/COPAG EXEMPLE)
  { id_affectation: 'a4', id_chantier: '2', matricule: 103, nom_monteur: 'KHALID', salaire_jour: 120, zone_travail: '523', date_entree: '2024-06-03', date_sortie: '2024-06-20', jours_arret: 0 },
  { id_affectation: 'a5', id_chantier: '2', matricule: 236, nom_monteur: 'MOUAD', salaire_jour: 100, zone_travail: '523', date_entree: '2024-06-03', date_sortie: '2024-06-20', jours_arret: 0 },
  
];

export const VERSEMENTS: Versement[] = [
  { id_versement: 'v1', id_chantier: '1', montant: 15000, date: '2024-06-01', numero: 1 },
  { id_versement: 'v2', id_chantier: '1', montant: 15000, date: '2024-06-20', numero: 2 },
];

// --- GESTION STOCK DATA ---

export const ARTICLES_STOCK: ArticleStock[] = [
  { id_article: 'a1', reference: 'EPI-001', nom: 'Casque de chantier', categorie: 'EPI', quantite: 12, unite: 'pcs', seuil_alerte: 5, emplacement: 'Rayon A' },
  { id_article: 'a2', reference: 'EPI-002', nom: 'Gilet fluorescent', categorie: 'EPI', quantite: 4, unite: 'pcs', seuil_alerte: 10, emplacement: 'Rayon A' },
  { id_article: 'a3', reference: 'OUT-001', nom: 'Perceuse à percussion', categorie: 'OUTILLAGE', quantite: 3, unite: 'pcs', seuil_alerte: 2, emplacement: 'Armoire Securisée' },
  { id_article: 'a4', reference: 'CONS-001', nom: 'Câble électrique 2.5mm', categorie: 'CONSOMMABLE', quantite: 150, unite: 'mètres', seuil_alerte: 50, emplacement: 'Rayon B' },
  { id_article: 'a5', reference: 'CONS-002', nom: 'Disjoncteur 16A', categorie: 'CONSOMMABLE', quantite: 45, unite: 'pcs', seuil_alerte: 20, emplacement: 'Rayon B' },
  { id_article: 'a6', reference: 'EPI-003', nom: 'Chaussures Sécurité 42', categorie: 'EPI', quantite: 1, unite: 'paire', seuil_alerte: 3, emplacement: 'Rayon A' },
];

export const MOUVEMENTS_STOCK: MouvementStock[] = [
  { id_mouvement: 'm1', id_article: 'a1', type: 'ENTREE', quantite: 20, date: '2024-05-01', motif: 'Commande Fournisseur #2390' },
  { id_mouvement: 'm2', id_article: 'a1', type: 'SORTIE', quantite: 8, date: '2024-06-09', id_chantier: '1', motif: 'Affectation équipe Said' },
  { id_mouvement: 'm3', id_article: 'a4', type: 'SORTIE', quantite: 100, date: '2024-06-12', id_chantier: '1', motif: 'Installation électrique' },
  { id_mouvement: 'm4', id_article: 'a3', type: 'SORTIE', quantite: 1, date: '2024-07-02', id_chantier: '2', motif: 'Prêt outillage' },
];

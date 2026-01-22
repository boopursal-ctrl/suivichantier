// Types pour le module Chef de Chantier

export interface RapportChantier {
    id_rapport: string;
    id_chantier: string;
    date_rapport: string; // YYYY-MM-DD
    chef_chantier: string;

    // Effectifs
    effectif_prevu: number;
    effectif_reel: number;
    heures_travaillees: number;

    // Avancement
    avancement_prevu: number; // Pourcentage
    avancement_reel: number;   // Pourcentage

    // Conditions
    meteo?: 'beau' | 'pluie' | 'vent' | 'neige' | 'autre';
    conditions_travail?: 'normales' | 'difficiles' | 'impossibles';
    observations?: string;
    problemes_rencontres?: string;

    // Validation
    valide: boolean;
    date_validation?: string;

    created_at: string;
    updated_at: string;
}

export interface PresenceMonteur {
    id_presence: string;
    id_rapport: string;
    matricule: string;
    nom_monteur: string;

    present: boolean;
    heures_travaillees: number;
    heures_supplementaires: number;

    motif_absence?: 'maladie' | 'conge' | 'autre';
    commentaire?: string;

    created_at: string;
}

export interface TacheChantier {
    id_tache: string;
    id_chantier: string;

    nom_tache: string;
    description?: string;
    ordre_execution: number;

    // Dates
    date_debut_prevue?: string;
    date_fin_prevue?: string;
    date_debut_reelle?: string;
    date_fin_reelle?: string;

    // Avancement
    pourcentage_prevu: number;
    pourcentage_reel: number;

    // Statut
    statut: 'non_commence' | 'en_cours' | 'termine' | 'bloque';

    created_at: string;
    updated_at: string;
}

export interface PhotoChantier {
    id_photo: string;
    id_rapport?: string;
    id_chantier: string;

    url_photo: string;
    legende?: string;
    type_photo: 'avancement' | 'probleme' | 'securite' | 'qualite';

    uploaded_by: string;
    uploaded_at: string;
}

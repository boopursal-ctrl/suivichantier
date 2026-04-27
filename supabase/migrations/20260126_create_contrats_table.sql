-- Migration: Création de la table contrats pour la gestion automatique des contrats par chantier
-- Date: 2026-01-26

-- Création de la table contrats
CREATE TABLE IF NOT EXISTS contrats (
    id_contrat UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricule INTEGER NOT NULL,
    nom_monteur TEXT NOT NULL,
    id_chantier UUID NOT NULL,
    ref_chantier TEXT NOT NULL,
    nom_client TEXT NOT NULL,
    
    -- Informations personnelles
    cin TEXT,
    date_naissance DATE,
    adresse TEXT,
    ville_residence TEXT,
    nationalite TEXT DEFAULT 'MAROCAINE',
    
    -- Informations du contrat
    type_contrat TEXT NOT NULL CHECK (type_contrat IN ('CDI', 'CDD', 'ANAPEC', 'FREELANCE')),
    role_monteur TEXT NOT NULL CHECK (role_monteur IN ('OUVRIER', 'CHEF_CHANTIER')),
    salaire_journalier NUMERIC(10, 2) NOT NULL DEFAULT 120.00,
    
    -- Dates
    date_debut DATE NOT NULL,
    date_fin DATE,
    
    -- Statut
    statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'clos', 'suspendu')),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    closed_by TEXT,
    motif_cloture TEXT,
    
    -- Contraintes
    CONSTRAINT fk_monteur FOREIGN KEY (matricule) REFERENCES monteurs(matricule) ON DELETE CASCADE,
    CONSTRAINT fk_chantier FOREIGN KEY (id_chantier) REFERENCES chantiers(id_chantier) ON DELETE CASCADE,
    CONSTRAINT check_dates CHECK (date_fin IS NULL OR date_fin >= date_debut)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_contrats_matricule ON contrats(matricule);
CREATE INDEX IF NOT EXISTS idx_contrats_chantier ON contrats(id_chantier);
CREATE INDEX IF NOT EXISTS idx_contrats_statut ON contrats(statut);
CREATE INDEX IF NOT EXISTS idx_contrats_dates ON contrats(date_debut, date_fin);

-- Index unique pour garantir qu'un monteur ne peut avoir qu'un seul contrat actif à la fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_contrats_actif_unique 
ON contrats(matricule) 
WHERE statut = 'actif';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_contrats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contrats_updated_at
    BEFORE UPDATE ON contrats
    FOR EACH ROW
    EXECUTE FUNCTION update_contrats_updated_at();

-- Fonction pour clôturer automatiquement les contrats actifs d'un monteur
CREATE OR REPLACE FUNCTION close_active_contracts(
    p_matricule INTEGER,
    p_date_fin DATE,10
    p_motif TEXT,
    p_closed_by TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE contrats
    SET 
        statut = 'clos',
        date_fin = p_date_fin,
        motif_cloture = p_motif,
        closed_by = p_closed_by,
        updated_at = NOW()
    WHERE 
        matricule = p_matricule 
        AND statut = 'actif';
END;
$$ LANGUAGE plpgsql;

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE contrats IS 'Gestion des contrats des monteurs par chantier avec gestion automatique';
COMMENT ON COLUMN contrats.id_contrat IS 'Identifiant unique du contrat';
COMMENT ON COLUMN contrats.matricule IS 'Matricule du monteur';
COMMENT ON COLUMN contrats.id_chantier IS 'Identifiant du chantier';
COMMENT ON COLUMN contrats.statut IS 'Statut du contrat: actif (en cours), clos (terminé), suspendu (temporairement arrêté)';
COMMENT ON COLUMN contrats.date_debut IS 'Date de début du contrat (= date d''affectation au chantier)';
COMMENT ON COLUMN contrats.date_fin IS 'Date de fin du contrat (= date de clôture ou réaffectation)';
COMMENT ON COLUMN contrats.motif_cloture IS 'Raison de la clôture: réaffectation, fin de chantier, démission, etc.';

-- Migration: Module Chef de Chantier - Rapports Terrain
-- Date: 2025-12-28

-- Table pour les rapports journaliers du chef de chantier
CREATE TABLE IF NOT EXISTS rapports_chantier (
    id_rapport UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_chantier UUID NOT NULL REFERENCES chantiers(id_chantier) ON DELETE CASCADE,
    date_rapport DATE NOT NULL,
    chef_chantier TEXT NOT NULL, -- Nom du chef qui a saisi le rapport
    
    -- Effectifs réels
    effectif_prevu INTEGER DEFAULT 0,
    effectif_reel INTEGER DEFAULT 0,
    heures_travaillees DECIMAL(5,2) DEFAULT 0,
    
    -- Avancement
    avancement_prevu DECIMAL(5,2) DEFAULT 0, -- Pourcentage prévu à cette date
    avancement_reel DECIMAL(5,2) DEFAULT 0,  -- Pourcentage réel constaté
    
    -- Conditions et observations
    meteo TEXT, -- 'beau', 'pluie', 'vent', 'neige'
    conditions_travail TEXT, -- 'normales', 'difficiles', 'impossibles'
    observations TEXT,
    problemes_rencontres TEXT,
    
    -- Validation
    valide BOOLEAN DEFAULT FALSE,
    date_validation TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Contrainte: un seul rapport par chantier par jour
    UNIQUE(id_chantier, date_rapport)
);

-- Table pour les présences quotidiennes des monteurs
CREATE TABLE IF NOT EXISTS presences_monteurs (
    id_presence UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_rapport UUID NOT NULL REFERENCES rapports_chantier(id_rapport) ON DELETE CASCADE,
    matricule TEXT NOT NULL,
    nom_monteur TEXT NOT NULL,
    
    -- Présence
    present BOOLEAN DEFAULT TRUE,
    heures_travaillees DECIMAL(4,2) DEFAULT 8.0,
    heures_supplementaires DECIMAL(4,2) DEFAULT 0,
    
    -- Raison d'absence si non présent
    motif_absence TEXT, -- 'maladie', 'conge', 'autre'
    commentaire TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les tâches/jalons du chantier
CREATE TABLE IF NOT EXISTS taches_chantier (
    id_tache UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_chantier UUID NOT NULL REFERENCES chantiers(id_chantier) ON DELETE CASCADE,
    
    nom_tache TEXT NOT NULL,
    description TEXT,
    ordre_execution INTEGER DEFAULT 0,
    
    -- Dates
    date_debut_prevue DATE,
    date_fin_prevue DATE,
    date_debut_reelle DATE,
    date_fin_reelle DATE,
    
    -- Avancement
    pourcentage_prevu DECIMAL(5,2) DEFAULT 0,
    pourcentage_reel DECIMAL(5,2) DEFAULT 0,
    
    -- Statut
    statut TEXT DEFAULT 'non_commence', -- 'non_commence', 'en_cours', 'termine', 'bloque'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les photos/documents terrain
CREATE TABLE IF NOT EXISTS photos_chantier (
    id_photo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_rapport UUID REFERENCES rapports_chantier(id_rapport) ON DELETE CASCADE,
    id_chantier UUID NOT NULL REFERENCES chantiers(id_chantier) ON DELETE CASCADE,
    
    url_photo TEXT NOT NULL,
    legende TEXT,
    type_photo TEXT, -- 'avancement', 'probleme', 'securite', 'qualite'
    
    uploaded_by TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_rapports_chantier ON rapports_chantier(id_chantier, date_rapport DESC);
CREATE INDEX IF NOT EXISTS idx_presences_rapport ON presences_monteurs(id_rapport);
CREATE INDEX IF NOT EXISTS idx_taches_chantier ON taches_chantier(id_chantier, ordre_execution);
CREATE INDEX IF NOT EXISTS idx_photos_chantier ON photos_chantier(id_chantier, uploaded_at DESC);

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_rapports_chantier_updated_at ON rapports_chantier;
CREATE TRIGGER update_rapports_chantier_updated_at
    BEFORE UPDATE ON rapports_chantier
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_taches_chantier_updated_at ON taches_chantier;
CREATE TRIGGER update_taches_chantier_updated_at
    BEFORE UPDATE ON taches_chantier
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE rapports_chantier IS 'Rapports journaliers saisis par les chefs de chantier';
COMMENT ON TABLE presences_monteurs IS 'Présences quotidiennes des monteurs sur chantier';
COMMENT ON TABLE taches_chantier IS 'Décomposition du chantier en tâches/jalons';
COMMENT ON TABLE photos_chantier IS 'Photos et documents terrain';

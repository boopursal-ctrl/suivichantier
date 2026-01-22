-- Migration: Pointage Mensuel des Monteurs
-- Date: 2025-12-28

-- Table pour les pointages mensuels
CREATE TABLE IF NOT EXISTS pointages_mensuels (
    id_pointage UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_chantier UUID NOT NULL REFERENCES chantiers(id_chantier) ON DELETE CASCADE,
    matricule TEXT NOT NULL,
    nom_monteur TEXT NOT NULL,
    
    -- Période
    mois INTEGER NOT NULL, -- 1-12
    annee INTEGER NOT NULL,
    
    -- Salaire
    salaire_journalier DECIMAL(10,2) DEFAULT 120.00,
    
    -- Jours travaillés (stockés en JSON pour flexibilité)
    -- Format: { "2025-07-08": 1, "2025-07-10": 1, ... }
    jours_travailles JSONB DEFAULT '{}'::jsonb,
    
    -- Totaux
    total_jours DECIMAL(5,2) DEFAULT 0,
    total_salaire DECIMAL(10,2) DEFAULT 0,
    
    -- Avances
    avances DECIMAL(10,2) DEFAULT 0,
    
    -- Frais
    frais_transport DECIMAL(10,2) DEFAULT 0,
    frais_repas DECIMAL(10,2) DEFAULT 0,
    frais_loyer DECIMAL(10,2) DEFAULT 0,
    frais_gasoil DECIMAL(10,2) DEFAULT 0,
    
    -- Calculs
    total_charges DECIMAL(10,2) DEFAULT 0,
    net_a_payer DECIMAL(10,2) DEFAULT 0,
    
    -- Statut
    statut TEXT DEFAULT 'en_cours', -- 'en_cours', 'valide', 'paye'
    valide_par TEXT,
    date_validation TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Contrainte unique
    UNIQUE(id_chantier, matricule, mois, annee)
);

-- Table pour les détails quotidiens (optionnel, pour plus de détails)
CREATE TABLE IF NOT EXISTS pointages_quotidiens (
    id_detail UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_pointage UUID NOT NULL REFERENCES pointages_mensuels(id_pointage) ON DELETE CASCADE,
    
    date_travail DATE NOT NULL,
    nombre_jours DECIMAL(3,2) DEFAULT 1.0, -- Permet 0.5 pour demi-journée
    
    heures_travaillees DECIMAL(4,2) DEFAULT 8.0,
    heures_supplementaires DECIMAL(4,2) DEFAULT 0,
    
    observations TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(id_pointage, date_travail)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pointages_chantier_periode ON pointages_mensuels(id_chantier, annee, mois);
CREATE INDEX IF NOT EXISTS idx_pointages_monteur ON pointages_mensuels(matricule, annee, mois);
CREATE INDEX IF NOT EXISTS idx_pointages_quotidiens_pointage ON pointages_quotidiens(id_pointage, date_travail);

-- Fonction pour calculer automatiquement les totaux
CREATE OR REPLACE FUNCTION calculate_pointage_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer total jours depuis le JSON
    NEW.total_jours := (
        SELECT COALESCE(SUM((value)::decimal), 0)
        FROM jsonb_each_text(NEW.jours_travailles)
    );
    
    -- Calculer total salaire
    NEW.total_salaire := NEW.total_jours * NEW.salaire_journalier;
    
    -- Calculer total charges
    NEW.total_charges := NEW.frais_transport + NEW.frais_repas + NEW.frais_loyer + NEW.frais_gasoil;
    
    -- Calculer net à payer
    NEW.net_a_payer := NEW.total_salaire - NEW.avances;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calcul automatique
DROP TRIGGER IF EXISTS trigger_calculate_pointage_totals ON pointages_mensuels;
CREATE TRIGGER trigger_calculate_pointage_totals
    BEFORE INSERT OR UPDATE ON pointages_mensuels
    FOR EACH ROW
    EXECUTE FUNCTION calculate_pointage_totals();

-- Commentaires
COMMENT ON TABLE pointages_mensuels IS 'Pointages mensuels des monteurs par chantier';
COMMENT ON TABLE pointages_quotidiens IS 'Détails quotidiens des pointages';
COMMENT ON COLUMN pointages_mensuels.jours_travailles IS 'JSON des jours travaillés: {"2025-07-08": 1, "2025-07-10": 0.5}';

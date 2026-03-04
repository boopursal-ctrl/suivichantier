-- Migration: Système de Gestion des Avances
-- Date: 2026-02-05

-- 1. Création de la table des demandes d'avances dans le schéma public
CREATE TABLE IF NOT EXISTS public.demandes_avances (
    id_avance UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_chantier UUID,
    matricule TEXT NOT NULL,
    nom_monteur TEXT NOT NULL,
    
    date_demande DATE DEFAULT CURRENT_DATE,
    montant_demande DECIMAL(10,2) NOT NULL,
    
    mois INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    
    statut TEXT DEFAULT 'en_attente', -- 'en_attente', 'valide', 'refuse'
    commentaire TEXT,
    
    created_by TEXT, -- Email of the requester/creator
    valide_par TEXT, -- Email of the validator
    date_validation TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_avances_periode ON public.demandes_avances(mois, annee);
CREATE INDEX IF NOT EXISTS idx_avances_chantier ON public.demandes_avances(id_chantier);
CREATE INDEX IF NOT EXISTS idx_avances_statut ON public.demandes_avances(statut);

-- 2. Trigger pour mettre à jour automatiquement le total des avances dans pointages_mensuels
CREATE OR REPLACE FUNCTION public.update_pointage_avances()
RETURNS TRIGGER AS $$
DECLARE
    total_avances DECIMAL(10,2);
    target_id_chantier UUID;
    target_matricule TEXT;
    target_mois INTEGER;
    target_annee INTEGER;
BEGIN
    -- Déterminer les cibles (selon l'opération)
    IF (TG_OP = 'DELETE') THEN
        target_id_chantier := OLD.id_chantier;
        target_matricule := OLD.matricule;
        target_mois := OLD.mois;
        target_annee := OLD.annee;
    ELSE
        target_id_chantier := NEW.id_chantier;
        target_matricule := NEW.matricule;
        target_mois := NEW.mois;
        target_annee := NEW.annee;
    END IF;

    -- Calculer la somme des avances VALIDÉES pour ce monteur/chantier/mois
    SELECT COALESCE(SUM(montant_demande), 0)
    INTO total_avances
    FROM public.demandes_avances
    WHERE id_chantier = target_id_chantier
      AND matricule = target_matricule
      AND mois = target_mois
      AND annee = target_annee
      AND statut = 'valide';

    -- Mettre à jour la table pointages_mensuels si elle existe
    UPDATE public.pointages_mensuels
    SET 
        avances = total_avances,
        updated_at = NOW()
    WHERE id_chantier = target_id_chantier
      AND matricule = target_matricule
      AND mois = target_mois
      AND annee = target_annee;
      
    RETURN NULL; -- Result ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Trigger sur INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_update_avances ON public.demandes_avances;
CREATE TRIGGER trigger_update_avances
    AFTER INSERT OR UPDATE OR DELETE ON public.demandes_avances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pointage_avances();

-- 3. Politique RLS (Row Level Security)
ALTER TABLE public.demandes_avances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.demandes_avances;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.demandes_avances;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.demandes_avances;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.demandes_avances;

-- Create permissive policies
CREATE POLICY "Enable read access for all users" ON public.demandes_avances FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.demandes_avances FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.demandes_avances FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.demandes_avances FOR DELETE USING (true);

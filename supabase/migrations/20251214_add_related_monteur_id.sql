-- 1. Ajout de la colonne related_monteur_id à la table lignes_couts
ALTER TABLE lignes_couts 
ADD COLUMN IF NOT EXISTS related_monteur_id TEXT;

COMMENT ON COLUMN lignes_couts.related_monteur_id IS 'ID du monteur (matricule ou UUID) lié à cette dépense';

-- 2. Création de l'index pour la performance
CREATE INDEX IF NOT EXISTS idx_lignes_couts_related_monteur_id ON lignes_couts(related_monteur_id);

-- 3. Mise à jour de l'ENUM type_cout (PostgreSQL)
-- Cette partie tente d'ajouter les nouvelles valeurs 'autre' et 'main_doeuvre_extra' 
-- si elles n'existent pas déjà dans le type ENUM.
DO $$
BEGIN
    ALTER TYPE type_cout ADD VALUE IF NOT EXISTS 'autre';
    ALTER TYPE type_cout ADD VALUE IF NOT EXISTS 'main_doeuvre_extra';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping enum update if not supported or already exists';
END $$;

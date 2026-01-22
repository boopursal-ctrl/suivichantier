-- Add duree_prevue column for planning
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS duree_prevue INTEGER DEFAULT 1;

-- Update constraint for status to include 'en_instance'
-- We first drop the existing check if we can guess its name, or we just try to alter the type if it is an enum.
-- Assuming it is a text column with a check constraint (common in Supabase starters unless explicitly Enum).

DO $$ 
BEGIN 
    -- Try to drop constraint if it exists (standard naming convention)
    BEGIN
        ALTER TABLE chantiers DROP CONSTRAINT chantiers_statut_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
END $$;

ALTER TABLE chantiers ADD CONSTRAINT chantiers_statut_check 
    CHECK (statut IN ('actif', 'terminé', 'archivé', 'en_instance'));

-- Also ensure date_debut and date_fin are nullable if they weren't (usually they are, but creating 'en_instance' might imply no dates)
ALTER TABLE chantiers ALTER COLUMN date_debut DROP NOT NULL;
ALTER TABLE chantiers ALTER COLUMN date_fin DROP NOT NULL;

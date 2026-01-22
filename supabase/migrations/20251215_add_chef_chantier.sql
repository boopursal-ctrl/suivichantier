-- Ajout de la colonne chef_chantier à la table chantiers
ALTER TABLE chantiers 
ADD COLUMN IF NOT EXISTS chef_chantier TEXT;

COMMENT ON COLUMN chantiers.chef_chantier IS 'Nom du Chef de Chantier (Terrain)';

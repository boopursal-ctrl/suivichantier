-- Ajout de la colonne pour gérer l'hébergement automatique
ALTER TABLE monteurs 
ADD COLUMN IF NOT EXISTS ville_residence TEXT;

-- Ajout d'un commentaire pour la documentation
COMMENT ON COLUMN monteurs.ville_residence IS 'Ville de résidence pour le calcul automatique des frais de déplacement';

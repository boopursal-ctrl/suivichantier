
-- Activer la suppression en cascade pour les tables liées aux chantiers

-- 1. Affectations (Monteurs Permanents)
ALTER TABLE affectations
DROP CONSTRAINT IF EXISTS affectations_id_chantier_fkey,
ADD CONSTRAINT affectations_id_chantier_fkey
    FOREIGN KEY (id_chantier)
    REFERENCES chantiers(id_chantier)
    ON DELETE CASCADE;

-- 2. Lignes Couts (Dépenses)
ALTER TABLE lignes_couts
DROP CONSTRAINT IF EXISTS lignes_couts_id_chantier_fkey,
ADD CONSTRAINT lignes_couts_id_chantier_fkey
    FOREIGN KEY (id_chantier)
    REFERENCES chantiers(id_chantier)
    ON DELETE CASCADE;

-- 3. Versements (Paiements Clients)
ALTER TABLE versements
DROP CONSTRAINT IF EXISTS versements_id_chantier_fkey,
ADD CONSTRAINT versements_id_chantier_fkey
    FOREIGN KEY (id_chantier)
    REFERENCES chantiers(id_chantier)
    ON DELETE CASCADE;

-- 4. Mouvements Stock (Sorties vers chantier)
-- Note: On ne supprime pas forcément les mouvements, mais on peut mettre id_chantier à NULL ou supprimer.
-- Ici, le choix 'CASCADE' supprime l'historique de mouvement lié au chantier supprimé.
ALTER TABLE mouvements_stock
DROP CONSTRAINT IF EXISTS mouvements_stock_id_chantier_fkey,
ADD CONSTRAINT mouvements_stock_id_chantier_fkey
    FOREIGN KEY (id_chantier)
    REFERENCES chantiers(id_chantier)
    ON DELETE CASCADE;


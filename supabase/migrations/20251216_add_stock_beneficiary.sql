-- Ajout de la colonne beneficiaire_id pour traçabilité individuelle du stock (EPI, vêtements)
ALTER TABLE mouvements_stock ADD COLUMN IF NOT EXISTS beneficiaire_id TEXT;

COMMENT ON COLUMN mouvements_stock.beneficiaire_id IS 'ID le du monteur (matricule) ou intérimaire (UUID) bénéficiaire';

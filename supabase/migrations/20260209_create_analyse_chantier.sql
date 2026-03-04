-- Table pour les analyses de chantier
CREATE TABLE IF NOT EXISTS analyses_chantier (
  id_analyse UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_chantier TEXT NOT NULL, -- Suppression de la contrainte FK
  
  -- Critères d'évaluation
  budget_prevu DECIMAL(12,2) NOT NULL,
  budget_reel DECIMAL(12,2) NOT NULL,
  budget_respecte BOOLEAN NOT NULL,
  ecart_budget DECIMAL(12,2) NOT NULL, -- budget_reel - budget_prevu
  pourcentage_ecart_budget DECIMAL(5,2) NOT NULL, -- (ecart / prevu) * 100
  
  duree_prevue INTEGER NOT NULL, -- en jours
  duree_reelle INTEGER NOT NULL, -- en jours
  duree_respectee BOOLEAN NOT NULL,
  ecart_duree INTEGER NOT NULL, -- duree_reelle - duree_prevue
  
  bl_cachete BOOLEAN NOT NULL DEFAULT false,
  bc_cachete BOOLEAN NOT NULL DEFAULT false,
  br_cachete BOOLEAN NOT NULL DEFAULT false, -- Bon de Réception
  
  remarques TEXT,
  
  -- Résultat global
  tous_criteres_parfaits BOOLEAN NOT NULL, -- true si tout est OK
  
  -- Métadonnées
  date_analyse TIMESTAMP DEFAULT NOW(),
  genere_par TEXT, -- Email de l'utilisateur qui a généré l'analyse
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les primes
CREATE TABLE IF NOT EXISTS primes_chantier (
  id_prime UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_analyse UUID NOT NULL REFERENCES analyses_chantier(id_analyse) ON DELETE CASCADE,
  id_chantier TEXT NOT NULL, -- Suppression de la contrainte FK
  
  -- Bénéficiaire
  matricule INTEGER NOT NULL, -- Suppression de la contrainte FK
  nom_monteur TEXT NOT NULL,
  role_chantier TEXT NOT NULL, -- 'Chef de Chantier' ou 'Sous Chef de Chantier'
  
  -- Montant
  montant_prime DECIMAL(10,2) NOT NULL,
  
  -- Validation
  statut TEXT NOT NULL DEFAULT 'en_attente', -- 'en_attente', 'validee', 'refusee'
  validee_par TEXT, -- Email du DG qui a validé
  date_validation TIMESTAMP,
  commentaire_validation TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_analyses_chantier ON analyses_chantier(id_chantier);
CREATE INDEX IF NOT EXISTS idx_primes_analyse ON primes_chantier(id_analyse);
CREATE INDEX IF NOT EXISTS idx_primes_chantier ON primes_chantier(id_chantier);
CREATE INDEX IF NOT EXISTS idx_primes_statut ON primes_chantier(statut);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_analyse_chantier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analyse_chantier
BEFORE UPDATE ON analyses_chantier
FOR EACH ROW
EXECUTE FUNCTION update_analyse_chantier_updated_at();

CREATE TRIGGER trigger_update_primes_chantier
BEFORE UPDATE ON primes_chantier
FOR EACH ROW
EXECUTE FUNCTION update_analyse_chantier_updated_at();

-- Ajout de la table pour les intérimaires centralisés
CREATE TABLE IF NOT EXISTS interimaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_complet TEXT NOT NULL,
    cin TEXT NOT NULL UNIQUE,
    telephone TEXT,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la recherche rapide par CIN
CREATE INDEX IF NOT EXISTS idx_interimaires_cin ON interimaires(cin);

-- Commentaire
COMMENT ON TABLE interimaires IS 'Table centralisée des intérimaires pour gestion historique et blacklist';

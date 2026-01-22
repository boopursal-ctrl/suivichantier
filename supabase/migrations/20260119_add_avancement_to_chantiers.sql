ALTER TABLE chantiers
ADD COLUMN IF NOT EXISTS taux_avancement INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stade_avancement TEXT DEFAULT 'démarrage',
ADD COLUMN IF NOT EXISTS historique_avancement JSONB DEFAULT '[]'::jsonb;

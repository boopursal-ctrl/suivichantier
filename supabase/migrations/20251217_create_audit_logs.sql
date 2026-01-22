
-- Table des logs d'audit pour la traçabilité Admin
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL, -- 'DELETE_CHANTIER', 'BLACKLIST_USER', 'UPDATE_SALARY', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'chantier', 'user', 'interimaire'
    entity_id TEXT NOT NULL,
    details JSONB, -- Ancien état, raison, etc.
    respo_user_id TEXT, -- ID de l'utilisateur qui a fait l'action (admin)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par date ou action
CREATE INDEX IF NOT EXISTS audit_logs_date_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

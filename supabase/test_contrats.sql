-- Script de Test pour les Contrats
-- Exécuter ce script dans Supabase SQL Editor pour créer des données de test

-- ============================================
-- ÉTAPE 1 : Vérifier les données existantes
-- ============================================

-- Afficher quelques monteurs disponibles
SELECT matricule, nom_monteur, type_contrat, role_monteur, salaire_jour 
FROM monteurs 
WHERE actif = true 
LIMIT 5;

-- Afficher quelques chantiers actifs
SELECT id_chantier, ref_chantier, nom_client, statut 
FROM chantiers 
WHERE statut = 'actif' 
LIMIT 5;

-- ============================================
-- ÉTAPE 2 : Créer des contrats de test
-- ============================================

-- IMPORTANT : Remplacer les valeurs ci-dessous par des valeurs réelles
-- de votre base de données (récupérées à l'étape 1)

-- Contrat de test 1 : Monteur OMAR sur chantier C602
INSERT INTO contrats (
    matricule,
    nom_monteur,
    id_chantier,
    ref_chantier,
    nom_client,
    cin,
    type_contrat,
    role_monteur,
    salaire_journalier,
    date_debut,
    statut,
    created_by
) VALUES (
    208,  -- ← REMPLACER par un matricule réel de votre table monteurs
    'OMAR',  -- ← REMPLACER par le nom correspondant
    '00000000-0000-0000-0000-000000000000',  -- ← REMPLACER par un id_chantier réel
    'C602-240724',  -- ← REMPLACER par la ref_chantier correspondante
    'STEEP PLASTIQUE',  -- ← REMPLACER par le nom_client correspondant
    'KB123456',  -- CIN du monteur
    'CDI',
    'OUVRIER',
    120.00,
    CURRENT_DATE,
    'actif',
    'admin@example.com'
)
ON CONFLICT DO NOTHING;  -- Évite les erreurs si le contrat existe déjà

-- Contrat de test 2 : Monteur NABIL sur chantier C603
INSERT INTO contrats (
    matricule,
    nom_monteur,
    id_chantier,
    ref_chantier,
    nom_client,
    cin,
    type_contrat,
    role_monteur,
    salaire_journalier,
    date_debut,
    statut,
    created_by
) VALUES (
    237,  -- ← REMPLACER
    'NABIL',  -- ← REMPLACER
    '00000000-0000-0000-0000-000000000001',  -- ← REMPLACER
    'C603-240801',  -- ← REMPLACER
    'ALPHA INDUSTRIES',  -- ← REMPLACER
    'J456123',
    'CDD',
    'OUVRIER',
    100.00,
    CURRENT_DATE - INTERVAL '15 days',  -- Commencé il y a 15 jours
    'actif',
    'admin@example.com'
)
ON CONFLICT DO NOTHING;

-- Contrat de test 3 : Contrat clôturé (pour tester l'affichage des contrats clos)
INSERT INTO contrats (
    matricule,
    nom_monteur,
    id_chantier,
    ref_chantier,
    nom_client,
    cin,
    type_contrat,
    role_monteur,
    salaire_journalier,
    date_debut,
    date_fin,
    statut,
    motif_cloture,
    created_by,
    closed_by
) VALUES (
    236,  -- ← REMPLACER
    'MOUAD',  -- ← REMPLACER
    '00000000-0000-0000-0000-000000000002',  -- ← REMPLACER
    'C601-240715',  -- ← REMPLACER
    'BETA CONSTRUCTION',  -- ← REMPLACER
    'BE987654',
    'CDD',
    'OUVRIER',
    100.00,
    CURRENT_DATE - INTERVAL '60 days',  -- Commencé il y a 60 jours
    CURRENT_DATE - INTERVAL '10 days',  -- Terminé il y a 10 jours
    'clos',
    'Fin de chantier',
    'admin@example.com',
    'admin@example.com'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ÉTAPE 3 : Vérifier les contrats créés
-- ============================================

-- Afficher tous les contrats
SELECT 
    c.nom_monteur,
    c.ref_chantier,
    c.nom_client,
    c.type_contrat,
    c.salaire_journalier,
    c.date_debut,
    c.date_fin,
    c.statut,
    c.motif_cloture
FROM contrats c
ORDER BY c.created_at DESC;

-- Statistiques
SELECT 
    statut,
    COUNT(*) as nombre
FROM contrats
GROUP BY statut;

-- ============================================
-- ÉTAPE 4 : Script de nettoyage (optionnel)
-- ============================================

-- Décommenter pour supprimer tous les contrats de test
-- DELETE FROM contrats WHERE created_by = 'admin@example.com';

-- ============================================
-- TESTS AVANCÉS
-- ============================================

-- Test 1 : Vérifier la contrainte unique (un seul contrat actif par monteur)
-- Cette requête devrait échouer si un monteur a déjà un contrat actif
/*
INSERT INTO contrats (
    matricule,
    nom_monteur,
    id_chantier,
    ref_chantier,
    nom_client,
    type_contrat,
    role_monteur,
    salaire_journalier,
    date_debut,
    statut
) VALUES (
    208,  -- Même matricule qu'un contrat actif existant
    'OMAR',
    '00000000-0000-0000-0000-000000000003',
    'C604-240815',
    'TEST CLIENT',
    'CDI',
    'OUVRIER',
    120.00,
    CURRENT_DATE,
    'actif'
);
-- Erreur attendue : "duplicate key value violates unique constraint"
*/

-- Test 2 : Utiliser la fonction de clôture automatique
-- SELECT close_active_contracts(208, CURRENT_DATE, 'Test de clôture', 'admin@example.com');

-- Test 3 : Vérifier les contrats actifs d'un monteur
SELECT * FROM contrats WHERE matricule = 208 AND statut = 'actif';

-- Test 4 : Historique complet d'un monteur
SELECT 
    ref_chantier,
    date_debut,
    date_fin,
    statut,
    motif_cloture,
    CASE 
        WHEN date_fin IS NOT NULL 
        THEN date_fin - date_debut 
        ELSE CURRENT_DATE - date_debut 
    END as duree_jours
FROM contrats 
WHERE matricule = 208
ORDER BY date_debut DESC;

-- ============================================
-- REQUÊTES UTILES POUR LE DEBUGGING
-- ============================================

-- Trouver les monteurs sans contrat actif
SELECT m.matricule, m.nom_monteur
FROM monteurs m
LEFT JOIN contrats c ON m.matricule = c.matricule AND c.statut = 'actif'
WHERE m.actif = true AND c.id_contrat IS NULL
LIMIT 10;

-- Trouver les contrats avec des dates incohérentes
SELECT * FROM contrats 
WHERE date_fin IS NOT NULL AND date_fin < date_debut;

-- Statistiques détaillées
SELECT 
    type_contrat,
    statut,
    COUNT(*) as nombre,
    AVG(salaire_journalier) as salaire_moyen,
    SUM(CASE 
        WHEN date_fin IS NOT NULL 
        THEN date_fin - date_debut 
        ELSE CURRENT_DATE - date_debut 
    END) as total_jours
FROM contrats
GROUP BY type_contrat, statut
ORDER BY type_contrat, statut;

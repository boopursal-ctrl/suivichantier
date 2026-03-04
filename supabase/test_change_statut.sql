-- Script pour tester le module d'analyse de chantier
-- Exécuter ce script dans Supabase SQL Editor

-- 1. Vérifier les chantiers existants et leurs statuts
SELECT id_chantier, ref_chantier, nom_client, statut, date_debut, date_fin, budget_prevu
FROM chantiers
ORDER BY created_at DESC
LIMIT 10;

-- 2. Si la table chantiers n'existe pas dans Supabase, 
-- cela signifie que vos données sont stockées en local (localStorage)
-- Dans ce cas, vous devez modifier le statut via l'interface de l'application

-- 3. Si la table existe, vous pouvez modifier le statut d'un chantier :
-- Remplacez 'VOTRE_ID_CHANTIER' par l'ID réel d'un chantier
/*
UPDATE chantiers 
SET statut = 'terminé'
WHERE id_chantier = 'VOTRE_ID_CHANTIER';
*/

-- 4. Vérifier que le changement a été effectué
/*
SELECT id_chantier, ref_chantier, statut 
FROM chantiers 
WHERE id_chantier = 'VOTRE_ID_CHANTIER';
*/

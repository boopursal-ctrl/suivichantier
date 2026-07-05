-- ============================================================
-- NETTOYAGE ET REAFFECTATION AU CHANTIER COPAG
-- ============================================================

-- 1. On supprime TOUTES les affectations actuelles pour ce chantier
-- (Qu'elles aient été créées avec le bon ID ou la mauvaise référence)
DELETE FROM affectations 
WHERE id_chantier = '1783086832156' 
   OR id_chantier = '2-C473-20260703';

-- 2. On réinsère proprement les monteurs.
-- Le salaire_jour est récupéré automatiquement de la table monteurs :
-- Les CDI auront bien 0, et les non-CDI auront leur salaire normal (ex: 120).
INSERT IGNORE INTO affectations (id_affectation, id_chantier, matricule, nom_monteur, salaire_jour, zone_travail, date_entree, date_sortie, jours_arret)
SELECT 
    CONCAT('aff-copag-', m.matricule) AS id_affectation,
    '1783086832156' AS id_chantier,
    m.matricule,
    m.nom_monteur,
    m.salaire_jour,
    '' AS zone_travail,
    '2026-06-01' AS date_entree,
    NULL AS date_sortie,
    0 AS jours_arret
FROM monteurs m
WHERE m.matricule IN (
    136, 100, 102, 101, 104, 157, 103, 159, 357,
    402, 238, 332, 359, 360, 339, 361, 365, 377,
    336, 373, 376, 375, 367, 378, 389, 382, 383,
    381, 392, 289, 371, 385, 386, 398, 397, 395,
    387, 396, 394, 393, 399, 400, 366, 374, 368,
    362, 363, 358, 364, 391, 390, 401
);

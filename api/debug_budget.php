<?php
require_once 'connect.php';

echo "<h1>Diagnostic Final Budget Réel</h1>";

try {
    $ref = "1-C473-20260503";
    echo "<h3>Analyse du chantier : $ref</h3>";

    // 1. Trouver l'ID interne du chantier via sa référence
    $stmt = $conn->prepare("SELECT id_chantier, ref_chantier, nom_client FROM chantiers WHERE ref_chantier = ? OR id_chantier = ?");
    $stmt->execute([$ref, $ref]);
    $chantier = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($chantier) {
        $id_technique = $chantier['id_chantier'];
        echo "✅ Chantier trouvé !<br>";
        echo "ID Interne (Technique) : <b>'$id_technique'</b><br>";
        echo "Référence : <b>'{$chantier['ref_chantier']}'</b><br><br>";

        // 2. Chercher les pointages avec cet ID technique
        $stmt = $conn->prepare("SELECT COUNT(*) as nb, SUM(total_salaire) as total FROM pointages_mensuels WHERE TRIM(id_chantier) = ?");
        $stmt->execute([trim($id_technique)]);
        $res = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($res['nb'] > 0) {
            echo "✅ <b>" . $res['nb'] . " pointages trouvés</b> pour l'ID technique '$id_technique'.<br>";
            echo "Total salaires : <b>" . ($res['total'] ?? 0) . " DH</b><br>";
            echo "👉 Si vous voyez 0 DH sur le Dashboard, videz le cache de votre navigateur (Ctrl + F5).<br>";
        } else {
            echo "❌ <b>AUCUN POINTAGE</b> trouvé pour l'ID technique '$id_technique'.<br>";
            
            // Chercher si les pointages sont enregistrés sous la Référence à la place
            $stmt = $conn->prepare("SELECT COUNT(*) as nb FROM pointages_mensuels WHERE id_chantier = ?");
            $stmt->execute([$ref]);
            $resRef = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($resRef['nb'] > 0) {
                echo "⚠️ <b>Attention</b> : Vos pointages sont enregistrés sous la Référence '$ref' au lieu de l'ID technique.<br>";
                echo "Action : Retournez dans le module Pointage, sélectionnez le chantier et cliquez sur 'Enregistrer' pour corriger.<br>";
            } else {
                echo "❌ Vraiment aucun pointage trouvé pour ce chantier, ni sous l'ID technique, ni sous la Référence.<br>";
            }
        }
    } else {
        echo "❌ Chantier avec la référence '$ref' introuvable dans la table chantiers.<br>";
        
        // Liste des chantiers récents
        echo "<br>Derniers chantiers créés :<br>";
        $recent = $conn->query("SELECT id_chantier, ref_chantier FROM chantiers ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($recent as $r) {
            echo "- ID: '{$r['id_chantier']}' | Réf: '{$r['ref_chantier']}'<br>";
        }
    }

} catch (Exception $e) {
    echo "❌ ERREUR : " . $e->getMessage();
}
?>

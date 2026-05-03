<?php
require_once 'connect.php';

echo "<h1>Diagnostic Budget Réel</h1>";

try {
    $ref = "1-C473-20260503";
    echo "<h3>Analyse du chantier : $ref</h3>";

    // 1. Vérifier si le chantier existe
    $stmt = $conn->prepare("SELECT * FROM chantiers WHERE id_chantier = ?");
    $stmt->execute([$ref]);
    $c = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($c) {
        echo "✅ Chantier trouvé dans la table 'chantiers'.<br>";
    } else {
        echo "❌ Chantier NON TROUVÉ dans la table 'chantiers'. Vérifiez l'ID.<br>";
    }

    // 2. Vérifier les pointages
    $stmt = $conn->prepare("SELECT matricule, nom_monteur, total_salaire, total_jours, frais_transport FROM pointages_mensuels WHERE id_chantier = ?");
    $stmt->execute([$ref]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($rows) > 0) {
        echo "✅ " . count($rows) . " ligne(s) de pointage trouvée(s) pour ce chantier.<br>";
        echo "<table border='1' style='border-collapse:collapse; padding:5px;'>
                <tr><th>Matricule</th><th>Nom</th><th>Jours</th><th>Salaire</th><th>Frais Transp.</th></tr>";
        $total = 0;
        foreach ($rows as $r) {
            echo "<tr>
                    <td>{$r['matricule']}</td>
                    <td>{$r['nom_monteur']}</td>
                    <td>{$r['total_jours']}</td>
                    <td>{$r['total_salaire']} DH</td>
                    <td>{$r['frais_transport']} DH</td>
                  </tr>";
            $total += $r['total_salaire'] + $r['frais_transport'];
        }
        echo "</table>";
        echo "<b>TOTAL CALCULÉ PAR LE SCRIPT : $total DH</b><br>";
    } else {
        echo "❌ AUCUN POINTAGE trouvé dans la table 'pointages_mensuels' pour cet ID.<br>";
        
        // Lister tous les IDs présents pour aider
        echo "<br>IDs de chantiers présents dans la table pointages_mensuels :<br>";
        $ids = $conn->query("SELECT DISTINCT id_chantier FROM pointages_mensuels")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($ids as $id) echo "- '$id'<br>";
    }

} catch (Exception $e) {
    echo "❌ ERREUR : " . $e->getMessage();
}
?>

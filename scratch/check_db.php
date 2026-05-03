<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once 'api/connect.php';

try {
    $stmt2 = $conn->query("SELECT id_chantier, matricule, total_salaire, frais_transport FROM pointages_mensuels WHERE id_chantier='1-C473-20260503'");
    $rows = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "ROWS:\n";
    print_r($rows);
    
    // Test get_global_finance_summary logic
    $stmt3 = $conn->query("
        SELECT id_chantier, 
        SUM(COALESCE(total_salaire, 0)) as total_salaires,
        SUM(COALESCE(total_salaire, 0) + COALESCE(frais_transport, 0) + COALESCE(frais_repas, 0) + COALESCE(frais_loyer, 0) + COALESCE(frais_gasoil, 0)) as total_main_doeuvre_reelle
        FROM pointages_mensuels 
        WHERE id_chantier='1-C473-20260503'
        GROUP BY id_chantier
    ");
    echo "SUMMARY:\n";
    print_r($stmt3->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>

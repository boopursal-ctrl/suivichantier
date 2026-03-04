<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// CONFIGURATION BASE DE DONNÉES (Heberjahiz)
$host = "localhost";
$db_name = "boopugbb_suivi";
$username = "boopugbb_suivi";
$password = "iQyJBFYn7]Y4XQgK";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Connexion échouée: " . $e->getMessage()]);
    exit;
}

// Récupérer les données POST
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_analyses':
            $stmt = $conn->prepare("SELECT * FROM site_analyses WHERE id_chantier = ? ORDER BY date_analyse DESC LIMIT 1");
            $stmt->execute([$_GET['id_chantier']]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            break;

        case 'save_analyse':
            $sql = "INSERT INTO site_analyses (id_chantier, budget_prevu, budget_reel, budget_respecte, ecart_budget, pourcentage_ecart_budget, duree_prevue, duree_reelle, duree_respectee, ecart_duree, bl_cachete, bc_cachete, br_cachete, bl_url, bc_url, br_url, remarques, tous_criteres_parfaits, genere_par) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id_chantier'],
                $data['budget_prevu'],
                $data['budget_reel'],
                $data['budget_respecte'] ? 1 : 0,
                $data['ecart_budget'],
                $data['pourcentage_ecart_budget'],
                $data['duree_prevue'],
                $data['duree_reelle'],
                $data['duree_respectee'] ? 1 : 0,
                $data['ecart_duree'],
                $data['bl_cachete'] ? 1 : 0,
                $data['bc_cachete'] ? 1 : 0,
                $data['br_cachete'] ? 1 : 0,
                $data['bl_url'] ?? '',
                $data['bc_url'] ?? '',
                $data['br_url'] ?? '',
                $data['remarques'],
                $data['tous_criteres_parfaits'] ? 1 : 0,
                $data['genere_par']
            ]);
            echo json_encode(["status" => "success", "id" => $conn->lastInsertId()]);
            break;

        case 'get_primes':
            $stmt = $conn->prepare("SELECT * FROM site_primes WHERE id_analyse = ?");
            $stmt->execute([$_GET['id_analyse']]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_primes':
            // Nettoyer les anciennes
            $conn->prepare("DELETE FROM site_primes WHERE id_analyse = ?")->execute([$data[0]['id_analyse']]);
            // Insérer les nouvelles
            $sql = "INSERT INTO site_primes (id_prime, id_analyse, id_chantier, matricule, nom_monteur, role_chantier, montant_prime, statut) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            foreach ($data as $prime) {
                $stmt->execute([
                    $prime['id_prime'], // Nouvel identifiant envoyé par l'appli
                    $prime['id_analyse'],
                    $prime['id_chantier'],
                    $prime['matricule'],
                    $prime['nom_monteur'],
                    $prime['role_chantier'],
                    $prime['montant_prime'],
                    $prime['statut']
                ]);
            }
            echo json_encode(["status" => "success"]);
            break;

        case 'get_avances':
            $stmt = $conn->prepare("SELECT * FROM avances WHERE chantier_id = ? AND mois = ? AND annee = ?");
            $stmt->execute([$_GET['id_chantier'], $_GET['mois'], $_GET['annee']]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_avance':
            $sql = "INSERT INTO avances (chantier_id, matricule, nom, montant, mois, annee, statut, commentaire, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$data['chantier_id'], $data['matricule'], $data['nom'], $data['montant'], $data['mois'], $data['annee'], $data['statut'], $data['commentaire'], $data['created_by']]);
            echo json_encode(["status" => "success"]);
            break;

        case 'update_avance_status':
            $sql = "UPDATE avances SET statut = ?, valide_par = ?, date_validation = NOW() WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$data['statut'], $data['valide_par'], $data['id']]);
            echo json_encode(["status" => "success"]);
            break;

        case 'get_pointages':
            $stmt = $conn->prepare("SELECT * FROM pointages_mensuels WHERE id_chantier = ? AND mois = ? AND annee = ?");
            $stmt->execute([$_GET['id_chantier'], $_GET['mois'], $_GET['annee']]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_pointages':
            $sql = "INSERT INTO pointages_mensuels (id_chantier, matricule, nom_monteur, mois, annee, salaire_journalier, jours_travailles, total_jours, total_salaire, avances, net_a_payer) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    nom_monteur=VALUES(nom_monteur), 
                    salaire_journalier=VALUES(salaire_journalier), 
                    jours_travailles=VALUES(jours_travailles), 
                    total_jours=VALUES(total_jours), 
                    total_salaire=VALUES(total_salaire), 
                    net_a_payer=VALUES(net_a_payer)";
            $stmt = $conn->prepare($sql);
            foreach ($data as $p) {
                $stmt->execute([
                    $p['id_chantier'],
                    $p['matricule'],
                    $p['nom_monteur'],
                    $p['mois'],
                    $p['annee'],
                    $p['salaire_journalier'],
                    json_encode($p['jours_travailles']),
                    $p['total_jours'],
                    $p['total_salaire'],
                    $p['avances'],
                    $p['net_a_payer']
                ]);
            }
            echo json_encode(["status" => "success"]);
            break;

        case 'update_prime_status':
            if (!isset($data['id_prime']) || $data['id_prime'] === '') {
                echo json_encode(["status" => "error", "message" => "ID prime manquant"]);
                break;
            }
            $sql = "UPDATE site_primes SET statut = ?, validee_par = ?, date_validation = NOW(), commentaire_validation = ? WHERE id_prime = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['statut'],
                $data['validee_par'],
                $data['commentaire'] ?? '',
                $data['id_prime']
            ]);
            echo json_encode(["status" => "success"]);
            break;

        default:
            echo json_encode(["message" => "Action non reconnue"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

$db_host = 'localhost';
$db_name = 'boopugbb_suivi';
$db_user = 'boopugbb_suivi';
$db_pass = 'iQyJBFYn7]Y4XQgK';

try {
    $conn = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';
$json = file_get_contents('php://input');
$data = json_decode($json, true);

try {
    switch ($action) {
        case 'login':
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && $password === $user['password']) {
                $user['allowed_modules'] = json_decode($user['allowed_modules'] ?? '["dashboard"]');
                unset($user['password']);
                echo json_encode(["status" => "success", "user" => $user]);
            } else {
                echo json_encode(["status" => "error", "message" => "Identifiants incorrects"]);
            }
            break;

        // --- CHANTIERS ---
        case 'get_chantiers':
            $stmt = $conn->prepare("SELECT * FROM chantiers ORDER BY created_at DESC");
            $stmt->execute();
            $chantiers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($chantiers as &$c) {
                if (isset($c['monteurs_locaux'])) {
                    $c['monteurs_locaux'] = json_decode($c['monteurs_locaux'], true) ?? [];
                }
                if (isset($c['historique_avancement'])) {
                    $c['historique_avancement'] = json_decode($c['historique_avancement'], true) ?? [];
                }
                // Conversion des types numériques
                if (isset($c['taux_avancement'])) $c['taux_avancement'] = (int)$c['taux_avancement'];
                if (isset($c['duree_prevue'])) $c['duree_prevue'] = (int)$c['duree_prevue'];
                if (isset($c['budget_prevu'])) $c['budget_prevu'] = (float)$c['budget_prevu'];
            }
            echo json_encode($chantiers);
            break;

        case 'save_chantier':
            // S'assurer que les colonnes existent (Evolution de schéma)
            $conn->exec("ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS plan_reference VARCHAR(255) DEFAULT '',
                         ADD COLUMN IF NOT EXISTS documents_at_rc BOOLEAN DEFAULT 0,
                         ADD COLUMN IF NOT EXISTS vehicule_utilise BOOLEAN DEFAULT 0,
                         ADD COLUMN IF NOT EXISTS chef_chantier VARCHAR(255) DEFAULT '',
                         ADD COLUMN IF NOT EXISTS taux_avancement INT DEFAULT 0,
                         ADD COLUMN IF NOT EXISTS stade_avancement VARCHAR(50) DEFAULT 'démarrage',
                         ADD COLUMN IF NOT EXISTS historique_avancement TEXT,
                         ADD COLUMN IF NOT EXISTS duree_prevue INT DEFAULT 0,
                         ADD COLUMN IF NOT EXISTS adresse TEXT,
                         ADD COLUMN IF NOT EXISTS commentaire TEXT");

            $sql = "INSERT INTO chantiers (id_chantier, ref_chantier, id_client, nom_client, code_client, date_debut, date_fin, budget_prevu, statut, responsable_chantier, ville_code, monteurs_locaux, plan_reference, documents_at_rc, vehicule_utilise, chef_chantier, taux_avancement, stade_avancement, historique_avancement, duree_prevue, adresse, commentaire) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    ref_chantier=VALUES(ref_chantier), id_client=VALUES(id_client),
                    nom_client=VALUES(nom_client), code_client=VALUES(code_client),
                    statut=VALUES(statut), budget_prevu=VALUES(budget_prevu),
                    responsable_chantier=VALUES(responsable_chantier), 
                    date_debut=VALUES(date_debut), date_fin=VALUES(date_fin),
                    ville_code=VALUES(ville_code), monteurs_locaux=VALUES(monteurs_locaux),
                    plan_reference=VALUES(plan_reference), documents_at_rc=VALUES(documents_at_rc),
                    vehicule_utilise=VALUES(vehicule_utilise), chef_chantier=VALUES(chef_chantier),
                    taux_avancement=VALUES(taux_avancement), stade_avancement=VALUES(stade_avancement),
                    historique_avancement=VALUES(historique_avancement), duree_prevue=VALUES(duree_prevue),
                    adresse=VALUES(adresse), commentaire=VALUES(commentaire)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id_chantier'],
                $data['ref_chantier'] ?? '',
                $data['id_client'] ?? null,
                $data['nom_client'] ?? '',
                $data['code_client'] ?? '',
                $data['date_debut'] ?? null,
                $data['date_fin'] ?? null,
                $data['budget_prevu'] ?? 0,
                $data['statut'] ?? 'actif',
                $data['responsable_chantier'] ?? '',
                $data['ville_code'] ?? '',
                json_encode($data['monteurs_locaux'] ?? []),
                $data['plan_reference'] ?? '',
                ($data['documents_at_rc'] ?? false) ? 1 : 0,
                ($data['vehicule_utilise'] ?? false) ? 1 : 0,
                $data['chef_chantier'] ?? '',
                $data['taux_avancement'] ?? 0,
                $data['stade_avancement'] ?? 'démarrage',
                json_encode($data['historique_avancement'] ?? []),
                $data['duree_prevue'] ?? 0,
                $data['adresse'] ?? '',
                $data['commentaire'] ?? ''
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_chantier':
            $stmt = $conn->prepare("DELETE FROM chantiers WHERE id_chantier = ?");
            $stmt->execute([$_GET['id_chantier']]);
            echo json_encode(["status" => "success"]);
            break;

        // --- MONTEURS ---
        case 'get_monteurs':
            $stmt = $conn->prepare("SELECT * FROM monteurs ORDER BY nom_monteur ASC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_monteur':
            $sql = "INSERT INTO monteurs (matricule, nom_monteur, telephone, cin, date_naissance, date_debut_contrat, type_contrat, role_monteur, salaire_jour, actif, ville_residence, scan_cin_recto, scan_cin_verso, is_blacklisted, blacklist_reason) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    nom_monteur=VALUES(nom_monteur), telephone=VALUES(telephone), cin=VALUES(cin), 
                    date_naissance=VALUES(date_naissance), date_debut_contrat=VALUES(date_debut_contrat),
                    type_contrat=VALUES(type_contrat), role_monteur=VALUES(role_monteur), 
                    salaire_jour=VALUES(salaire_jour), actif=VALUES(actif), ville_residence=VALUES(ville_residence),
                    scan_cin_recto=VALUES(scan_cin_recto), scan_cin_verso=VALUES(scan_cin_verso),
                    is_blacklisted=VALUES(is_blacklisted), blacklist_reason=VALUES(blacklist_reason)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['matricule'],
                $data['nom_monteur'],
                $data['telephone'] ?? '',
                $data['cin'] ?? '',
                $data['date_naissance'] ?? null,
                $data['date_debut_contrat'] ?? null,
                $data['type_contrat'] ?? 'CDD',
                $data['role_monteur'] ?? 'OUVRIER',
                $data['salaire_jour'] ?? 0,
                $data['actif'] ? 1 : 0,
                $data['ville_residence'] ?? '',
                $data['scan_cin_recto'] ?? '',
                $data['scan_cin_verso'] ?? '',
                isset($data['is_blacklisted']) ? ($data['is_blacklisted'] ? 1 : 0) : 0,
                $data['blacklist_reason'] ?? ''
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_monteur':
            $stmt = $conn->prepare("DELETE FROM monteurs WHERE matricule = ?");
            $stmt->execute([$_GET['matricule']]);
            echo json_encode(["status" => "success"]);
            break;

        // --- CLIENTS ---
        case 'get_clients':
            $stmt = $conn->prepare("SELECT * FROM clients ORDER BY nom_client ASC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_client':
            $sql = "INSERT INTO clients (id_client, nom_client, code_client, ice, contact_responsable, telephone, email, adresse, ville_code) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    nom_client=VALUES(nom_client), code_client=VALUES(code_client), ice=VALUES(ice),
                    contact_responsable=VALUES(contact_responsable), adresse=VALUES(adresse),
                    telephone=VALUES(telephone), email=VALUES(email), ville_code=VALUES(ville_code)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id_client'],
                $data['nom_client'],
                $data['code_client'] ?? '',
                $data['ice'] ?? '',
                $data['contact_responsable'] ?? '',
                $data['telephone'] ?? '',
                $data['email'] ?? '',
                $data['adresse'] ?? '',
                $data['ville_code'] ?? ''
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_client':
            $stmt = $conn->prepare("DELETE FROM clients WHERE id_client = ?");
            $stmt->execute([$_GET['id']]);
            echo json_encode(["status" => "success"]);
            break;

        // --- AFFECTATIONS ---
        case 'get_affectations':
            $stmt = $conn->prepare("SELECT id_affectation, id_chantier, matricule, nom_monteur, salaire_jour, zone_travail, date_entree, date_sortie, jours_arret FROM affectations ORDER BY date_entree DESC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_affectation':
            $sql = "INSERT INTO affectations (id_affectation, id_chantier, matricule, nom_monteur, salaire_jour, zone_travail, date_entree, date_sortie, jours_arret) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    id_chantier=VALUES(id_chantier), matricule=VALUES(matricule), nom_monteur=VALUES(nom_monteur), 
                    salaire_jour=VALUES(salaire_jour), zone_travail=VALUES(zone_travail), 
                    date_entree=VALUES(date_entree), date_sortie=VALUES(date_sortie), jours_arret=VALUES(jours_arret)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id_affectation'],
                $data['id_chantier'],
                $data['matricule'],
                $data['nom_monteur'],
                $data['salaire_jour'] ?? 120,
                $data['zone_travail'] ?? '',
                $data['date_entree'],
                $data['date_sortie'] ?? null,
                $data['jours_arret'] ?? 0
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_affectation':
            $stmt = $conn->prepare("DELETE FROM affectations WHERE id_affectation = ?");
            $stmt->execute([$_GET['id']]);
            echo json_encode(["status" => "success"]);
            break;

        // --- FINANCES (COUTS) ---
        case 'get_couts':
            $stmt = $conn->prepare("SELECT * FROM lignes_couts ORDER BY date_cout DESC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_cout':
            // Évolution du schéma pour inclure les nouveaux champs
            $conn->exec("ALTER TABLE lignes_couts ADD COLUMN IF NOT EXISTS related_monteur_id VARCHAR(255) DEFAULT NULL,
                         ADD COLUMN IF NOT EXISTS montant_prevu DECIMAL(15,2) DEFAULT 0,
                         ADD COLUMN IF NOT EXISTS cout_unitaire DECIMAL(15,2) DEFAULT 0,
                         ADD COLUMN IF NOT EXISTS quantite DECIMAL(15,2) DEFAULT 1,
                         ADD COLUMN IF NOT EXISTS commentaire TEXT,
                         ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'en_attente'");

            $sql = "INSERT INTO lignes_couts (id_chantier, type_cout, montant_reel, description, date_cout, id_cout, related_monteur_id, montant_prevu, cout_unitaire, quantite, commentaire, statut) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    id_chantier=VALUES(id_chantier), type_cout=VALUES(type_cout), 
                    montant_reel=VALUES(montant_reel), description=VALUES(description), 
                    date_cout=VALUES(date_cout), related_monteur_id=VALUES(related_monteur_id),
                    montant_prevu=VALUES(montant_prevu), cout_unitaire=VALUES(cout_unitaire),
                    quantite=VALUES(quantite), commentaire=VALUES(commentaire), statut=VALUES(statut)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id_chantier'],
                $data['type_cout'],
                $data['montant_reel'],
                $data['description'] ?? $data['commentaire'] ?? '',
                $data['date_cout'] ?? date('Y-m-d'),
                $data['id_cout'] ?? null,
                $data['related_monteur_id'] ?? null,
                $data['montant_prevu'] ?? 0,
                $data['cout_unitaire'] ?? 0,
                $data['quantite'] ?? 1,
                $data['commentaire'] ?? $data['description'] ?? '',
                $data['statut'] ?? 'en_attente'
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_cout':
            $stmt = $conn->prepare("DELETE FROM lignes_couts WHERE id_cout = ?");
            $stmt->execute([$_GET['id']]);
            echo json_encode(["status" => "success"]);
            break;

        // --- FINANCES (VERSEMENTS) ---
        case 'get_versements':
            $stmt = $conn->prepare("SELECT * FROM versements ORDER BY date_versement DESC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_versement':
            $sql = "INSERT INTO versements (id_chantier, montant, date_versement, methode, commentaire, id_versement) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    id_chantier=VALUES(id_chantier), montant=VALUES(montant), 
                    date_versement=VALUES(date_versement), methode=VALUES(methode), 
                    commentaire=VALUES(commentaire)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id_chantier'],
                $data['montant'],
                $data['date_versement'],
                $data['methode'] ?? 'Virement',
                $data['commentaire'] ?? '',
                $data['id_versement'] ?? null
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_versement':
            $stmt = $conn->prepare("DELETE FROM versements WHERE id_versement = ?");
            $stmt->execute([$_GET['id']]);
            echo json_encode(["status" => "success"]);
            break;

        // --- STOCK ---
        case 'get_stock':
            $stmt = $conn->prepare("SELECT id_article, nom_article as nom, reference, categorie, quantite, unite, seuil_alerte, emplacement FROM articles_stock ORDER BY nom_article ASC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_article':
            $sql = "INSERT INTO articles_stock (nom_article, reference, categorie, quantite, unite, seuil_alerte, emplacement, id_article) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    nom_article=VALUES(nom_article), reference=VALUES(reference), categorie=VALUES(categorie), 
                    quantite=VALUES(quantite), unite=VALUES(unite), seuil_alerte=VALUES(seuil_alerte), emplacement=VALUES(emplacement)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['nom'],
                $data['reference'] ?? '',
                $data['categorie'] ?? '',
                $data['quantite'] ?? 0,
                $data['unite'] ?? 'unité',
                $data['seuil_alerte'] ?? 5,
                $data['emplacement'] ?? '',
                $data['id_article'] ?? null
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'get_mouvements':
            $stmt = $conn->prepare("SELECT * FROM mouvements_stock ORDER BY date DESC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_mouvement':
            $conn->beginTransaction();
            try {
                $sql = "INSERT INTO mouvements_stock (id_mouvement, id_article, type, quantite, date, id_chantier, motif) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    $data['id_mouvement'],
                    $data['id_article'],
                    $data['type'],
                    $data['quantite'],
                    $data['date'],
                    $data['id_chantier'] ?? null,
                    $data['motif'] ?? ''
                ]);
                $op = ($data['type'] === 'ENTREE') ? '+' : '-';
                $stmt_upd = $conn->prepare("UPDATE articles_stock SET quantite = quantite $op ? WHERE id_article = ?");
                $stmt_upd->execute([$data['quantite'], $data['id_article']]);
                $conn->commit();
                echo json_encode(["status" => "success"]);
            } catch (Exception $e) {
                $conn->rollBack();
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
            break;

        // --- ANALYSES & PRIMES ---
        case 'get_analyses':
            $id_chantier = $_GET['id_chantier'] ?? '';
            
            // --- RÉPARATION DE LA STRUCTURE SI BESOIN ---
            if (isset($_GET['cleanup'])) {
                $conn->prepare("DELETE FROM site_analyses WHERE id_chantier = ? OR id_analyse > 1000000000")->execute([$id_chantier]);
                $conn->prepare("DELETE FROM primes_chantier WHERE id_chantier = ?")->execute([$id_chantier]);
                
                // On force la remise à zéro de l'auto-incrément et on s'assure de la structure
                $conn->exec("ALTER TABLE site_analyses MODIFY id_analyse INT AUTO_INCREMENT");
            }
            // ---------------------------------------------

            $stmt = $conn->prepare("SELECT * FROM site_analyses WHERE id_chantier = ? ORDER BY date_analyse DESC LIMIT 1");
            $stmt->execute([$id_chantier]);
            $analyse = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($analyse) {
                // Conversion des types pour React
                $analyse['id_analyse'] = (int)$analyse['id_analyse'];
                $analyse['budget_respecte'] = (bool)$analyse['budget_respecte'];
                $analyse['duree_respectee'] = (bool)$analyse['duree_respectee'];
                $analyse['bl_cachete'] = (bool)$analyse['bl_cachete'];
                $analyse['bc_cachete'] = (bool)$analyse['bc_cachete'];
                $analyse['br_cachete'] = (bool)$analyse['br_cachete'];
                $analyse['tous_criteres_parfaits'] = (bool)$analyse['tous_criteres_parfaits'];
                $analyse['budget_prevu'] = (float)$analyse['budget_prevu'];
                $analyse['budget_reel'] = (float)$analyse['budget_reel'];
                $analyse['ecart_budget'] = (float)$analyse['ecart_budget'];
                $analyse['pourcentage_ecart_budget'] = (float)$analyse['pourcentage_ecart_budget'];
            }
            echo json_encode($analyse);
            break;

        case 'save_analyse':
            $conn->exec("CREATE TABLE IF NOT EXISTS site_analyses (
                id_analyse INT AUTO_INCREMENT PRIMARY KEY,
                id_chantier VARCHAR(100) NOT NULL,
                budget_prevu DECIMAL(12,2), budget_reel DECIMAL(12,2), budget_respecte BOOLEAN,
                ecart_budget DECIMAL(12,2), pourcentage_ecart_budget DECIMAL(5,2),
                duree_prevue INT, duree_reelle INT, duree_respectee BOOLEAN,
                ecart_duree INT, bl_cachete BOOLEAN, bc_cachete BOOLEAN, br_cachete BOOLEAN,
                bl_url VARCHAR(255), bc_url VARCHAR(255), br_url VARCHAR(255),
                remarques TEXT, tous_criteres_parfaits BOOLEAN, genere_par VARCHAR(100),
                date_analyse TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_chantier (id_chantier)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $sql = "INSERT INTO site_analyses (id_chantier, budget_prevu, budget_reel, budget_respecte, ecart_budget, pourcentage_ecart_budget, duree_prevue, duree_reelle, duree_respectee, ecart_duree, bl_cachete, bc_cachete, br_cachete, bl_url, bc_url, br_url, remarques, tous_criteres_parfaits, genere_par) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    budget_prevu=VALUES(budget_prevu),
                    budget_reel=VALUES(budget_reel),
                    budget_respecte=VALUES(budget_respecte),
                    ecart_budget=VALUES(ecart_budget),
                    pourcentage_ecart_budget=VALUES(pourcentage_ecart_budget),
                    duree_prevue=VALUES(duree_prevue),
                    duree_reelle=VALUES(duree_reelle),
                    duree_respectee=VALUES(duree_respectee),
                    ecart_duree=VALUES(ecart_duree),
                    bl_cachete=VALUES(bl_cachete),
                    bc_cachete=VALUES(bc_cachete),
                    br_cachete=VALUES(br_cachete),
                    bl_url=VALUES(bl_url),
                    bc_url=VALUES(bc_url),
                    br_url=VALUES(br_url),
                    remarques=VALUES(remarques),
                    tous_criteres_parfaits=VALUES(tous_criteres_parfaits),
                    genere_par=VALUES(genere_par),
                    date_analyse=NOW()";
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
                $data['remarques'] ?? '',
                $data['tous_criteres_parfaits'] ? 1 : 0,
                $data['genere_par']
            ]);
            
            // Récupère l'ID que ce soit un INSERT ou un UPDATE (DUPLICATE KEY)
            $id = $conn->lastInsertId();
            if (!$id || $id == 0) {
                $check = $conn->prepare("SELECT id_analyse FROM site_analyses WHERE id_chantier = ? ORDER BY id_analyse DESC LIMIT 1");
                $check->execute([$data['id_chantier']]);
                $id = (int)$check->fetchColumn();
            }

            echo json_encode(["status" => "success", "id" => (int)$id]);
            break;

        case 'get_primes':
            $id_analyse = $_GET['id_analyse'] ?? '';
            $id_chantier = $_GET['id_chantier'] ?? '';
            
            if ($id_analyse) {
                $stmt = $conn->prepare("SELECT * FROM primes_chantier WHERE id_analyse = ?");
                $stmt->execute([$id_analyse]);
            } else {
                $stmt = $conn->prepare("SELECT * FROM primes_chantier WHERE id_chantier = ?");
                $stmt->execute([$id_chantier]);
            }
            $primes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($primes as &$p) {
                // Conversion des types pour React
                $p['id_analyse'] = (int)$p['id_analyse'];
                $p['montant_prime'] = (float)$p['montant_prime'];
                $p['matricule'] = (int)$p['matricule'];
            }
            echo json_encode($primes);
            break;

        case 'save_primes':
            $conn->exec("CREATE TABLE IF NOT EXISTS primes_chantier (
                id_prime VARCHAR(100) PRIMARY KEY, id_analyse INT, id_chantier VARCHAR(100),
                matricule VARCHAR(50), nom_monteur VARCHAR(255), role_chantier VARCHAR(100),
                montant_prime DECIMAL(12,2), statut VARCHAR(50) DEFAULT 'en_attente',
                commentaire_validation TEXT, date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                validee_par VARCHAR(100), date_validation TIMESTAMP NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $conn->beginTransaction();
            try {
                if (!empty($data) && isset($data[0]['id_analyse'])) {
                    $conn->prepare("DELETE FROM primes_chantier WHERE id_analyse = ?")->execute([$data[0]['id_analyse']]);
                }
                $sql = "INSERT INTO primes_chantier (id_prime, id_analyse, id_chantier, matricule, nom_monteur, role_chantier, montant_prime, statut) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                foreach ($data as $prime) {
                    $stmt->execute([
                        $prime['id_prime'],
                        $prime['id_analyse'],
                        $prime['id_chantier'],
                        $prime['matricule'],
                        $prime['nom_monteur'],
                        $prime['role_chantier'],
                        $prime['montant_prime'],
                        $prime['statut'] ?? 'en_attente'
                    ]);
                }
                $conn->commit();
                echo json_encode(["status" => "success"]);
            } catch (Exception $e) {
                $conn->rollBack();
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
            break;

        case 'update_prime_status':
            $sql = "UPDATE primes_chantier SET statut = ?, validee_par = ?, date_validation = NOW(), commentaire_validation = ? WHERE id_prime = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['statut'],
                $data['validee_par'],
                $data['commentaire'] ?? '',
                $data['id_prime']
            ]);
            echo json_encode(["status" => "success"]);
            break;

        // --- AVANCES & POINTAGES ---
        case 'get_avances':
            $stmt = $conn->prepare("SELECT * FROM avances WHERE chantier_id = ? AND mois = ? AND annee = ?");
            $stmt->execute([$_GET['id_chantier'], $_GET['mois'], $_GET['annee']]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_avance':
            $sql = "INSERT INTO avances (chantier_id, matricule, nom, montant, mois, annee, statut, commentaire, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['chantier_id'],
                $data['matricule'],
                $data['nom'],
                $data['montant'],
                $data['mois'],
                $data['annee'],
                $data['statut'],
                $data['commentaire'],
                $data['created_by']
            ]);
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

        case 'get_all_pointages_chantier':
            $stmt = $conn->prepare("SELECT * FROM pointages_mensuels WHERE id_chantier = ?");
            $stmt->execute([$_GET['id_chantier']]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_global_finance_summary':
            // S'assurer que les colonnes existent (compatible avec les anciennes versions MySQL)
            try { $conn->exec("ALTER TABLE pointages_mensuels ADD COLUMN frais_transport DECIMAL(15,2) DEFAULT 0"); } catch (Exception $e) {}
            try { $conn->exec("ALTER TABLE pointages_mensuels ADD COLUMN frais_repas DECIMAL(15,2) DEFAULT 0"); } catch (Exception $e) {}
            try { $conn->exec("ALTER TABLE pointages_mensuels ADD COLUMN frais_loyer DECIMAL(15,2) DEFAULT 0"); } catch (Exception $e) {}
            try { $conn->exec("ALTER TABLE pointages_mensuels ADD COLUMN frais_gasoil DECIMAL(15,2) DEFAULT 0"); } catch (Exception $e) {}

            // Calcule le total de la main d'œuvre réelle (salaires + frais pointés par le chef) groupé par chantier
            $stmt = $conn->prepare("
                SELECT id_chantier, 
                SUM(COALESCE(total_salaire, 0)) as total_salaires,
                SUM(COALESCE(frais_transport, 0) + COALESCE(frais_repas, 0) + COALESCE(frais_loyer, 0) + COALESCE(frais_gasoil, 0)) as total_frais_pointes,
                SUM(COALESCE(total_salaire, 0) + COALESCE(frais_transport, 0) + COALESCE(frais_repas, 0) + COALESCE(frais_loyer, 0) + COALESCE(frais_gasoil, 0)) as total_main_doeuvre_reelle,
                SUM(COALESCE(total_jours, 0)) as total_jours_pointes 
                FROM pointages_mensuels 
                GROUP BY id_chantier
            ");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_pointages':

            $sql = "INSERT INTO pointages_mensuels (id_chantier, matricule, nom_monteur, mois, annee, salaire_journalier, jours_travailles, total_jours, total_salaire, avances, net_a_payer, frais_transport, frais_repas, frais_loyer, frais_gasoil) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    nom_monteur=VALUES(nom_monteur), salaire_journalier=VALUES(salaire_journalier), 
                    jours_travailles=VALUES(jours_travailles), total_jours=VALUES(total_jours), 
                    total_salaire=VALUES(total_salaire), net_a_payer=VALUES(net_a_payer),
                    frais_transport=VALUES(frais_transport), frais_repas=VALUES(frais_repas),
                    frais_loyer=VALUES(frais_loyer), frais_gasoil=VALUES(frais_gasoil)";
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
                    $p['avances'] ?? 0,
                    $p['net_a_payer'],
                    $p['frais_transport'] ?? 0,
                    $p['frais_repas'] ?? 0,
                    $p['frais_loyer'] ?? 0,
                    $p['frais_gasoil'] ?? 0
                ]);
            }

            echo json_encode(['status' => 'success']);
            break;

        // --- USERS ---
        case 'get_users':
            $stmt = $conn->prepare("SELECT * FROM users ORDER BY name ASC");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($users as &$u) {
                $u['allowed_modules'] = json_decode($u['allowed_modules'] ?? '["dashboard"]');
                unset($u['password']);
            }
            echo json_encode($users);
            break;

        case 'save_user':
            $sql = "INSERT INTO users (id, email, name, role, is_active, allowed_modules, password) 
                    VALUES (?, ?, ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE 
                    name=VALUES(name), role=VALUES(role), is_active=VALUES(is_active), 
                    allowed_modules=VALUES(allowed_modules), password=VALUES(password)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id'],
                $data['email'],
                $data['name'],
                $data['role'],
                $data['isActive'] ? 1 : 0,
                is_array($data['allowedModules'] ?? null) ? json_encode($data['allowedModules']) : ($data['allowed_modules'] ?? '["dashboard"]'),
                $data['password'] ?? '12345678'
            ]);
            echo json_encode(["status" => "success"]);
            break;

        case 'delete_user':
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            echo json_encode(["status" => "success"]);
            break;

        case 'get_interimaires':
            $stmt = $conn->prepare("SELECT id, nom_complet, cin, telephone, agence, specialite, is_blacklisted, blacklist_reason FROM interimaires ORDER BY nom_complet ASC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_interimaire':
            $sql = "INSERT INTO interimaires (id, nom_complet, cin, telephone, agence, specialite, is_blacklisted, blacklist_reason) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    nom_complet=VALUES(nom_complet), cin=VALUES(cin), telephone=VALUES(telephone), 
                    agence=VALUES(agence), specialite=VALUES(specialite), is_blacklisted=VALUES(is_blacklisted),
                    blacklist_reason=VALUES(blacklist_reason)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['id'],
                $data['nom_complet'],
                $data['cin'],
                $data['telephone'] ?? '',
                $data['agence'] ?? '',
                $data['specialite'] ?? '',
                isset($data['is_blacklisted']) ? ($data['is_blacklisted'] ? 1 : 0) : 0,
                $data['blacklist_reason'] ?? ''
            ]);
            echo json_encode(["status" => "success"]);
            break;

        // --- AUDIT LOGS ---
        case 'get_audit_logs':
            $stmt = $conn->prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'save_audit_log':
            // Créer la table si elle n'existe pas encore
            $conn->exec("CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50),
                entity_id VARCHAR(100),
                details TEXT,
                respo_user_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $sql = "INSERT INTO audit_logs (action, entity_type, entity_id, details, respo_user_id) VALUES (?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $data['action'],
                $data['entity_type'] ?? '',
                $data['entity_id'] ?? '',
                $data['details'] ?? '{}',
                $data['respo_user_id'] ?? ''
            ]);
            echo json_encode(["status" => "success"]);


        default:
            echo json_encode(["status" => "error", "message" => "Action inconnue: $action"]);
            break;
    }
} catch (Exception $e) {
    if (strpos($action, 'get_') === 0) {
        echo json_encode([]);
    } else {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
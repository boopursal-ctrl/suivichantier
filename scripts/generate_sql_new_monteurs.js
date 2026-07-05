import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '..', 'scratch', 'raw_monteurs_new.txt');
const data = fs.readFileSync(dataPath, 'utf8');
const lines = data.split('\n');

const cdiMatricules = [100, 102, 101, 104, 157, 103, 159, 357];

const values = [];

for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t').map(s => s.trim());
    const matriculeStr = parts[0];
    const matricule = parseInt(matriculeStr, 10);
    
    if (isNaN(matricule)) continue;

    const nom = parts[1] || '';
    const prenom = parts[2] || '';
    const nom_complet = `${nom} ${prenom}`.trim().replace(/'/g, "''");
    
    let cin = null;
    let poste = 'OUVRIER';
    
    for (const p of parts) {
        if (p.match(/^[A-Z]{1,2}\d+$/i)) {
            cin = p;
        } else if (p.toLowerCase().includes('chef') || p.toLowerCase().includes('resp') || p.toLowerCase().includes('technicien')) {
            poste = 'CHEF_CHANTIER';
        }
    }
    
    if (!cin) {
       const cinCol = parts.find(p => (p.includes("CIN") || p.match(/[A-Za-z]/)) && !p.toLowerCase().includes("monteur") && !p.toLowerCase().includes(nom.toLowerCase()) && p.length < 20);
       if (cinCol && cinCol !== nom && cinCol !== prenom && !cinCol.toLowerCase().includes("deja")) {
           cin = cinCol;
       }
    }
    
    if (cin) cin = `'${cin.replace(/'/g, "''")}'`; else cin = 'NULL';

    let salaire_jour = 100;
    if (parts.includes('120') || parts.includes('120,00')) {
        salaire_jour = 120;
    }
    
    const isCDI = cdiMatricules.includes(matricule);
    const type_contrat = isCDI ? 'CDI' : 'FREELANCE'; 
    
    if (isCDI) {
       salaire_jour = 0; // Journée non calculée
    }

    const sql = `(${matricule}, '${nom_complet}', ${cin}, ${salaire_jour}, NULL, true, '${poste}', '${type_contrat}')`;
    values.push(sql);
}

const header = `
INSERT INTO monteurs (matricule, nom_monteur, cin, salaire_jour, ville_residence, actif, role_monteur, type_contrat)
VALUES 
`;

const footer = `
ON DUPLICATE KEY UPDATE
    nom_monteur = VALUES(nom_monteur),
    cin = VALUES(cin),
    salaire_jour = VALUES(salaire_jour),
    actif = VALUES(actif),
    role_monteur = VALUES(role_monteur),
    type_contrat = VALUES(type_contrat);
`;

const finalSql = header + values.join(',\n') + footer;
const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', 'import_new_monteurs.sql');
fs.writeFileSync(outputPath, finalSql);

console.log(`Fichier SQL généré avec succès pour ${values.length} monteurs: ${outputPath}`);

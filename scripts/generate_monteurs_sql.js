import fs from 'fs';

const rawData = fs.readFileSync('c:\\Users\\Admin\\Documents\\GitHub\\suivichantier\\raw_data_monteurs.txt', 'utf8');

const lines = rawData.split('\n');
const values = [];
let count = 0;

console.log(`Processing ${lines.length} lines...`);

lines.forEach((line, index) => {
    // Skip empty lines
    if (!line.trim()) return;

    // Skip header line (check if it contains "MATRICULE")
    if (line.includes("MATRICULE") || line.includes("SALAIRE JOURNALIER")) {
        console.log(`Skipping header at line ${index}`);
        return;
    }

    // Split by tab or multiple spaces if tab isn't consistent, but prompt implies tabs or fixed width?
    // User pasted from Excel likely, so tabs.
    const columns = line.split('\t');

    if (columns.length < 3) {
        // Fallback for copy-paste issues: try regex for spacing
        // But usually tab is preserved even if it looks like spaces in some viewers.
        // Let's assume tabs first. If not, we might need a regex.
        // console.log(`Line ${index} has few columns: ${columns.length}. Content: ${line}`);
    }

    // Indices based on header: 
    // MATRICULE[0]	Nom[1]	Prenom[2]	CIN[3]	C.N.S.S[4]	[5,empty?]	[6,Cat?]	SALAIRE[7]	N° CONTRAT[8]	VILLE[9]	DATE[10]	OBSERVATION[11]

    // Let's debug columns for first row
    if (count === 0) console.log("First row columns:", columns);

    let matricule = parseInt(columns[0]);

    if (isNaN(matricule)) {
        // Maybe the first column isn't matricule for some lines?
        // Or maybe it's just garbage.
        return;
    }

    let nom = columns[1] ? columns[1].trim() : '';
    let prenom = columns[2] ? columns[2].trim() : '';
    let nom_complet = (nom + ' ' + prenom).trim().replace(/'/g, "''"); // Escape quotes for SQL

    let cin = columns[3] ? columns[3].trim() : null;

    // Column 7 seems to be salary or roughly around there
    let salaire = 100.00; // Default
    // Look for salary in specific column or surrounding
    // Header says: MATRICULE Nom Prenom CIN CNSS (empty) (empty/Cat?) SALAIRE N_CONTRAT VILLE
    // Let's try to parse salary from column 7 or 6
    // Row 100: 100 Ghadbane SAID ... (empty) (empty) (empty) 120,00 ...
    // Wait, the sample has:
    // 103 Ghadbane Khalid ... ... A 120,00 ...
    // So column index might vary if 'A' is present.
    // Let's check parsing "120,00".

    // Find the salary-looking string (###,## or ###.##)
    let foundSalary = false;
    for (let i = 5; i < columns.length; i++) {
        let val = columns[i] ? columns[i].trim() : '';
        if (val.match(/^[0-9]+[,.][0-9]{2}$/)) {
            salaire = parseFloat(val.replace(',', '.'));
            foundSalary = true;
            break;
        }
    }

    // Column 9 (index 9?) is VILLE usually
    // 104 ... 0 523
    // It seems VILLE is often column 9 or 10 depending on blanks.
    let ville = '0522'; // Default Casa? No, let's try to find it.
    let obs = '';

    // Find observation (last non empty?)

    // Better logic: mapping based on fixed positions if possible, but tab count might vary.
    // Let's trust the "120,00" or "100,00" pattern for salary.

    if (cin) cin = `'${cin.replace(/'/g, "''")}'`; else cin = 'NULL';

    // Type definition based on Salary?
    // 120 -> OUVRIER (but technically "Chef" level pay)
    // 100 -> OUVRIER

    // Role?
    // If salary > 100 => maybe CHEF_CHANTIER? Or just skilled.
    // Let's set everyone as OUVRIER for now, but preserving salary is key.

    let ville_val = columns.find(c => c && c.match(/^[0-9\s?]+$/) && (c.includes('0 5') || c.includes('05')));
    if (ville_val) {
        ville_val = ville_val.replace(/\s/g, '').replace(/[^0-9]/g, ''); // Clean to 0522
    }
    let ville_sql = ville_val ? `'${ville_val}'` : 'NULL';

    // SQL
    const sql = `(${matricule}, '${nom_complet}', ${cin}, ${salaire}, ${ville_sql}, true, 'OUVRIER', 'CDI')`;
    values.push(sql);
    count++;
});

const header = `
INSERT INTO monteurs (matricule, nom_monteur, cin, salaire_jour, ville_residence, actif, role_monteur, type_contrat)
VALUES 
`;

const footer = `
ON CONFLICT (matricule) DO UPDATE SET
    nom_monteur = EXCLUDED.nom_monteur,
    cin = EXCLUDED.cin,
    salaire_jour = EXCLUDED.salaire_jour,
    ville_residence = EXCLUDED.ville_residence,
    actif = EXCLUDED.actif,
    role_monteur = EXCLUDED.role_monteur,
    type_contrat = EXCLUDED.type_contrat;
`;

const finalSql = header + values.join(',\n') + footer;

fs.writeFileSync('c:\\Users\\Admin\\Documents\\GitHub\\suivichantier\\supabase\\migrations\\20260120_import_monteurs_data.sql', finalSql);

console.log(`Generated SQL for ${count} monteurs.`);

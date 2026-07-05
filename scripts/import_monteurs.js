import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
        const i = line.indexOf('=');
        if (i > 0) {
            const key = line.substring(0, i).trim();
            const value = line.substring(i + 1).trim();
            process.env[key] = value;
        }
    }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dataPath = path.join(__dirname, '..', 'scratch', 'raw_monteurs_new.txt');
const data = fs.readFileSync(dataPath, 'utf8');
const lines = data.split('\n');

const cdiMatricules = [100, 102, 101, 104, 157, 103, 159, 357];

const monteursToUpsert = [];

for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t').map(s => s.trim());
    const matriculeStr = parts[0];
    const matricule = parseInt(matriculeStr, 10);
    
    if (isNaN(matricule)) continue;

    const nom = parts[1] || '';
    const prenom = parts[2] || '';
    const nom_complet = `${nom} ${prenom}`.trim();
    
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

    let salaire_jour = 100;
    if (parts.includes('120') || parts.includes('120,00')) {
        salaire_jour = 120;
    }
    
    const isCDI = cdiMatricules.includes(matricule);
    const type_contrat = isCDI ? 'CDI' : 'FREELANCE'; 
    
    if (isCDI) {
       salaire_jour = 0; // Journée non calculée
    }

    monteursToUpsert.push({
        matricule,
        nom_monteur: nom_complet,
        cin: cin || null,
        type_contrat,
        role_monteur: poste,
        salaire_jour,
        actif: true
    });
}

async function run() {
    console.log(`Préparation de l'importation de ${monteursToUpsert.length} collaborateurs...`);
    
    const { data, error } = await supabase
        .from('monteurs')
        .upsert(monteursToUpsert, { onConflict: 'matricule' });
        
    if (error) {
        console.error("Erreur lors de l'importation:", error);
    } else {
        console.log(`Succès: ${monteursToUpsert.length} collaborateurs importés/mis à jour.`);
    }
}

run();

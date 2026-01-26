// services/contratService.ts
// Service pour la gestion automatique des contrats des monteurs par chantier

import { supabase } from './supabaseClient';
import { Contrat, Monteur, Chantier } from '../types';

/**
 * Génère automatiquement un contrat lors de l'affectation d'un monteur à un chantier
 * @param monteur - Le monteur à affecter
 * @param chantier - Le chantier d'affectation
 * @param userEmail - Email de l'utilisateur qui crée le contrat
 * @returns Le contrat créé
 */
export async function createContratAutomatique(
    monteur: Monteur,
    chantier: Chantier,
    userEmail?: string
): Promise<Contrat | null> {
    try {
        console.log(`📝 Création automatique du contrat pour ${monteur.nom_monteur} sur ${chantier.ref_chantier}`);

        // 1. Clôturer automatiquement les contrats actifs existants
        await closeActiveContracts(
            monteur.matricule,
            new Date().toISOString().split('T')[0],
            `Réaffectation au chantier ${chantier.ref_chantier}`,
            userEmail
        );

        // 2. Créer le nouveau contrat
        const nouveauContrat: Omit<Contrat, 'id_contrat' | 'created_at' | 'updated_at'> = {
            matricule: monteur.matricule,
            nom_monteur: monteur.nom_monteur,
            id_chantier: chantier.id_chantier,
            ref_chantier: chantier.ref_chantier,
            nom_client: chantier.nom_client,

            // Informations personnelles
            cin: monteur.cin || undefined,
            date_naissance: monteur.date_naissance || undefined,
            ville_residence: monteur.ville_residence,
            nationalite: 'MAROCAINE',

            // Informations du contrat
            type_contrat: monteur.type_contrat,
            role_monteur: monteur.role_monteur,
            salaire_journalier: monteur.salaire_jour,

            // Dates
            date_debut: new Date().toISOString().split('T')[0],

            // Statut
            statut: 'actif',

            // Métadonnées
            created_by: userEmail
        };

        const { data, error } = await supabase
            .from('contrats')
            .insert([nouveauContrat])
            .select()
            .single();

        if (error) {
            console.error('❌ Erreur création contrat:', error);
            throw error;
        }

        console.log('✅ Contrat créé avec succès:', data.id_contrat);
        return data as Contrat;

    } catch (error) {
        console.error('❌ Exception création contrat automatique:', error);
        return null;
    }
}

/**
 * Clôture automatiquement tous les contrats actifs d'un monteur
 * @param matricule - Matricule du monteur
 * @param dateFin - Date de clôture
 * @param motif - Motif de la clôture
 * @param closedBy - Email de l'utilisateur qui clôture
 */
export async function closeActiveContracts(
    matricule: number,
    dateFin: string,
    motif: string,
    closedBy?: string
): Promise<void> {
    try {
        console.log(`🔒 Clôture des contrats actifs pour le matricule ${matricule}`);

        const { error } = await supabase
            .from('contrats')
            .update({
                statut: 'clos',
                date_fin: dateFin,
                motif_cloture: motif,
                closed_by: closedBy,
                updated_at: new Date().toISOString()
            })
            .eq('matricule', matricule)
            .eq('statut', 'actif');

        if (error) {
            console.error('❌ Erreur clôture contrats:', error);
            throw error;
        }

        console.log('✅ Contrats actifs clôturés avec succès');
    } catch (error) {
        console.error('❌ Exception clôture contrats:', error);
        throw error;
    }
}

/**
 * Récupère tous les contrats
 */
export async function getAllContrats(): Promise<Contrat[]> {
    try {
        const { data, error } = await supabase
            .from('contrats')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Contrat[];
    } catch (error) {
        console.error('❌ Erreur récupération contrats:', error);
        return [];
    }
}

/**
 * Récupère les contrats d'un monteur
 */
export async function getContratsByMonteur(matricule: number): Promise<Contrat[]> {
    try {
        const { data, error } = await supabase
            .from('contrats')
            .select('*')
            .eq('matricule', matricule)
            .order('date_debut', { ascending: false });

        if (error) throw error;
        return data as Contrat[];
    } catch (error) {
        console.error('❌ Erreur récupération contrats monteur:', error);
        return [];
    }
}

/**
 * Récupère les contrats d'un chantier
 */
export async function getContratsByChantier(idChantier: string): Promise<Contrat[]> {
    try {
        const { data, error } = await supabase
            .from('contrats')
            .select('*')
            .eq('id_chantier', idChantier)
            .order('date_debut', { ascending: false });

        if (error) throw error;
        return data as Contrat[];
    } catch (error) {
        console.error('❌ Erreur récupération contrats chantier:', error);
        return [];
    }
}

/**
 * Récupère le contrat actif d'un monteur
 */
export async function getContratActif(matricule: number): Promise<Contrat | null> {
    try {
        const { data, error } = await supabase
            .from('contrats')
            .select('*')
            .eq('matricule', matricule)
            .eq('statut', 'actif')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Aucun contrat actif trouvé
                return null;
            }
            throw error;
        }

        return data as Contrat;
    } catch (error) {
        console.error('❌ Erreur récupération contrat actif:', error);
        return null;
    }
}

/**
 * Met à jour un contrat
 */
export async function updateContrat(contrat: Contrat): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('contrats')
            .update(contrat)
            .eq('id_contrat', contrat.id_contrat);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Erreur mise à jour contrat:', error);
        return false;
    }
}

/**
 * Clôture manuellement un contrat
 */
export async function clotureContrat(
    idContrat: string,
    dateFin: string,
    motif: string,
    closedBy?: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('contrats')
            .update({
                statut: 'clos',
                date_fin: dateFin,
                motif_cloture: motif,
                closed_by: closedBy,
                updated_at: new Date().toISOString()
            })
            .eq('id_contrat', idContrat);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('❌ Erreur clôture contrat:', error);
        return false;
    }
}

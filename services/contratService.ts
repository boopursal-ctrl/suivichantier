// services/contratService.ts
// Service pour la gestion automatique des contrats des monteurs par chantier
// Migration MySQL : toutes les fonctions retournent des valeurs vides en attendant l'implémentation MySQL

import { Contrat, Monteur, Chantier } from '../types';

/**
 * Génère automatiquement un contrat lors de l'affectation d'un monteur à un chantier
 * @param monteur - Le monteur à affecter
 * @param chantier - Le chantier d'affectation
 * @param userEmail - Email de l'utilisateur qui crée le contrat
 * @returns Le contrat créé
 */
export async function createContratAutomatique(monteur: Monteur, chantier: Chantier, userEmail?: string): Promise<Contrat | null> {
    return null; // Supabase PAUSED
}

export async function closeActiveContracts(matricule: number, dateFin: string, motif: string, closedBy?: string): Promise<void> {
    return; // Supabase PAUSED
}

export async function getAllContrats(): Promise<Contrat[]> {
    return []; // Supabase PAUSED
}

export async function getContratsByMonteur(matricule: number): Promise<Contrat[]> {
    return []; // Supabase PAUSED
}

export async function getContratsByChantier(idChantier: string): Promise<Contrat[]> {
    return []; // Supabase PAUSED
}

export async function getContratActif(matricule: number): Promise<Contrat | null> {
    return null; // Supabase PAUSED
}

export async function updateContrat(contrat: Contrat): Promise<boolean> {
    return true; // Supabase PAUSED
}

export async function clotureContrat(idContrat: string, dateFin: string, motif: string, closedBy?: string): Promise<boolean> {
    return true; // Supabase PAUSED
}

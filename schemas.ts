import { z } from 'zod';

// Schéma pour la validation d'un Monteur (Collaborateur)
export const monteurSchema = z.object({
    nom_monteur: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    telephone: z.string().optional().nullable().or(z.literal('')),
    cin: z.string().optional().nullable().or(z.literal('')),
    ville_residence: z.string().optional().nullable().or(z.literal('')),
    date_naissance: z.string().optional().nullable(),
    date_debut_contrat: z.string().optional().nullable(),
    salaire_jour: z.number().min(0, "Le salaire journalier ne peut pas être négatif"),
    email: z.string().email("Format d'email invalide").optional().or(z.literal('')),
});

// Schéma pour la validation d'un Article de Stock
export const articleSchema = z.object({
    nom: z.string().min(2, "Le nom de l'article est trop court"),
    reference: z.string().min(2, "La référence est requise"),
    quantite: z.number().min(0, "La quantité ne peut pas être négative"),
    unite: z.string().min(1, "L'unité est requise"),
    seuil_alerte: z.number().min(0, "Le seuil d'alerte doit être positif"),
    emplacement: z.string().optional(),
});

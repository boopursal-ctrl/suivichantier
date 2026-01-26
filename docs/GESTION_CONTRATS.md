# 📋 Gestion Automatique des Contrats - Documentation

## 🎯 Objectif

Système de gestion automatique des contrats des monteurs par chantier. Chaque monteur doit avoir un contrat spécifique par chantier, avec gestion automatique de la création et de la clôture.

## 🔹 Règles Fonctionnelles

### Principe de Base
- **Un monteur = Un seul contrat actif à la fois**
- **Un contrat = 1 monteur + 1 chantier**

### Gestion Automatique

#### 1. Affectation à un nouveau chantier
Lorsqu'un monteur est affecté à un chantier :
- ✅ **Génération automatique** d'un nouveau contrat
- 📅 **Date de début** = date d'affectation
- 🟢 **Statut** = `actif`

#### 2. Réaffectation à un autre chantier
Lorsqu'un monteur est réaffecté :
- 🔒 **Clôture automatique** du contrat précédent
  - Date de fin = date de réaffectation
  - Statut = `clos`
  - Motif = "Réaffectation au chantier [REF]"
- ✅ **Création automatique** d'un nouveau contrat pour le nouveau chantier

## 📁 Structure du Projet

### Fichiers Créés

1. **`types.ts`** (modifié)
   - Ajout du type `StatutContrat`
   - Ajout de l'interface `Contrat`

2. **`supabase/migrations/20260126_create_contrats_table.sql`**
   - Création de la table `contrats`
   - Index et contraintes
   - Fonctions SQL pour la gestion automatique

3. **`services/contratService.ts`**
   - Service de gestion des contrats
   - Fonctions de création, clôture, récupération

4. **`pages/Contrats.tsx`**
   - Interface de gestion des contrats
   - Visualisation, filtrage, recherche
   - Clôture manuelle

## 🗄️ Structure de la Base de Données

### Table `contrats`

```sql
CREATE TABLE contrats (
    id_contrat UUID PRIMARY KEY,
    matricule INTEGER NOT NULL,
    nom_monteur TEXT NOT NULL,
    id_chantier UUID NOT NULL,
    ref_chantier TEXT NOT NULL,
    nom_client TEXT NOT NULL,
    
    -- Informations personnelles
    cin TEXT,
    date_naissance DATE,
    adresse TEXT,
    ville_residence TEXT,
    nationalite TEXT DEFAULT 'MAROCAINE',
    
    -- Informations du contrat
    type_contrat TEXT NOT NULL,
    role_monteur TEXT NOT NULL,
    salaire_journalier NUMERIC(10, 2),
    
    -- Dates
    date_debut DATE NOT NULL,
    date_fin DATE,
    
    -- Statut
    statut TEXT NOT NULL DEFAULT 'actif',
    
    -- Métadonnées
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by TEXT,
    closed_by TEXT,
    motif_cloture TEXT
);
```

### Contraintes

- **Clé étrangère** : `matricule` → `monteurs(matricule)`
- **Clé étrangère** : `id_chantier` → `chantiers(id_chantier)`
- **Contrainte unique** : Un seul contrat actif par monteur
- **Contrainte de dates** : `date_fin >= date_debut`

## 🚀 Utilisation

### 1. Migration de la Base de Données

Exécutez la migration SQL :

```bash
# Via Supabase CLI
supabase db push

# Ou via l'interface Supabase
# SQL Editor → Exécuter le fichier 20260126_create_contrats_table.sql
```

### 2. Intégration dans le Code

#### Lors de l'affectation d'un monteur

```typescript
import { createContratAutomatique } from '../services/contratService';

// Lors de l'affectation
const affecterMonteur = async (monteur: Monteur, chantier: Chantier) => {
  // 1. Créer l'affectation
  await addAffectation({
    id_chantier: chantier.id_chantier,
    matricule: monteur.matricule,
    // ... autres champs
  });
  
  // 2. Créer automatiquement le contrat
  await createContratAutomatique(monteur, chantier, user?.email);
};
```

### 3. Accès à la Page de Gestion

La page `Contrats` permet de :
- 📊 Visualiser tous les contrats
- 🔍 Rechercher par monteur, chantier ou client
- 🎯 Filtrer par statut (actif, clos, suspendu)
- 🔒 Clôturer manuellement un contrat
- 📄 Voir les détails d'un contrat

## 📊 Fonctionnalités du Service

### `createContratAutomatique(monteur, chantier, userEmail)`
Crée automatiquement un contrat lors de l'affectation.
- Clôture les contrats actifs existants
- Génère un nouveau contrat actif

### `closeActiveContracts(matricule, dateFin, motif, closedBy)`
Clôture tous les contrats actifs d'un monteur.

### `getAllContrats()`
Récupère tous les contrats.

### `getContratsByMonteur(matricule)`
Récupère l'historique des contrats d'un monteur.

### `getContratsByChantier(idChantier)`
Récupère tous les contrats d'un chantier.

### `getContratActif(matricule)`
Récupère le contrat actif d'un monteur.

### `clotureContrat(idContrat, dateFin, motif, closedBy)`
Clôture manuellement un contrat.

## 🎨 Interface Utilisateur

### Page Contrats

#### Statistiques
- Total des contrats
- Contrats actifs
- Contrats clôturés
- Contrats suspendus

#### Tableau des Contrats
Affiche pour chaque contrat :
- Monteur (nom + matricule)
- Chantier (référence)
- Client
- Type de contrat (CDI, CDD, ANAPEC, FREELANCE)
- Rôle (Chef de chantier / Ouvrier)
- Salaire journalier
- Date de début
- Date de fin
- Statut (badge coloré)
- Actions (Clôturer, Détails)

#### Filtres
- Recherche textuelle
- Filtre par statut

## 🔄 Workflow Complet

### Scénario 1 : Première Affectation

```
Monteur OMAR (matricule 208)
↓
Affecté au chantier C602-240724
↓
✅ Création automatique du contrat
   - Date début: 26/01/2026
   - Statut: actif
   - Chantier: C602-240724
```

### Scénario 2 : Réaffectation

```
Monteur OMAR (matricule 208)
Contrat actif: C602-240724
↓
Réaffecté au chantier C603-240801
↓
🔒 Clôture automatique contrat C602-240724
   - Date fin: 26/01/2026
   - Statut: clos
   - Motif: "Réaffectation au chantier C603-240801"
↓
✅ Création automatique nouveau contrat
   - Date début: 26/01/2026
   - Statut: actif
   - Chantier: C603-240801
```

## 📝 Modèle de Contrat

Le modèle de contrat (visible dans votre capture) contient :

### Article 1 : État Civil
- Nom, prénom
- Date de naissance
- Nationalité
- Adresse
- Ville
- CIN
- Matricule
- N° CNSS

### Article 2 : Date d'Embauche
- Date début chantier
- Date fin de chantier
- Nom du chantier

### Article 3 : Emploi et Qualification
- Poste (Monteur / Chef de Chantier)

### Article 4 : Durée du Contrat
- Durée déterminée par la durée du chantier

### Article 5 : Lieu de Travail et Mobilité Géographique
- Adresse du chantier

### Article 6 : Horaires de Travail
- Conformément au code du travail

### Article 7 : Congés Payés
- Selon législation

### Article 8 : Ponctualité et Assiduité
- Règles de présence

### Article 9 : Appointements
- Salaire journalier

### Article 11 : Matériel Mis à Disposition
- Liste du matériel fourni

## ✅ Avantages du Système

1. **Automatisation** : Plus besoin de créer manuellement les contrats
2. **Traçabilité** : Historique complet des affectations
3. **Conformité** : Un seul contrat actif par monteur
4. **Audit** : Suivi des créations et clôtures (qui, quand, pourquoi)
5. **Simplicité** : Interface intuitive pour la gestion

## 🔐 Sécurité

- Contrainte unique empêchant plusieurs contrats actifs
- Clés étrangères garantissant l'intégrité référentielle
- Audit trail complet (created_by, closed_by)
- Validation des dates

## 📞 Support

Pour toute question ou problème :
1. Vérifier que la migration SQL a été exécutée
2. Vérifier les logs de la console
3. Consulter la table `contrats` dans Supabase

---

**Date de création** : 26/01/2026
**Version** : 1.0
**Auteur** : Système de Gestion des Chantiers

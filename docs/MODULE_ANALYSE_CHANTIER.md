# Module d'Analyse de Chantier - Documentation

## 📋 Vue d'ensemble

Ce module permet de générer une analyse complète d'un chantier terminé, en évaluant plusieurs critères de performance et en proposant des primes pour les chefs de chantier si tous les critères sont parfaits.

## ✅ Critères d'évaluation

### 1. Budget
- **Tolérance**: ±5%
- **Calcul**: Comparaison entre budget prévu et budget réel (coûts + salaires + monteurs locaux)
- **Statut**: ✅ Respecté si l'écart est dans la tolérance

### 2. Durée
- **Tolérance**: ±2 jours
- **Calcul**: Comparaison entre durée prévue et durée réelle
- **Statut**: ✅ Respectée si l'écart est dans la tolérance

### 3. Documents cachetés
- **BL** (Bon de Livraison): ☑️ Cacheté
- **BC** (Bon de Commande): ☑️ Cacheté  
- **BR** (Bon de Réception): ☑️ Cacheté

### 4. Remarques
- Zone de texte libre pour observations générales

## 🎯 Résultat "PARFAIT"

Si **TOUS** les critères sont respectés:
- Budget dans la tolérance (±5%)
- Durée dans la tolérance (±2 jours)
- BL cacheté ✅
- BC cacheté ✅
- BR cacheté ✅

→ Le système affiche un badge **"PARFAIT"** et permet de définir des primes.

## 💰 Système de Primes

### Bénéficiaires
1. **Chef de Chantier**
2. **Sous Chef de Chantier**

### Processus
1. **Saisie**: L'utilisateur sélectionne le monteur et saisit le montant fixe de la prime
2. **Enregistrement**: Les primes sont enregistrées avec le statut "en_attente"
3. **Validation DG**: Le Directeur Général (rôle ADMIN) peut:
   - ✅ **Valider** la prime
   - ❌ **Refuser** la prime (avec commentaire)

### Statuts des primes
- 🟡 **en_attente**: En attente de validation
- ✅ **validee**: Validée par le DG
- ❌ **refusee**: Refusée par le DG

## 🗄️ Structure de la base de données

### Table `analyses_chantier`
```sql
- id_analyse (UUID, PK)
- id_chantier (TEXT, FK)
- budget_prevu, budget_reel, budget_respecte
- ecart_budget, pourcentage_ecart_budget
- duree_prevue, duree_reelle, duree_respectee
- ecart_duree
- bl_cachete, bc_cachete, br_cachete (BOOLEAN)
- remarques (TEXT)
- tous_criteres_parfaits (BOOLEAN)
- date_analyse, genere_par
```

### Table `primes_chantier`
```sql
- id_prime (UUID, PK)
- id_analyse (UUID, FK)
- id_chantier (TEXT, FK)
- matricule (INTEGER, FK)
- nom_monteur, role_chantier
- montant_prime (DECIMAL)
- statut (en_attente | validee | refusee)
- validee_par, date_validation
- commentaire_validation
```

## 🚀 Utilisation

### 1. Accès au module
- Le bouton **"Générer Analyse"** apparaît uniquement pour les chantiers avec le statut **"terminé"**
- Situé dans l'en-tête de la page de détail du chantier

### 2. Génération de l'analyse
1. Cliquer sur **"Générer Analyse"**
2. Vérifier les calculs automatiques (budget et durée)
3. Cocher les documents cachetés (BL, BC, BR)
4. Ajouter des remarques si nécessaire
5. Cliquer sur **"Générer l'Analyse"**

### 3. Définition des primes (si PARFAIT)
1. Sélectionner le **Chef de Chantier** dans la liste
2. Saisir le **montant de la prime**
3. Sélectionner le **Sous Chef de Chantier**
4. Saisir le **montant de la prime**
5. Cliquer sur **"Enregistrer les Primes"**

### 4. Validation des primes (DG uniquement)
1. Les primes apparaissent avec le statut "en_attente"
2. Le DG peut **Valider** ou **Refuser** chaque prime
3. En cas de refus, un commentaire est demandé

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers
1. `supabase/migrations/20260209_create_analyse_chantier.sql` - Migration SQL
2. `pages/AnalyseChantier.tsx` - Page d'analyse complète

### Fichiers modifiés
1. `types.ts` - Ajout des interfaces `AnalyseChantier` et `PrimeChantier`
2. `pages/SiteDetail.tsx` - Ajout du bouton et de la navigation

## 🎨 Design

- Interface moderne avec gradient et ombres
- Badge "PARFAIT" en vert pour les chantiers exemplaires
- Indicateurs visuels (✅/❌) pour chaque critère
- Cartes colorées pour budget (bleu) et durée (violet)
- Section primes avec icône Award (🏆)

## 🔒 Permissions

- **Tous les utilisateurs**: Peuvent générer une analyse et définir des primes
- **ADMIN (DG)**: Seuls habilités à valider/refuser les primes

## 📊 Calculs automatiques

### Budget réel
```typescript
Budget réel = Coûts directs + Salaires permanents + Salaires locaux
```

### Durée réelle
```typescript
Durée réelle = countDays(date_debut, date_fin)
```

### Exclusions
Les matricules permanents de direction (100, 101, 102, 103, 104, 157) sont exclus du calcul des salaires.

## ✨ Fonctionnalités avancées

- ✅ Historique: Une seule analyse par chantier (la nouvelle remplace l'ancienne)
- ✅ Traçabilité: Email de l'utilisateur qui a généré l'analyse
- ✅ Validation: Seul le DG peut valider les primes
- ✅ Commentaires: Possibilité d'ajouter un motif en cas de refus
- ✅ Responsive: Interface adaptée mobile et desktop

## 🔄 Workflow complet

```
Chantier terminé
    ↓
Bouton "Générer Analyse" visible
    ↓
Génération de l'analyse
    ↓
Vérification des critères
    ↓
Si PARFAIT → Définition des primes
    ↓
Validation DG
    ↓
Primes validées ✅
```

## 🐛 Gestion des erreurs

- Vérification de l'existence du chantier
- Gestion des erreurs Supabase
- Messages d'alerte clairs pour l'utilisateur
- Validation des formulaires (montants, sélections)

## 📝 Notes importantes

1. Le bouton n'apparaît que pour les chantiers **"terminé"**
2. Les primes ne peuvent être définies que si **TOUS** les critères sont parfaits
3. Seul le **DG (ADMIN)** peut valider les primes
4. Une nouvelle analyse **remplace** l'ancienne pour le même chantier
5. Les montants de primes sont **fixes** (pas de pourcentage)

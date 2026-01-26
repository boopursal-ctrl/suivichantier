# 🧪 GUIDE DE TEST - Gestion Automatique des Contrats

## ✅ ÉTAPE 1 : Créer la Table dans Supabase (5 minutes)

### Option A : Via l'Interface Supabase (RECOMMANDÉ)

1. **Ouvrir Supabase**
   - Aller sur https://supabase.com
   - Se connecter à votre projet

2. **Ouvrir SQL Editor**
   - Dans le menu de gauche, cliquer sur **SQL Editor**
   - Cliquer sur **New Query**

3. **Copier le SQL**
   - Ouvrir le fichier : `supabase/migrations/20260126_create_contrats_table.sql`
   - Copier TOUT le contenu (Ctrl+A puis Ctrl+C)

4. **Exécuter le SQL**
   - Coller dans SQL Editor (Ctrl+V)
   - Cliquer sur **Run** (ou F5)
   - ✅ Vous devriez voir : "Success. No rows returned"

5. **Vérifier la Table**
   - Aller dans **Table Editor**
   - Chercher la table **contrats**
   - ✅ La table doit apparaître avec toutes les colonnes

### Option B : Via Commande (si vous avez Supabase CLI)

```bash
cd c:\Users\Admin\Documents\GitHub\suivichantier
supabase db push
```

---

## ✅ ÉTAPE 2 : Ajouter la Route dans l'Application (2 minutes)

### Fichier : `App.tsx`

Trouver la section des routes et ajouter :

```typescript
import Contrats from './pages/Contrats';

// Dans vos routes (chercher les autres <Route>)
<Route path="/contrats" element={<Contrats />} />
```

**Exemple complet** :
```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/chantiers" element={<Chantiers />} />
  <Route path="/monteurs" element={<Monteurs />} />
  <Route path="/contrats" element={<Contrats />} />  {/* ← AJOUTER ICI */}
  {/* ... autres routes */}
</Routes>
```

---

## ✅ ÉTAPE 3 : Ajouter au Menu de Navigation (2 minutes)

### Trouver votre fichier de navigation

Chercher où sont définis les liens du menu (probablement dans `App.tsx` ou un composant `Sidebar`/`Navbar`).

**Ajouter** :
```typescript
{
  name: 'Contrats',
  path: '/contrats',
  icon: FileText,  // Importer: import { FileText } from 'lucide-react';
  module: 'contrats'
}
```

---

## ✅ ÉTAPE 4 : Accéder à la Page Contrats (1 minute)

1. **Sauvegarder tous les fichiers** (Ctrl+S)
2. **L'application devrait se recharger automatiquement**
3. **Dans votre navigateur**, aller sur :
   ```
   http://localhost:5173/contrats
   ```
   (ou le port de votre application)

4. **Vous devriez voir** :
   - 📋 Titre "Gestion des Contrats"
   - 4 cartes de statistiques (toutes à 0 pour l'instant)
   - Barre de recherche
   - Message "Aucun contrat trouvé"

✅ **Si vous voyez ça, la page fonctionne !**

---

## 🧪 ÉTAPE 5 : Créer un Contrat de Test Manuellement (5 minutes)

Pour tester sans modifier le code d'affectation, créons un contrat manuellement.

### Via Supabase SQL Editor

```sql
-- Récupérer un monteur et un chantier existants
SELECT matricule, nom_monteur FROM monteurs LIMIT 1;
SELECT id_chantier, ref_chantier, nom_client FROM chantiers WHERE statut = 'actif' LIMIT 1;

-- Créer un contrat de test (REMPLACER les valeurs)
INSERT INTO contrats (
    matricule,
    nom_monteur,
    id_chantier,
    ref_chantier,
    nom_client,
    type_contrat,
    role_monteur,
    salaire_journalier,
    date_debut,
    statut,
    created_by
) VALUES (
    208,  -- ← REMPLACER par un matricule réel
    'OMAR',  -- ← REMPLACER par le nom du monteur
    'VOTRE-ID-CHANTIER-UUID',  -- ← REMPLACER par un id_chantier réel
    'C602-240724',  -- ← REMPLACER par une ref_chantier réelle
    'STEEP PLASTIQUE',  -- ← REMPLACER par un nom_client réel
    'CDI',
    'OUVRIER',
    120.00,
    CURRENT_DATE,
    'actif',
    'test@example.com'
);
```

### Vérifier dans l'Application

1. **Rafraîchir la page** `/contrats`
2. **Vous devriez voir** :
   - Statistiques : Total = 1, Actifs = 1
   - Une ligne dans le tableau avec votre contrat
   - Badge vert "ACTIF"

✅ **Si vous voyez le contrat, tout fonctionne !**

---

## 🧪 ÉTAPE 6 : Tester la Création Automatique (10 minutes)

Maintenant, testons la création automatique lors d'une affectation.

### 6.1 Trouver le Fichier d'Affectation

Chercher où vous affectez les monteurs aux chantiers. Probablement dans :
- `pages/Chantiers.tsx`
- `pages/Monteurs.tsx`
- Un composant d'affectation

### 6.2 Ajouter l'Import

En haut du fichier :
```typescript
import { createContratAutomatique } from '../services/contratService';
import { useAuth } from '../contexts/AuthContext';
```

### 6.3 Récupérer l'Utilisateur

Dans votre composant :
```typescript
const { user } = useAuth();
```

### 6.4 Modifier la Fonction d'Affectation

**AVANT** :
```typescript
const handleAffectation = async (monteur, chantier) => {
  await addAffectation({
    id_chantier: chantier.id_chantier,
    matricule: monteur.matricule,
    // ... autres champs
  });
  toast.success('Affectation réussie');
};
```

**APRÈS** :
```typescript
const handleAffectation = async (monteur, chantier) => {
  try {
    // 1. Créer l'affectation
    await addAffectation({
      id_chantier: chantier.id_chantier,
      matricule: monteur.matricule,
      // ... autres champs
    });
    
    // 2. Créer automatiquement le contrat
    const contrat = await createContratAutomatique(
      monteur,
      chantier,
      user?.email
    );
    
    if (contrat) {
      toast.success('Affectation réussie - Contrat généré automatiquement');
    } else {
      toast.warning('Affectation créée mais erreur lors de la génération du contrat');
    }
  } catch (error) {
    console.error('Erreur:', error);
    toast.error('Erreur lors de l\'affectation');
  }
};
```

### 6.5 Tester l'Affectation

1. **Aller dans Chantiers** (ou là où vous affectez les monteurs)
2. **Affecter un monteur à un chantier**
3. **Vérifier** :
   - Toast de succès : "Affectation réussie - Contrat généré automatiquement"
   - Ouvrir la console (F12) → Onglet Console
   - Chercher : "📝 Création automatique du contrat"
   - Chercher : "✅ Contrat créé avec succès"

4. **Aller dans `/contrats`**
5. **Vérifier** :
   - Un nouveau contrat actif apparaît
   - Avec les bonnes informations (monteur, chantier, etc.)

✅ **Si le contrat apparaît, la création automatique fonctionne !**

---

## 🧪 ÉTAPE 7 : Tester la Réaffectation (5 minutes)

Testons maintenant la clôture automatique lors d'une réaffectation.

### 7.1 Affecter le Même Monteur à un Autre Chantier

1. **Prendre le monteur** qui a déjà un contrat actif
2. **L'affecter à un AUTRE chantier**
3. **Vérifier dans la console** :
   - "🔒 Clôture des contrats actifs pour le matricule XXX"
   - "✅ Contrats actifs clôturés avec succès"
   - "📝 Création automatique du contrat"
   - "✅ Contrat créé avec succès"

### 7.2 Vérifier dans `/contrats`

1. **Rafraîchir la page**
2. **Vous devriez voir** :
   - L'ancien contrat avec statut "CLOS" (badge gris)
   - Date de fin = aujourd'hui
   - Motif de clôture = "Réaffectation au chantier [REF]"
   - Un nouveau contrat avec statut "ACTIF" (badge vert)

✅ **Si vous voyez les 2 contrats (1 clos + 1 actif), la réaffectation fonctionne !**

---

## 🧪 ÉTAPE 8 : Tester la Clôture Manuelle (3 minutes)

### 8.1 Dans la Page `/contrats`

1. **Trouver un contrat actif**
2. **Cliquer sur le bouton "Clôturer"** (bouton rouge)
3. **Une modal s'ouvre**
4. **Saisir un motif** : "Fin de chantier" ou "Test de clôture"
5. **Cliquer sur "Clôturer"**

### 8.2 Vérifier

1. **La modal se ferme**
2. **Toast de succès** : "Contrat clôturé avec succès"
3. **Le contrat passe en statut "CLOS"** (badge gris)
4. **La date de fin** = aujourd'hui
5. **Le motif** apparaît dans les détails

✅ **Si le contrat est clôturé, la clôture manuelle fonctionne !**

---

## 🧪 ÉTAPE 9 : Tester la Recherche et les Filtres (2 minutes)

### 9.1 Recherche

1. **Dans la barre de recherche**, taper :
   - Un nom de monteur (ex: "OMAR")
   - Une référence de chantier (ex: "C602")
   - Un nom de client (ex: "STEEP")
2. **Vérifier** que seuls les contrats correspondants s'affichent

### 9.2 Filtres

1. **Sélectionner "Actifs"** dans le filtre
2. **Vérifier** que seuls les contrats actifs s'affichent
3. **Sélectionner "Clôturés"**
4. **Vérifier** que seuls les contrats clôturés s'affichent

✅ **Si les filtres fonctionnent, tout est OK !**

---

## 📊 RÉSUMÉ DES TESTS

| Test | Objectif | Résultat Attendu |
|------|----------|------------------|
| ✅ 1. Migration SQL | Créer la table | Table `contrats` visible dans Supabase |
| ✅ 2. Route | Accéder à la page | Page `/contrats` accessible |
| ✅ 3. Contrat manuel | Vérifier l'affichage | Contrat visible dans le tableau |
| ✅ 4. Création auto | Tester l'affectation | Contrat créé automatiquement |
| ✅ 5. Réaffectation | Tester la clôture auto | Ancien contrat clos, nouveau actif |
| ✅ 6. Clôture manuelle | Tester la modal | Contrat clôturé avec motif |
| ✅ 7. Recherche | Tester les filtres | Résultats filtrés correctement |

---

## 🐛 DÉPANNAGE

### Problème 1 : "Table contrats does not exist"
**Solution** : La migration SQL n'a pas été exécutée
- Retourner à l'Étape 1
- Exécuter le SQL dans Supabase

### Problème 2 : Page `/contrats` ne s'affiche pas
**Solution** : La route n'est pas ajoutée
- Vérifier `App.tsx`
- Ajouter `<Route path="/contrats" element={<Contrats />} />`
- Redémarrer l'application

### Problème 3 : Erreur "createContratAutomatique is not defined"
**Solution** : Import manquant
- Ajouter : `import { createContratAutomatique } from '../services/contratService';`

### Problème 4 : Contrat non créé lors de l'affectation
**Solution** : Vérifier la console
- Ouvrir F12 → Console
- Chercher les erreurs en rouge
- Vérifier que `user?.email` n'est pas undefined

### Problème 5 : Erreur "duplicate key value violates unique constraint"
**Solution** : Le monteur a déjà un contrat actif
- C'est normal ! La contrainte fonctionne
- La fonction `createContratAutomatique()` devrait clôturer l'ancien contrat d'abord
- Vérifier que vous utilisez bien `createContratAutomatique()` et pas un INSERT direct

---

## 📝 CHECKLIST FINALE

Avant de considérer le test terminé :

- [ ] Table `contrats` créée dans Supabase
- [ ] Page `/contrats` accessible
- [ ] Au moins 1 contrat visible dans le tableau
- [ ] Création automatique fonctionne lors d'une affectation
- [ ] Réaffectation clôture l'ancien contrat et crée le nouveau
- [ ] Clôture manuelle fonctionne
- [ ] Recherche fonctionne
- [ ] Filtres fonctionnent
- [ ] Statistiques s'affichent correctement
- [ ] Aucune erreur dans la console

---

## 🎉 FÉLICITATIONS !

Si tous les tests sont ✅, votre système de gestion automatique des contrats est **100% opérationnel** !

---

**Besoin d'aide ?**
- Consulter `CONTRATS_IMPLEMENTATION_COMPLETE.md`
- Vérifier les logs dans la console (F12)
- Vérifier la table `contrats` dans Supabase

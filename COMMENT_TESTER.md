# 🎯 COMMENT VOIR ET TESTER LES CONTRATS - RÉSUMÉ ULTRA-SIMPLE

## 📋 CHECKLIST RAPIDE

### ✅ 1. Créer la Table (5 min)

1. Aller sur **Supabase.com** → Votre projet
2. Cliquer sur **SQL Editor** (menu gauche)
3. Cliquer sur **New Query**
4. Ouvrir le fichier : `supabase/migrations/20260126_create_contrats_table.sql`
5. **Copier TOUT** (Ctrl+A puis Ctrl+C)
6. **Coller** dans SQL Editor (Ctrl+V)
7. Cliquer sur **Run** (ou F5)
8. ✅ Message : "Success. No rows returned"

### ✅ 2. Ajouter la Route (2 min)

**Fichier : `App.tsx`**

Trouver les routes et ajouter :
```typescript
import Contrats from './pages/Contrats';

<Route path="/contrats" element={<Contrats />} />
```

### ✅ 3. Voir la Page (1 min)

Dans votre navigateur :
```
http://localhost:5173/contrats
```

Vous devriez voir :
- 📋 Titre "Gestion des Contrats"
- 4 cartes statistiques (à 0)
- Message "Aucun contrat trouvé"

---

## 🧪 CRÉER UN CONTRAT DE TEST

### Option 1 : Via SQL (RAPIDE - 3 min)

1. **Supabase** → **SQL Editor** → **New Query**
2. **Copier ce SQL** (en remplaçant les valeurs) :

```sql
-- D'abord, voir vos monteurs et chantiers
SELECT matricule, nom_monteur FROM monteurs LIMIT 5;
SELECT id_chantier, ref_chantier, nom_client FROM chantiers WHERE statut = 'actif' LIMIT 5;

-- Puis créer un contrat (REMPLACER les valeurs avec celles ci-dessus)
INSERT INTO contrats (
    matricule, nom_monteur, id_chantier, ref_chantier, nom_client,
    type_contrat, role_monteur, salaire_journalier, date_debut, statut
) VALUES (
    208,  -- ← Votre matricule
    'OMAR',  -- ← Votre nom_monteur
    'VOTRE-UUID-CHANTIER',  -- ← Votre id_chantier
    'C602',  -- ← Votre ref_chantier
    'STEEP',  -- ← Votre nom_client
    'CDI', 'OUVRIER', 120.00, CURRENT_DATE, 'actif'
);
```

3. **Run**
4. **Rafraîchir** `/contrats`
5. ✅ Vous voyez le contrat !

### Option 2 : Via Affectation (AUTOMATIQUE - 10 min)

**Fichier : Là où vous affectez les monteurs (ex: `Chantiers.tsx`)**

En haut :
```typescript
import { createContratAutomatique } from '../services/contratService';
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
```

Dans votre fonction d'affectation :
```typescript
// Après avoir créé l'affectation
await createContratAutomatique(monteur, chantier, user?.email);
```

Puis :
1. **Affecter un monteur** à un chantier
2. **Aller sur** `/contrats`
3. ✅ Le contrat apparaît automatiquement !

---

## 🎯 TESTS À FAIRE

| Test | Comment | Résultat Attendu |
|------|---------|------------------|
| **Voir la page** | Aller sur `/contrats` | Page s'affiche |
| **Créer contrat** | SQL ou affectation | Contrat visible dans tableau |
| **Recherche** | Taper nom monteur | Filtre les résultats |
| **Filtre statut** | Sélectionner "Actifs" | Montre seulement actifs |
| **Clôturer** | Bouton "Clôturer" | Contrat passe en "clos" |
| **Réaffectation** | Affecter même monteur ailleurs | Ancien clos, nouveau actif |

---

## 🐛 PROBLÈMES COURANTS

### "Table contrats does not exist"
➡️ **Solution** : Exécuter le SQL de l'étape 1

### Page `/contrats` ne marche pas
➡️ **Solution** : Ajouter la route dans `App.tsx`

### Contrat non créé automatiquement
➡️ **Solution** : Vérifier la console (F12) pour les erreurs

---

## 📁 FICHIERS IMPORTANTS

- **Migration SQL** : `supabase/migrations/20260126_create_contrats_table.sql`
- **Service** : `services/contratService.ts`
- **Page UI** : `pages/Contrats.tsx`
- **Guide complet** : `GUIDE_TEST_CONTRATS.md`
- **SQL de test** : `supabase/test_contrats.sql`

---

## ✅ VOUS AVEZ RÉUSSI SI...

- [ ] La page `/contrats` s'affiche
- [ ] Vous voyez au moins 1 contrat dans le tableau
- [ ] Les statistiques s'affichent correctement
- [ ] La recherche fonctionne
- [ ] Vous pouvez clôturer un contrat

---

**🎉 Besoin d'aide détaillée ?**
➡️ Lire `GUIDE_TEST_CONTRATS.md`

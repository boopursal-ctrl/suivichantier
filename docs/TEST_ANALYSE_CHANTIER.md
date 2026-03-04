# Guide de Test - Module Analyse de Chantier

## 🧪 Prérequis

1. **Migration SQL exécutée**: La migration `20260209_create_analyse_chantier.sql` doit être appliquée à Supabase
2. **Chantier terminé**: Au moins un chantier avec le statut "terminé" dans la base de données
3. **Monteurs affectés**: Le chantier doit avoir des monteurs affectés (pour les primes)

## 📝 Étapes de test

### 1. Appliquer la migration SQL

```bash
# Se connecter à Supabase et exécuter la migration
# Ou utiliser l'interface Supabase SQL Editor
```

Fichier: `supabase/migrations/20260209_create_analyse_chantier.sql`

### 2. Créer/Modifier un chantier pour le test

**Option A: Via l'interface**
1. Aller dans "Chantiers"
2. Sélectionner un chantier existant
3. Modifier son statut en "terminé"

**Option B: Via SQL**
```sql
UPDATE chantiers 
SET statut = 'terminé' 
WHERE id_chantier = 'VOTRE_ID_CHANTIER';
```

### 3. Accéder au module d'analyse

1. Ouvrir l'application: `http://localhost:5173` (ou votre port)
2. Se connecter
3. Aller dans "Chantiers"
4. Cliquer sur un chantier **terminé**
5. **Vérifier**: Le bouton "Générer Analyse" doit être visible dans l'en-tête

### 4. Tester la génération d'analyse

#### Cas 1: Analyse avec critères NON parfaits

1. Cliquer sur "Générer Analyse"
2. Observer les calculs automatiques:
   - Budget prévu vs réel
   - Durée prévue vs réelle
3. **NE PAS** cocher tous les documents
4. Ajouter une remarque (optionnel)
5. Cliquer sur "Générer l'Analyse"
6. **Résultat attendu**: 
   - ✅ Message de succès
   - ❌ Pas de badge "PARFAIT"
   - ❌ Pas de section primes

#### Cas 2: Analyse PARFAITE

1. Créer un chantier avec:
   - Budget réel proche du budget prévu (±5%)
   - Durée réelle proche de la durée prévue (±2 jours)
2. Générer l'analyse
3. **Cocher TOUS** les documents:
   - ✅ BL cacheté
   - ✅ BC cacheté
   - ✅ BR cacheté
4. Cliquer sur "Générer l'Analyse"
5. **Résultat attendu**:
   - ✅ Badge "PARFAIT" en vert
   - ✅ Section "Primes de Performance" visible
   - ✅ Message spécial dans l'alerte

### 5. Tester les primes

1. Dans la section "Primes de Performance":
2. **Chef de Chantier**:
   - Sélectionner un monteur dans la liste
   - Saisir un montant (ex: 5000 DH)
3. **Sous Chef de Chantier**:
   - Sélectionner un autre monteur
   - Saisir un montant (ex: 3000 DH)
4. Cliquer sur "Enregistrer les Primes"
5. **Résultat attendu**:
   - ✅ Message de succès
   - ✅ Primes affichées avec statut "en_attente"

### 6. Tester la validation (DG uniquement)

**Prérequis**: Être connecté avec un compte ADMIN

1. Observer les primes "en_attente"
2. Cliquer sur "Valider" pour une prime
3. **Résultat attendu**:
   - ✅ Statut passe à "Validée"
   - ✅ Badge vert "✅ Validée"

4. Cliquer sur "Refuser" pour une autre prime
5. Saisir un motif de refus
6. **Résultat attendu**:
   - ✅ Statut passe à "Refusée"
   - ✅ Badge rouge "❌ Refusée"

### 7. Tester la persistance

1. Retourner à la liste des chantiers
2. Revenir sur le chantier analysé
3. Cliquer sur "Générer Analyse"
4. **Résultat attendu**:
   - ✅ L'analyse précédente est affichée
   - ✅ Les primes sont toujours là
   - ✅ Les statuts sont conservés

## ✅ Checklist de validation

- [ ] Migration SQL appliquée sans erreur
- [ ] Bouton "Générer Analyse" visible uniquement pour chantiers terminés
- [ ] Calculs automatiques corrects (budget et durée)
- [ ] Checkboxes documents fonctionnelles
- [ ] Zone remarques fonctionnelle
- [ ] Génération d'analyse réussie
- [ ] Badge "PARFAIT" affiché si tous critères OK
- [ ] Section primes visible si PARFAIT
- [ ] Sélection des monteurs fonctionnelle
- [ ] Saisie des montants fonctionnelle
- [ ] Enregistrement des primes réussi
- [ ] Validation par DG fonctionnelle
- [ ] Refus par DG fonctionnel
- [ ] Persistance des données OK
- [ ] Retour à la page chantier fonctionnel

## 🐛 Problèmes courants

### Erreur: Table n'existe pas
**Solution**: Vérifier que la migration SQL a été appliquée

### Bouton "Générer Analyse" invisible
**Solution**: Vérifier que le statut du chantier est bien "terminé"

### Erreur lors de la génération
**Solution**: Vérifier la console du navigateur pour les détails

### Primes non enregistrées
**Solution**: Vérifier que l'analyse a le flag `tous_criteres_parfaits = true`

### Validation impossible
**Solution**: Vérifier que l'utilisateur a le rôle ADMIN

## 📊 Données de test recommandées

### Chantier "PARFAIT"
```javascript
{
  budget_prevu: 100000,
  budget_reel: 102000, // +2% (dans tolérance)
  duree_prevue: 30,
  duree_reelle: 31, // +1 jour (dans tolérance)
  bl_cachete: true,
  bc_cachete: true,
  br_cachete: true
}
```

### Chantier "NON PARFAIT"
```javascript
{
  budget_prevu: 100000,
  budget_reel: 115000, // +15% (hors tolérance)
  duree_prevue: 30,
  duree_reelle: 35, // +5 jours (hors tolérance)
  bl_cachete: false,
  bc_cachete: true,
  br_cachete: false
}
```

## 🎯 Scénarios de test avancés

### Scénario 1: Régénération d'analyse
1. Générer une analyse
2. Modifier les checkboxes
3. Régénérer
4. **Vérifier**: L'ancienne analyse est remplacée

### Scénario 2: Primes multiples
1. Définir des primes
2. Valider certaines, refuser d'autres
3. **Vérifier**: Les statuts sont indépendants

### Scénario 3: Utilisateur non-admin
1. Se connecter avec un compte non-ADMIN
2. Générer une analyse PARFAITE
3. Définir des primes
4. **Vérifier**: Pas de boutons Valider/Refuser

## 📞 Support

En cas de problème, vérifier:
1. Console du navigateur (F12)
2. Logs Supabase
3. Structure de la base de données
4. Permissions utilisateur

# Module Chef de Chantier - Documentation

## 📋 Vue d'ensemble

Le module **Chef de Chantier** est un espace dédié permettant aux chefs de chantier de saisir et valider les données terrain en temps réel. Il offre une vision fiable de l'avancement réel des chantiers.

## 🎯 Fonctionnalités Principales

### 1. **Sélection du Chantier**
- Liste des chantiers actifs assignés au chef connecté
- Filtrage automatique basé sur `chef_chantier` ou `responsable_chantier`
- Interface visuelle avec cartes interactives

### 2. **Rapport Journalier**
Le chef de chantier peut saisir quotidiennement :

#### Effectifs et Présences
- **Effectif Prévu** vs **Effectif Réel**
- **Heures Travaillées** totales
- **Pointage individuel** des monteurs :
  - Présent / Absent
  - Heures travaillées par monteur
  - Motif d'absence si applicable

#### Avancement
- **Avancement Prévu** (%)
- **Avancement Réel** (%)
- Comparaison automatique Prévu vs Réel

#### Conditions de Travail
- **Météo** : Beau, Pluie, Vent, Neige
- **Conditions** : Normales, Difficiles, Impossibles
- Impact sur la productivité

#### Observations
- **Observations Générales** : Notes, remarques
- **Problèmes Rencontrés** : Incidents, blocages, retards

### 3. **Validation des Données**
- Enregistrement sécurisé dans la base de données
- Horodatage automatique
- Traçabilité complète

## 🗄️ Structure de la Base de Données

### Table `rapports_chantier`
```sql
- id_rapport (UUID, PK)
- id_chantier (UUID, FK)
- date_rapport (DATE)
- chef_chantier (TEXT)
- effectif_prevu (INTEGER)
- effectif_reel (INTEGER)
- heures_travaillees (DECIMAL)
- avancement_prevu (DECIMAL)
- avancement_reel (DECIMAL)
- meteo (TEXT)
- conditions_travail (TEXT)
- observations (TEXT)
- problemes_rencontres (TEXT)
- valide (BOOLEAN)
- date_validation (TIMESTAMP)
```

### Table `presences_monteurs`
```sql
- id_presence (UUID, PK)
- id_rapport (UUID, FK)
- matricule (TEXT)
- nom_monteur (TEXT)
- present (BOOLEAN)
- heures_travaillees (DECIMAL)
- heures_supplementaires (DECIMAL)
- motif_absence (TEXT)
- commentaire (TEXT)
```

### Table `taches_chantier`
```sql
- id_tache (UUID, PK)
- id_chantier (UUID, FK)
- nom_tache (TEXT)
- description (TEXT)
- ordre_execution (INTEGER)
- date_debut_prevue (DATE)
- date_fin_prevue (DATE)
- date_debut_reelle (DATE)
- date_fin_reelle (DATE)
- pourcentage_prevu (DECIMAL)
- pourcentage_reel (DECIMAL)
- statut (TEXT)
```

### Table `photos_chantier`
```sql
- id_photo (UUID, PK)
- id_rapport (UUID, FK)
- id_chantier (UUID, FK)
- url_photo (TEXT)
- legende (TEXT)
- type_photo (TEXT)
- uploaded_by (TEXT)
- uploaded_at (TIMESTAMP)
```

## 🎨 Design Premium

### Interface Utilisateur
- **Sidebar** : Liste des chantiers actifs avec sélection visuelle
- **Header Chantier** : Informations clés (dates, durée, équipe)
- **Formulaire de Rapport** : Design moderne et intuitif
- **Pointage Monteurs** : Interface tactile avec boutons visuels
- **Conditions Météo** : Sélection par icônes

### Couleurs et Thèmes
- **Indigo/Blue** : Couleur principale du module
- **Emerald** : Présences confirmées
- **Amber** : Alertes et attentes
- **Red** : Problèmes et absences

## 🚀 Prochaines Étapes

### Phase 1 : Backend (À développer)
1. **Context Provider** pour les rapports
2. **API Supabase** :
   - `getRapportsChantier(id_chantier)`
   - `createRapport(rapport)`
   - `updateRapport(id_rapport, data)`
   - `getPresencesByRapport(id_rapport)`

### Phase 2 : Fonctionnalités Avancées
1. **Historique des Rapports**
   - Liste chronologique
   - Graphiques d'évolution
   - Export PDF

2. **Photos Terrain**
   - Upload d'images
   - Galerie par chantier
   - Annotations

3. **Tâches et Jalons**
   - Décomposition du chantier
   - Suivi par tâche
   - Gantt visuel

4. **Notifications**
   - Alertes sur écarts Prévu/Réel
   - Rappels de saisie quotidienne
   - Validation hiérarchique

### Phase 3 : Mobile
1. **Progressive Web App (PWA)**
2. **Mode Offline**
3. **Géolocalisation**
4. **Signature électronique**

## 📱 Accès au Module

### Navigation
- **Menu Principal** : "Chef de Chantier" (icône ClipboardCheck)
- **Route** : `/chef_chantier`
- **Permissions** : Accessible aux utilisateurs avec rôle approprié

### Workflow Typique
1. **Connexion** en tant que Chef de Chantier
2. **Sélection** du chantier actif
3. **Saisie** du rapport journalier
4. **Pointage** des monteurs présents
5. **Validation** et enregistrement
6. **Consultation** de l'historique

## 🔒 Sécurité

- **Authentification** requise
- **Autorisation** basée sur le rôle
- **Validation** des données côté serveur
- **Audit trail** complet
- **Contrainte** : Un seul rapport par chantier par jour

## 📊 Indicateurs Clés

Le module permet de suivre :
- **Taux de présence** réel vs prévu
- **Écart d'avancement** (Réel - Prévu)
- **Productivité** (heures travaillées / avancement)
- **Conditions météo** impactantes
- **Fréquence des problèmes**

## 💡 Avantages

### Pour le Chef de Chantier
- ✅ Interface simple et rapide
- ✅ Saisie mobile-friendly
- ✅ Validation en temps réel
- ✅ Historique accessible

### Pour la Direction
- ✅ Données terrain fiables
- ✅ Visibilité en temps réel
- ✅ Détection précoce des écarts
- ✅ Traçabilité complète

### Pour le Projet
- ✅ Suivi précis de l'avancement
- ✅ Gestion proactive des risques
- ✅ Optimisation des ressources
- ✅ Amélioration continue

---

**Date de création** : 28 décembre 2025  
**Version** : 1.0  
**Statut** : Interface créée, Backend à développer

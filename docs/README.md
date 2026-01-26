# 📚 Documentation - Système de Gestion des Chantiers

## 📋 Table des Matières

### Gestion Automatique des Contrats
- **[GESTION_CONTRATS.md](./GESTION_CONTRATS.md)** - Documentation complète du système
- **[RESUME_IMPLEMENTATION_CONTRATS.md](./RESUME_IMPLEMENTATION_CONTRATS.md)** - Résumé de l'implémentation et guide de déploiement

## 🎯 Fonctionnalités Documentées

### 1. Gestion Automatique des Contrats ✅
**Date d'implémentation** : 26/01/2026

Système complet de gestion automatique des contrats des monteurs par chantier.

**Fichiers créés** :
- `types.ts` (modifié) - Interface Contrat
- `supabase/migrations/20260126_create_contrats_table.sql` - Migration BDD
- `services/contratService.ts` - Service de gestion
- `pages/Contrats.tsx` - Interface utilisateur
- `examples/integrationContrats.tsx` - Exemples d'intégration

**Fonctionnalités** :
- ✅ Création automatique de contrat lors de l'affectation
- ✅ Clôture automatique du contrat précédent lors de réaffectation
- ✅ Contrainte : Un seul contrat actif par monteur
- ✅ Interface de gestion complète
- ✅ Historique et traçabilité

**Documentation** :
- [Guide complet](./GESTION_CONTRATS.md)
- [Résumé d'implémentation](./RESUME_IMPLEMENTATION_CONTRATS.md)

---

## 🚀 Démarrage Rapide

### Pour les Développeurs

1. **Lire la documentation** de la fonctionnalité concernée
2. **Exécuter les migrations** SQL si nécessaire
3. **Consulter les exemples** d'intégration
4. **Tester** en environnement de développement

### Pour les Utilisateurs

1. **Consulter le guide utilisateur** de chaque fonctionnalité
2. **Suivre les workflows** décrits
3. **Utiliser les interfaces** fournies

---

## 📝 Convention de Documentation

Chaque fonctionnalité majeure doit avoir :

1. **Documentation complète** (`FONCTIONNALITE.md`)
   - Objectif
   - Règles fonctionnelles
   - Structure technique
   - Guide d'utilisation
   - Exemples

2. **Résumé d'implémentation** (`RESUME_IMPLEMENTATION_FONCTIONNALITE.md`)
   - Fichiers créés/modifiés
   - Workflow visuel
   - Checklist de déploiement
   - Prochaines étapes

3. **Exemples de code** (dans `examples/`)
   - Cas d'usage concrets
   - Composants React
   - Hooks personnalisés
   - Intégrations

---

## 🔄 Mises à Jour

### Version 1.0 - 26/01/2026
- ✅ Gestion automatique des contrats

---

## 📞 Support

Pour toute question ou problème :
1. Consulter la documentation appropriée
2. Vérifier les exemples de code
3. Consulter les logs de l'application
4. Contacter l'équipe de développement

---

**Dernière mise à jour** : 26/01/2026

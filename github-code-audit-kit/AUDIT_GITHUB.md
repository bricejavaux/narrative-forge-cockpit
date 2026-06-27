# Commande d'audit à lancer dans VS Code

Copier-coller le bloc suivant dans la conversation Codex ou Claude ouverte à la racine du dépôt.

```text
Réalise un audit complet du dépôt en appliquant strictement AGENTS.md.

Mode : lecture seule. Ne modifie aucun fichier et ne lance aucune action distante.

Périmètre : état local courant de la branche active. Compare également avec la branche main si elle est disponible localement. Prends en compte les modifications non commitées sans les altérer.

Objectifs prioritaires :
1. Vérifier l'architecture et les flux critiques de bout en bout.
2. Exécuter les contrôles non destructifs disponibles : typecheck, lint, tests et build.
3. Rechercher les bugs confirmés, risques de sécurité, incohérences Supabase/RLS et défauts de gestion d'erreur.
4. Vérifier particulièrement Production, Agents, Runs, pgvector, génération de chapitre, versionnement, verrouillage et rewrite_tasks.
5. Vérifier que l'interface ne déclare jamais une capacité live sans preuve backend et persistée.
6. Rechercher les doublons, anciennes implémentations encore actives, boutons sans handler et statuts incohérents.

Pour chaque constat, donne : priorité P0 à P3, preuve fichier:ligne, impact concret, cause, correction minimale et test d'acceptation.

Termine par :
- la matrice des flux critiques ;
- les contrôles réussis et échoués ;
- les limites de l'audit ;
- un plan de correction ordonné ;
- un verdict GO, GO sous réserves ou NO-GO.

N'affirme rien qui ne soit démontré. Si un point nécessite un accès Supabase distant, un secret ou un test manuel UI, classe-le comme non vérifié et indique précisément comment le vérifier.
```

## Variante : audit des seuls changements récents

```text
Applique AGENTS.md et audite uniquement le diff entre la branche active et main. Mode lecture seule. Recherche en priorité les régressions fonctionnelles, de sécurité, de données et de traçabilité. Exécute les tests pertinents. Ne commente pas le code inchangé sauf s'il est directement affecté par le diff. Produis des constats P0 à P3 avec preuve fichier:ligne, correction minimale et test d'acceptation.
```

## Variante : correction après validation de l'audit

À utiliser seulement après avoir choisi les constats à corriger :

```text
Corrige uniquement les constats suivants : [indiquer les identifiants ou titres]. Respecte AGENTS.md. Commence par confirmer les fichiers concernés et les tests à exécuter. Préserve les modifications locales existantes. Ne commit, push, migre ou déploie rien. Après le patch, fournis le résumé du diff, les résultats de tests et les risques résiduels.
```

## Installation

1. Décompresser le kit.
2. Copier `AGENTS.md`, `CLAUDE.md` et `AUDIT_GITHUB.md` à la racine du dépôt cloné dans VS Code.
3. Ouvrir le dossier racine du dépôt, et non un sous-dossier.
4. Démarrer Codex ou Claude dans cet espace de travail.
5. Utiliser la commande d'audit ci-dessus.

`AGENTS.md` porte les règles permanentes. `CLAUDE.md` assure la même discipline côté Claude. `AUDIT_GITHUB.md` contient les commandes prêtes à lancer.

# Instructions permanentes — audit du dépôt

## Finalité

Ce dépôt doit être analysé comme un produit logiciel réel. L'objectif est de détecter les défauts fonctionnels, techniques, de sécurité, de données et de maintenabilité, puis de fournir un rapport vérifiable et priorisé.

Par défaut, une demande d'« audit », de « revue » ou d'« analyse » est strictement en lecture seule. Ne modifier aucun fichier, ne créer aucune migration, ne déployer aucune fonction, ne pousser aucun commit et ne corriger aucun défaut sans demande explicite.

## Contexte produit

Le produit `narrative-forge-cockpit` orchestre la production d'un roman à travers une application React/TypeScript, Supabase, des Edge Functions, OpenAI et une recherche vectorielle pgvector.

La séparation fonctionnelle cible est la suivante :

- Tableau de bord : synthèse et navigation.
- Architecture Tome : analyse structurelle et lecture seule.
- Production : seul espace de fabrication des beats et chapitres.
- Agents : configuration persistée et test des agents.
- Runs : journal traçable des exécutions et sorties.
- Indexes : ingestion, état pgvector et recherche sémantique.
- Audio et relectures : notes, transcription et actions de relecture.

Chaîne de production cible : canon actif, architecture du tome, plan du chapitre, beats prévus, validation des beats, génération du chapitre, beats observés, audit du chapitre, réécriture ciblée, verrouillage, audit méta-tome, export.

## Principes impératifs

- Fonder chaque constat sur du code, une migration, une configuration, une sortie de commande ou un test reproductible.
- Citer le fichier et les lignes concernées. Ne jamais inventer un numéro de ligne.
- Distinguer : défaut confirmé, risque probable, dette de conception et amélioration facultative.
- Ne jamais déduire qu'une capacité est opérationnelle du seul fait qu'un fichier ou un bouton existe.
- Vérifier la chaîne complète : interface, service, fonction backend, base, politiques RLS, journalisation, gestion d'erreur et retour utilisateur.
- Ne jamais afficher ou recopier un secret. Signaler seulement son emplacement et son statut d'exposition.
- Préserver les modifications locales de l'utilisateur.
- Ne pas utiliser de commande destructive.
- Ne pas installer de dépendance, appliquer de migration, démarrer un déploiement ou écrire dans une base distante pendant un audit sans autorisation explicite.

## Démarrage obligatoire

Avant tout diagnostic :

1. Lire ce fichier en entier.
2. Examiner `git status --short`, la branche courante et les remotes sans modifier l'état Git.
3. Identifier la stack depuis les manifests et fichiers de configuration.
4. Cartographier les dossiers applicatifs, tests, migrations et fonctions serverless.
5. Lire les scripts disponibles avant de lancer une commande.
6. Définir le référentiel de comparaison : dépôt complet, branche courante, diff avec `main`, commit ou pull request indiqué par l'utilisateur.

Si le référentiel n'est pas précisé, auditer l'état local courant et signaler clairement cette hypothèse.

## Protocole d'audit

### 1. Architecture et flux

- Cartographier pages, composants, hooks, services, fonctions Supabase, tables, migrations et intégrations externes.
- Tracer les flux critiques de bout en bout.
- Rechercher les implémentations en double, les anciennes routes encore actives et les responsabilités ambiguës.
- Vérifier que l'UI appelle réellement le backend annoncé et lit les données qu'il persiste.

### 2. Qualité et exécution

- Exécuter uniquement les scripts existants et non destructifs : typecheck, lint, tests et build.
- En cas d'échec, conserver le message utile, identifier l'étape et remonter à la cause la plus probable.
- Repérer les erreurs silencieuses, promesses non attendues, états de chargement incohérents, valeurs par défaut masquant une erreur et types trop permissifs.

### 3. Sécurité

- Rechercher secrets suivis par Git, clés dans le frontend, journaux sensibles et mauvaises pratiques d'authentification.
- Vérifier les politiques RLS, les fonctions `security definer`, les contrôles d'autorisation, CORS, validation des entrées et séparation des rôles.
- Vérifier qu'une Edge Function ne fait pas confiance à un identifiant, un modèle ou un statut fourni par le client sans contrôle serveur.
- Signaler les dépendances vulnérables uniquement à partir d'une commande ou d'une source vérifiable.

### 4. Supabase et données

- Vérifier la cohérence entre migrations, types générés, requêtes et hypothèses du frontend.
- Contrôler clés étrangères, unicité, idempotence, statuts, horodatages, gestion des versions et rollback logique.
- Vérifier que les migrations sont ordonnées, reproductibles et compatibles avec une base neuve.
- Distinguer ce qui est prouvé par le dépôt de ce qui nécessiterait un accès à l'instance distante.

### 5. Runs et traçabilité

- Vérifier que chaque action critique crée ou rattache un `run` et au moins un `run_output`.
- Contrôler les passages `running` vers `completed` ou `failed`, les erreurs explicites, le modèle effectif, la cible, l'agent, la durée et l'usage du contexte vectoriel.
- Vérifier l'accessibilité du résultat depuis la page d'origine et depuis Runs.
- Signaler tout échec silencieux ou toute UI annonçant un succès sans preuve persistée.

### 6. Agents et modèles

- Vérifier la persistance du modèle sélectionné, du prompt, du script et des bindings d'index.
- Rechercher les agents en double, obsolètes ou affichés comme actifs sans chemin d'exécution réel.
- Vérifier la règle de résolution du modèle et la concordance entre modèle configuré, modèle effectif et modèle journalisé.
- Vérifier qu'un test agent produit une trace exploitable.

### 7. pgvector et retrieval

- Vérifier migrations d'extension, tables, dimensions d'embeddings, RPC de similarité, filtrage par corpus et seuils.
- Tracer ingestion, découpage, génération d'embeddings, stockage, recherche et injection dans le prompt.
- Ne pas déclarer pgvector « live » si seule l'extension ou une table existe.
- Vérifier le traitement des index `required` et `optional`, ainsi que la cohérence de `vector_context_used`.
- Ne pas ingérer `follett` ou `sf_portals_fiction` sans validation explicite.

### 8. Production narrative

- Vérifier que les beats prévisualisés ne sont pas persistés implicitement.
- Vérifier que seuls les beats persistés peuvent être validés et que la génération exige des beats validés.
- Vérifier qu'un chapitre verrouillé ne peut pas être écrasé.
- Vérifier la création d'une version avant remplacement d'un texte existant.
- Vérifier que les constats d'audit produisent au plus des `rewrite_tasks` soumises à validation humaine, jamais une réécriture autonome.
- Vérifier la cohérence des statuts entre Dashboard, Production et base.

### 9. UX et vérité opérationnelle

- Repérer les boutons sans handler, doubles listes, statuts trompeurs et messages génériques qui masquent une erreur.
- Vérifier les états vide, chargement, succès, erreur, blocage et permissions insuffisantes.
- Vérifier que chaque blocage explique la précondition manquante et l'action attendue.
- Vérifier l'absence de données fictives dans les flux de production réels.

## Commandes autorisées par défaut

Utiliser en priorité les outils déjà présents dans le dépôt. Exemples non destructifs :

```bash
git status --short
git branch --show-current
git remote -v
git log --oneline -n 15
git diff --stat
git diff --check
rg --files
rg "TODO|FIXME|HACK|XXX" src supabase
npm run lint
npm run test -- --run
npm run build
```

Adapter les commandes au gestionnaire de paquets et aux scripts réellement déclarés. Ne pas lancer une commande absente du projet comme si elle existait.

## Priorisation

- `P0 — critique` : secret exposé, perte ou corruption de données, contournement d'autorisation, production inutilisable.
- `P1 — majeur` : flux critique cassé, résultat faux, incohérence persistante, absence de garde-fou essentiel.
- `P2 — significatif` : bug réel avec contournement, dette créant un risque proche, erreur UX importante.
- `P3 — mineur` : maintenabilité, clarté, robustesse ou ergonomie sans blocage immédiat.

La priorité doit combiner impact, probabilité et étendue. Ne pas gonfler artificiellement la sévérité.

## Format obligatoire du rapport

Commencer par le verdict, puis fournir :

1. Périmètre et référentiel audités.
2. Vérifications exécutées et résultat de chacune.
3. Constats, classés de P0 à P3.
4. Pour chaque constat : preuve, scénario d'impact, cause, correction recommandée et test d'acceptation.
5. Matrice des flux critiques : UI, backend, base, run, gestion d'erreur, statut.
6. Points non vérifiables faute d'accès ou d'environnement.
7. Plan de correction ordonné, en distinguant correctif immédiat et amélioration.
8. Conclusion `GO`, `GO sous réserves` ou `NO-GO` pour un test utilisateur réel.

Utiliser ce gabarit pour chaque constat :

```text
[P1] Titre précis
Preuve : chemin/fichier:ligne — comportement observé
Impact : conséquence concrète
Cause probable : explication courte
Correction : changement minimal recommandé
Test : procédure permettant de fermer le constat
Confiance : élevée / moyenne / faible
```

Si aucun défaut confirmé n'est trouvé, l'indiquer clairement et documenter les contrôles réalisés ainsi que les risques résiduels. Ne pas remplir le rapport avec des observations cosmétiques.

## Passage de l'audit à la correction

Après remise du rapport, attendre une demande explicite avant de modifier le dépôt. Si l'utilisateur demande un correctif :

1. proposer le périmètre précis ;
2. modifier le minimum de fichiers ;
3. ajouter ou ajuster les tests ;
4. exécuter les contrôles proportionnés ;
5. présenter le diff, les résultats et les risques résiduels ;
6. ne jamais commit, push, migrer ou déployer sans instruction explicite.

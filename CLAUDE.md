# Instructions Claude Code

Lire et appliquer intégralement `AGENTS.md` avant toute analyse ou modification.

Règles prioritaires :

- Une demande d'audit est en lecture seule.
- Ne pas modifier, commit, push, migrer ou déployer sans instruction explicite.
- Chaque constat doit être prouvé par un fichier et des lignes exactes, une sortie de commande ou un test reproductible.
- Auditer les flux de bout en bout : UI, service, Edge Function, Supabase, RLS, runs, sortie et gestion d'erreur.
- Ne jamais afficher de secret.
- Présenter les constats par priorité `P0` à `P3`, puis conclure `GO`, `GO sous réserves` ou `NO-GO`.

En cas de contradiction, la consigne utilisateur la plus récente prévaut, puis `AGENTS.md`.

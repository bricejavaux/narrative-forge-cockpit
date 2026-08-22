# NOTES — outil de transfert

Ce que l'on a appris en construisant cet outil, séparé du README qui dit
seulement comment s'en servir.

---

## 1. La fenêtre Tkinter ne s'affichait pas — cause non reproduite

**Ce qui a été demandé** : isoler la ligne de `packgui.py` qui empêche
l'affichage, en réduisant progressivement le vrai code jusqu'au test minimal
qui, lui, fonctionnait.

**Ce qui a été trouvé** : je n'ai pas pu reproduire la panne. Sondé sur cette
machine, en instrumentant `mainloop` pour relever `winfo_ismapped` et
`winfo_viewable` toutes les secondes :

| version | fenêtre affichée |
|---|---|
| avant correction | mappée et visible, 720×640, pendant 8 s |
| après correction | idem |

Les deux atteignent `mainloop()` et affichent une fenêtre.

**L'explication la plus probable** est environnementale et non logicielle :
`python3-tk` **n'était pas installé** au début de la session où l'outil a été
écrit — vérifié alors, `ModuleNotFoundError`. Il l'est maintenant, installé
entre-temps pour le test minimal. Sans lui, `packgui.py` sortait sur un
message d'erreur en `stderr` ; si `stderr` n'était pas visible, cela
ressemblait exactement à « un processus qui ne fait rien ».

Cela reste une hypothèse : je n'ai pas de trace de la tentative qui a échoué.

## 2. Un vrai défaut trouvé au passage, et corrigé

L'inspection a révélé une faute réelle, indépendamment du symptôme :
**quatre appels `self.after(...)` s'exécutaient depuis des fils de travail**.
Tkinter n'est pas sûr vis-à-vis des fils ; attaquer l'interpréteur Tcl depuis
un autre fil que le principal peut le bloquer ou le faire tomber, de façon
intermittente et difficile à reproduire — exactement le genre de défaut qui
ne se manifeste qu'une fois sur dix.

Pire : `refresh_inventory()` était appelé **depuis `__init__`, donc avant
`mainloop()`**, et lançait un fil qui ouvrait une connexion SSH puis appelait
`self.after(...)` sur un interpréteur dont la boucle n'avait pas démarré.

Corrigé :

- les fils ne touchent plus aucun widget ; ils déposent soit un message, soit
  un appelable dans une file que la boucle Tk vide côté fil principal ;
- le premier inventaire est programmé par `after(400, ...)`, donc exécuté une
  fois la fenêtre affichée, au lieu de partir pendant la construction ;
- la construction est enveloppée d'un `try/except` qui imprime la trace : une
  exception au démarrage laissait autrement un processus vivant et muet.

## 3. Diagnostiquer un démarrage silencieux

```sh
LUNY_GUI_TRACE=1 python3 -u packgui.py 2>&1 | tee /tmp/packgui-debug.log
```

Chaque étape de construction est annoncée sur `stderr`. Une sortie qui
s'arrête avant `entree dans mainloop` situe le blocage ; une sortie complète
suivie de rien signifie que la fenêtre est créée et que le problème est
ailleurs — serveur d'affichage, fenêtre hors écran, ou placement par le
gestionnaire de fenêtres.

## 4. Prérequis réellement nécessaires

`python3-tk` **n'est pas** livré avec Python sur Debian et Ubuntu, malgré son
statut de bibliothèque standard. C'est la principale fausse évidence de cet
outil.

`ffmpeg` reste absent de cette machine à ce jour : les conversions
`.ogg → .mp3` et `.bmp → .png` n'ont donc jamais été exécutées pour de vrai,
seulement leur chemin d'échec. Voir le README.

# Bibliothèque Luny — application Windows autoportante

Un `.exe` unique, posé où l'on veut, sans rien à installer. Deux volets côte à
côte — les packs du poste, les packs du 3GS — et un seul bouton pour exécuter
la différence.

L'outil WSL (`packcli.py`, `packgui.py`) continue de fonctionner à
l'identique : les deux s'appuient sur le même `packcore`. Voir
[README.md](README.md) pour celui-là.

---

## Ce qui a été validé, et ce qui ne l'a pas été

Cette application a été **écrite sous Linux/WSL**, où l'on ne peut ni
construire ni essayer un exécutable Windows. La séparation est nette, et il
vaut mieux la connaître avant de faire confiance à quoi que ce soit ici.

| | état |
|---|---|
| logique de balayage, correspondance, diff, récapitulatif | **65 tests automatiques**, tous verts |
| protocole SCP historique | **vérifié à l'octet près** contre un faux canal |
| conversion `.ogg → .mp3` et `.bmp → .png` | **réellement exécutée**, résultat vérifié par `ffprobe` |
| `packcore` inchangé côté WSL | **non-régression vérifiée** contre le vrai 3GS |
| montage de la fenêtre et câblage complet | **vérifié** sous WSLg, avec un faux appareil |
| **rendu visuel sous Windows** | **non vérifié** — polices, métriques et thème diffèrent |
| **paramiko contre ce serveur SSH** | **non vérifié** — paramiko n'est pas installable ici |
| **l'exécutable empaqueté** | **non vérifié** — PyInstaller doit tourner sur Windows |

Le détail des trois derniers points est dans [NOTES.md](NOTES.md).

---

## Construire l'exécutable

Depuis PowerShell, avec le Python Windows natif :

```powershell
$py = "C:\Users\javau\AppData\Local\Python\pythoncore-3.14-64\python.exe"

& $py -m pip install pyinstaller paramiko pillow

& $py -m PyInstaller --onefile --windowed `
    --add-binary "ffmpeg.exe;." `
    --add-data "luny_background_source_portrait.png;." `
    packgui_win.py
```

L'exécutable apparaît dans `dist\packgui_win.exe`.

`--add-data` embarque l'illustration ; sans elle l'application démarre quand
même, simplement sans le filigrane de l'en-tête. Copier au préalable
`../../ios/LunyUI/Resources/luny_background_source_portrait.png` à côté du
script, ou ajuster le chemin.

Les modules `packcore`, `packlibrary`, `packconfig` et `packtransport` sont
trouvés seuls : ils sont importés par leur nom depuis le même répertoire.

### Vérifier avant d'empaqueter

```powershell
& $py -m unittest discover -s tests -p "test_*.py"
& $py packgui_win.py
```

Lancer le script avant de l'empaqueter fait gagner du temps : une erreur
d'import se voit immédiatement, alors qu'elle se manifeste dans l'exécutable
par une fenêtre qui ne s'ouvre pas et aucun message.

---

## ffmpeg — source et version

**Ce binaire n'est pas dans le dépôt, et n'a pas pu être téléchargé depuis
l'environnement de développement.** Ce qui suit est donc une consigne
d'approvisionnement, pas le relevé d'un fichier vérifié.

Source recommandée :

> **gyan.dev** — <https://www.gyan.dev/ffmpeg/builds/>
> archive `ffmpeg-release-essentials.zip`, build statique win64.
> `bin\ffmpeg.exe` est le seul fichier nécessaire.

Statique, donc aucune DLL à côté — c'est la raison du choix, un build partagé
ferait échouer l'exécutable sur une machine sans les runtimes.

**L'exigence réelle n'est pas une version, c'est un encodeur.** La conversion
audio appelle `-codec:a libmp3lame` : un build sans `libmp3lame` échouera sur
chaque `.ogg`. Les builds « essentials » de gyan.dev l'incluent. À vérifier
une fois pour toutes :

```powershell
.\ffmpeg.exe -hide_banner -encoders | Select-String libmp3lame
```

Puis relever la version exacte réellement embarquée, et la reporter ici :

```powershell
.\ffmpeg.exe -version | Select-Object -First 1
```

> Version embarquée : _à compléter après téléchargement._

Sans `ffmpeg.exe` à côté de l'application, rien ne casse : les `.ogg` et
`.bmp` sont copiés tels quels et signalés dans le journal, et l'application le
dit au démarrage. Le pack reste jouable, simplement muet pour ces pistes.

---

## Réglages

Mémorisés dans `luny-transfer.json`, **à côté de l'exécutable** — jamais dans
`~/.ssh` ni dans le profil utilisateur, qui n'auraient aucun sens pour un
outil qu'on déplace avec sa clé USB.

| réglage | rôle |
|---|---|
| `host` | adresse du 3GS, `192.168.1.98` par défaut |
| `user` | `root` |
| `key_path` | fichier de clé privée. **Renseigné → paramiko**, vide → ssh du système |
| `target` | `documents` (défaut) ou `bundle` |
| `last_local_dir` | dernier dossier de packs choisi |

Le choix du transport suit `key_path`, et l'application l'annonce dans son
journal au démarrage : il n'y a pas de repli silencieux.

Formats de clé acceptés : RSA, Ed25519, ECDSA, DSA. Une clé protégée par mot
de passe est refusée avec un message explicite plutôt qu'une erreur
d'authentification obscure.

---

## Ce que fait la fenêtre

### Volet gauche — bibliothèque locale

« Choisir un dossier » balaie un répertoire : chaque sous-dossier et chaque
`.zip` contenant un `story.json` lisible devient une ligne, avec sa vignette
de couverture, son titre, son nombre de nœuds, et **« conversion nécessaire »
ou « prêt tel quel »**.

Les entrées invalides sont affichées avec leur raison, pas filtrées : un
dossier qu'on croyait être un pack et qui n'en est pas doit se voir.

### Volet droit — bibliothèque de l'appareil

Inventaire distant au chargement. Vignette si le pack a été envoyé depuis cet
outil (cache local), initiale du titre sinon — l'appareil ne renvoie jamais
d'image. Les packs livrés avec l'application sont marqués **non supprimables**
et leur case est désactivée.

### La règle de correspondance

Les deux volets se comparent par le **nom de dossier que le pack occupera sur
l'appareil**, jamais par le titre : l'appareil ne connaît que le premier.

| entrée locale | nom retenu |
|---|---|
| dossier | son nom |
| ZIP avec `story.json` à la racine | le nom de l'archive |
| ZIP avec `PACK/story.json` | `PACK` |

C'est exactement ce que fait `packcore.extract_zip` lors d'un vrai transfert.
Comparaison **insensible à la casse** : le système de fichiers de cet iOS l'est
aussi, et `MonPack` y écraserait `monpack` sans le dire.

Deux entrées locales qui donnent le même nom sont signalées **« nom ambigu »**
et aucune n'est présélectionnée.

### Présélection

| cas | proposé |
|---|---|
| ici seulement | **pré-coché** à l'ajout |
| des deux côtés | affiché des deux côtés, **aucune présélection** — réenvoyer est un écrasement |
| appareil seulement | supprimable à droite, **jamais pré-coché** |

La présélection est **recalculée** à chaque rafraîchissement ; seuls les clics
explicites sont conservés. Sans cela, un pack coché pendant que l'inventaire
distant chargeait encore restait coché une fois découvert présent sur
l'appareil — donc présélectionné pour un écrasement que personne n'avait
demandé.

### Exécution

Un seul bouton, un seul récapitulatif : nombre d'envois, dont combien avec
conversion, nombre de suppressions. Les suppressions sont **nommées une par
une** dans la confirmation — jamais cachées derrière un chiffre. Les packs
protégés par le bundle sont listés à part comme ignorés.

Le transfert tourne en tâche de fond : barre de progression globale, ligne
d'état par pack (« conversion », « transfert », « OK »), et un journal où les
packs convertis apparaissent en ambre, ceux passés tels quels en vert, les
échecs en rose.

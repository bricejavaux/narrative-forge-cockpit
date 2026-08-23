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
| logique de balayage, correspondance, diff, récapitulatif | **93 tests automatiques**, tous verts |
| protocole SCP historique | **vérifié à l'octet près** contre un faux canal |
| conversion `.ogg → .mp3` et `.bmp → .png` | **réellement exécutée**, résultat vérifié par `ffprobe` |
| `packcore` inchangé côté WSL | **non-régression vérifiée** contre le vrai 3GS |
| montage de la fenêtre et câblage complet | **vérifié** sous WSLg, avec un faux appareil |
| négociation SSH **sans** `~/.ssh/config` | **vérifiée contre le vrai 3GS** — voir ci-dessous |
| contraste du titre sur le filigrane | **mesuré** sur la source décodée |
| **rendu visuel sous Windows** | **non vérifié** — polices, métriques et thème diffèrent |
| **paramiko contre ce serveur SSH** | **non vérifié** — paramiko n'est pas installable ici |
| **l'exécutable empaqueté** | **non vérifié** — PyInstaller doit tourner sur Windows |

Le détail des trois derniers points est dans [NOTES.md](NOTES.md).

---

## Le mur d'algorithme de l'appareil

Premier essai réel depuis Windows, connexion refusée :

```
Unable to negotiate with 192.168.1.98 port 22:
no matching host key type found. Their offer: ssh-rsa,ssh-dss
```

Ce message est celui du **client OpenSSH**, pas de paramiko. L'appareil
n'offre que `ssh-rsa` et `ssh-dss` comme clés d'hôte, toutes deux sur SHA-1 et
refusées par défaut depuis OpenSSH 8.8. Sous WSL, `~/.ssh/config` compensait
avec `HostKeyAlgorithms=+ssh-rsa` ; sous Windows ce fichier n'existe pas.

Le réglage est désormais **porté par le code**, des deux côtés :

| transport | comment |
|---|---|
| système (`ssh`/`scp`) | `-o HostKeyAlgorithms=+ssh-rsa,ssh-dss`, `-o PubkeyAcceptedKeyTypes=+ssh-rsa`, plus `-i <clé>` et un `UserKnownHostsFile` neutre |
| paramiko | `paramiko.Transport` employé directement, `get_security_options().key_types` complété |

`+` **ajoute** aux valeurs par défaut au lieu de les remplacer : un hôte
moderne continue de négocier ce qu'il a de mieux, et seul un hôte qui n'a rien
d'autre retombe sur `ssh-rsa`.

Relevé sur l'appareil, le reste de la négociation passe sans rien forcer — un
seul mur, pas plusieurs :

```
KEX      curve25519-sha256@libssh.org, ecdh-sha2-nistp256/384/521,
         diffie-hellman-group-exchange-sha256, group14-sha1
chiffr.  aes128/192/256-ctr, chacha20-poly1305@openssh.com
MAC      umac, hmac-sha2-256/512, hmac-sha1
```

**Vérifié contre le vrai 3GS**, en pointant `HOME` sur un répertoire vide pour
reproduire l'absence de `~/.ssh/config` : la connexion aboutit et l'inventaire
complet des sept packs revient.

### Le second mur : la signature d'authentification

Distinct du premier, et facile à confondre avec lui : il se manifeste par un
banal **« Permission denied »**, donc comme une mauvaise clé — alors que la
même clé passe en ligne de commande.

L'appareil tourne sous **OpenSSH 6.7**. Or les signatures RSA-SHA2
(`rsa-sha2-256/512`) et l'extension `server-sig-algs`, par laquelle un serveur
annonce les signatures qu'il accepte, datent toutes deux d'**OpenSSH 7.2**.

Ce serveur n'accepte donc que des signatures `ssh-rsa` (SHA-1) pour une clé
RSA, et n'a aucun moyen de le dire. paramiko, depuis la 2.9, propose
`rsa-sha2-512` en premier et se fait refuser. OpenSSH en ligne de commande,
lui, retombe seul sur `ssh-rsa` — d'où l'asymétrie observée.

L'outil tente donc l'authentification normalement, puis recommence en
interdisant les signatures RSA-SHA2. Dans cet ordre : un hôte moderne
continue d'obtenir une signature moderne et ne paie jamais la seconde
tentative. Le journal indique laquelle a abouti.

### Trois pannes, trois messages

L'ancien diagnostic concluait toujours « réveiller l'écran et réessayer ».
Devant un refus d'algorithme, ce conseil envoyait chercher une panne
inexistante et laissait croire qu'une nouvelle tentative pouvait aboutir.

| genre | message |
|---|---|
| `negociation` | aucun algorithme commun ; **réessayer n'y changera rien** |
| `authentification` | clé refusée ; vérifier `authorized_keys` sur l'appareil |
| `reseau` | l'appareil ne répond pas — **le seul cas** où réveiller l'écran aide |

Les deux premiers ont été provoqués contre le vrai réseau pour vérifier que
chacun rend bien son propre message.

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
| `key_path` | fichier de clé privée, transmis aux **deux** transports |
| `transport` | `auto` (défaut), `paramiko` ou `systeme` |
| `target` | `documents` (défaut) ou `bundle` |
| `last_local_dir` | dernier dossier de packs choisi |

`auto` prend paramiko dès qu'une clé est renseignée et que le module est
présent. Les deux autres imposent un transport — utile parce que les deux ne
rencontrent pas les mêmes murs sur ce serveur ancien : rester bloqué sur l'un
ne doit pas obliger à reconstruire l'exécutable pour essayer l'autre. Un
`paramiko` demandé mais absent retombe sur le transport système, annoncé dans
le journal.

**Le journal de démarrage écrit la commande exacte**, recopiable telle quelle
dans un terminal :

```
transport : ssh/scp du systeme vers root@192.168.1.98
  ssh -F /dev/null -o ConnectTimeout=10 -o BatchMode=yes
      -o HostKeyAlgorithms=+ssh-rsa,ssh-dss -o PubkeyAcceptedKeyTypes=+ssh-rsa
      -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
      -i <clé> -o IdentitiesOnly=yes root@192.168.1.98 '<commande>'
```

Sur le transport paramiko, le journal donne à la place la version du module,
celle du serveur, le type de clé d'hôte négocié et la signature retenue. Le
prochain diagnostic n'exige donc plus de reconstruire la commande à la main.

`-F` n'est posé **que** si une clé est renseignée : sans clé, l'outil dépend
encore de `~/.ssh/config` pour savoir laquelle employer, et c'est ainsi que
`packcli` fonctionne sous WSL.

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

Inventaire distant au chargement. Le bandeau supérieur porte l'illustration
fusée/lune en filigrane à **15 %**, opacité choisie par mesure et non à l'œil :
la source a été décodée et le contraste du texte posé dessus calculé sur le
pixel le plus clair du bandeau.

| opacité | titre `#E7ECFA` | sous-titre `#94A0C6` |
|---|---|---|
| 0,10 | 13,03:1 | 5,94:1 |
| **0,15** | **11,42:1** | **5,20:1** |
| 0,20 | 9,83:1 | 4,48:1 — échoue AA |
| 0,35 | 6,19:1 | 2,82:1 |

0,15 est le plafond, et c'est le **sous-titre** qui fixe la limite : le titre
reste confortable bien au-delà et ne dit donc rien d'utile. Reste à confirmer
à l'œil sous Windows que le filigrane se devine — le contraste garantit la
lisibilité, pas l'effet recherché.

 Vignette si le pack a été envoyé depuis cet
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

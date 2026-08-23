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

`ffmpeg` **a depuis été installé**, et les conversions `.ogg → .mp3` et
`.bmp → .png` ont enfin été exécutées pour de vrai — le résultat audio est
confirmé `mp3` par `ffprobe`. Elles sont couvertes par
`tests/test_packcore.py`, chemin d'échec compris. Ce point, longtemps ouvert,
est clos.

`python3-pil` manque toujours : la conversion `.bmp` passe donc par ffmpeg et
non par Pillow, ce qui est le repli prévu, et se trouve donc être le chemin
réellement éprouvé.

---

## 5. Application Windows — ce que cet environnement ne peut pas voir

Même discipline que pour l'app iOS : séparer ce qui est **mesuré** de ce qui
est seulement **écrit**.

### 5.1 La limite, d'abord

L'accès de développement est Linux/WSL. On n'y construit pas un `.exe`
Windows : PyInstaller produit un binaire pour la plateforme sur laquelle il
tourne. La construction et l'essai réel sont donc à la charge de
l'utilisateur, avec son Python Windows natif.

Pire, et découvert en cours de route : **cette machine n'a pas `pip`**.

```
$ python3 -m pip --version
/usr/bin/python3: No module named pip
```

Ni `paramiko`, ni `Pillow`, et aucun moyen de les installer. Ce n'est pas un
détail d'intendance : cela a **décidé de la conception**.

### 5.2 Ce que la limite a imposé au code

**Le protocole SCP est écrit contre une interface de canal, pas contre
paramiko.** `scp_send_directory` n'a besoin que de `send(bytes) -> int` et
`recv(n) -> bytes`. paramiko n'apparaît que pour ouvrir ce canal.

La conséquence est que le morceau le plus risqué de l'outil — un protocole
binaire parlé à la main, où une désynchronisation d'un octet corrompt le pack
en silence — est **entièrement vérifiable ici**, octet par octet, sans
paramiko, sans réseau et sans appareil. `tests/test_scp.py` compare le flux
émis à la séquence attendue, et couvre l'accusé négatif, la fermeture du
canal, le nom impossible, le dossier vide, et l'**écriture partielle** :
`send()` peut n'écrire qu'une partie du tampon, et l'ignorer produirait un
pack tronqué plutôt qu'une erreur.

**paramiko et Pillow sont importés à l'appel, jamais au chargement.** Sans
cela, ni les tests ni `packcli` ne s'importeraient sur cette machine.

### 5.3 Non vérifié de ce côté — à faire sous Windows

1. **Le rendu de la fenêtre.** La palette est reprise à l'identique de
   `LunyTheme`, mais les polices (`Segoe UI`), les métriques et le thème ttk
   diffèrent. La fenêtre a été *montée* sous WSLg, jamais *regardée* sous
   Windows.
2. **paramiko contre ce serveur SSH.** Cet OpenSSH est ancien ; ses
   algorithmes le sont aussi, et paramiko récent en désactive certains par
   défaut. Le code passe `disabled_algorithms={"pubkeys": []}` et
   `AutoAddPolicy`, **sans qu'aucune poignée de main ait jamais eu lieu**. Si
   la connexion échoue, c'est le premier endroit à regarder.
3. **L'exécutable empaqueté.** Résolution de `sys._MEIPASS`, `--add-binary`,
   `--add-data`, fenêtre sans console.
4. **ffmpeg.exe.** Non téléchargé, donc ni sa version ni la présence de
   `libmp3lame` ne sont établies. Voir `README-windows.md`.

### 5.4 Ce qui, lui, EST mesuré

- **82 tests**, tous verts, sans appareil ni réseau.
- **La conversion réelle**, enfin exécutée : ffmpeg est installé depuis. Le
  point que le README traînait comme « jamais exécuté » est clos.
- **Non-régression de `packcore`** contre le vrai 3GS : `packcli.py liste`
  rend le même inventaire après l'introduction du transport interchangeable.
- **Le montage complet de la fenêtre**, avec un faux appareil injecté, jusqu'à
  l'état des cases à cocher.

### 5.5 Trois défauts trouvés en montant la fenêtre pour de vrai

Aucun n'aurait été vu par les tests de logique seuls. C'est l'argument pour
avoir écrit `tests/test_gui_smoke.py` plutôt que de s'en tenir au code pur.

**`self._w` est le nom Tcl interne d'un widget.** `FlatButton` y rangeait sa
largeur. Le chemin du widget devenait `90`, et le premier appel échouait en
`invalid command name "90"` — **tous** les boutons étaient cassés, dès le
premier lancement.

**La présélection automatique collait.** `rebuild_rows` reportait l'état des
cases d'une reconstruction à l'autre. Or le balayage local peut finir avant
l'inventaire distant : un pack « local seul », donc pré-coché à juste titre,
restait coché une fois découvert présent sur l'appareil — c'est-à-dire
présélectionné pour un **écrasement que personne n'avait demandé**, exactement
ce que la règle interdit. Corrigé en distinguant le choix explicite
(`command` d'une case, qui ne se déclenche qu'au clic) de la présélection
calculée, désormais recalculée à chaque fois.

**Les variables Tk survivaient à la boucle.** Chaque `BooleanVar` encore
référencée après la disparition de la boucle Tk se finalise en
`RuntimeError: main thread is not in main loop`, et Tcl finit par tomber en
`async handler deleted by the wrong thread`. `Application.shutdown()` les
relâche tant que l'interpréteur vit encore, par balayage générique de
`__dict__` — une liste à tenir à jour aurait laissé le prochain ajout
réintroduire le défaut.

Un quatrième point, côté tests seulement : monter et détruire plusieurs
`tk.Tk()` dans un même processus, avec des fils vivants, fait tomber Tcl par
intermittence. Une racine unique pour toute la classe supprime le problème.
Cinq exécutions consécutives propres avant de conclure.

### 5.6 La règle de correspondance, et pourquoi ce n'est pas le titre

L'appareil ne connaît que des **noms de répertoire** ; l'app affiche des
**titres** lus dans `story.json`. Comparer les deux reviendrait à rapprocher
deux choses qui n'ont aucune raison de coïncider — deux packs peuvent porter
le même titre, et un titre peut être vide.

La clé est donc le nom de dossier que le pack occuperait après transfert,
calculé exactement comme `packcore.extract_zip` le fait. Comparaison
insensible à la casse, HFS+ l'étant. Deux entrées locales qui donnent le même
nom sont signalées et jamais présélectionnées : c'est le seul choix sur lequel
l'outil ne doit pas parier, la seconde écraserait la première en silence.

### 5.7 Un choix de sécurité assumé

`AutoAddPolicy` accepte une empreinte d'hôte inconnue sans broncher. Sur un
outil général ce serait une faute. Ici l'hôte est un 3GS de test sur un
réseau local, réinstallé souvent, dont l'empreinte change à chaque fois :
refuser rendrait l'outil inutilisable après chaque réinstallation. Le choix
est borné à cet usage, et n'a pas à être repris ailleurs.

### 5.8 Le mur d'algorithme — panne réelle, et ce qu'elle a appris

Premier essai contre l'appareil physique depuis Windows :

```
Unable to negotiate with 192.168.1.98 port 22:
no matching host key type found. Their offer: ssh-rsa,ssh-dss
```

**Le diagnostic reçu désignait paramiko. Ce n'était pas lui.** Ce libellé est
verbatim celui du client OpenSSH ; paramiko dit « Incompatible ssh peer (no
acceptable host key) ». C'est donc `SystemTransport` qui a échoué — le repli
choisi quand paramiko manque ou qu'aucune clé n'est renseignée.

Reproduit ici en une commande, en contournant la configuration :

```sh
ssh -F /dev/null -o BatchMode=yes root@192.168.1.98 true
# Unable to negotiate ... Their offer: ssh-rsa,ssh-dss
```

`-F /dev/null` reproduit exactement la situation Windows : pas de
`~/.ssh/config`, donc pas de `HostKeyAlgorithms=+ssh-rsa`. La cause n'était
pas le client choisi, mais le fait que **la configuration vivait hors de
l'outil** — ce qui est précisément ce qu'un outil autoporteur ne peut pas se
permettre.

Corrigé des deux côtés, et pas seulement de celui qui avait échoué : paramiko
se heurterait au même mur.

**Relevé complet avant de corriger**, pour ne pas franchir un mur et en
découvrir un second : KEX, chiffrements et MAC de l'appareil sont tous
acceptables par un client moderne. Seul le type de clé d'hôte bloque.

**Vérifié contre le vrai 3GS**, `HOME` pointé sur un répertoire vide :
connexion établie, inventaire des sept packs revenu.

`+` plutôt qu'un remplacement : la liste par défaut est conservée et
`ssh-rsa` seulement ajouté en fin. Un hôte moderne négocie ce qu'il a de
mieux ; seul celui-ci retombe sur SHA-1. Côté paramiko, même principe par
`get_security_options().key_types`, ce qui a imposé de passer de `SSHClient` à
`Transport` — les types de clé d'hôte ne se règlent qu'à ce niveau,
`SSHClient` n'exposant que `disabled_algorithms`, qui retire mais n'ajoute
rien.

**Le message trompeur.** `device_reachable` concluait toujours « l'appareil
coupe son Wi-Fi en veille : réveiller l'écran et réessayer ». Devant un refus
d'algorithme, ce conseil envoie chercher une panne qui n'existe pas et laisse
croire qu'une nouvelle tentative peut aboutir : elle ne peut pas. Les pannes
sont désormais classées — négociation, authentification, réseau — et les deux
premières ont été provoquées contre le vrai réseau pour vérifier que chacune
rend son propre message.

### 5.9 Filigrane du bandeau : mesuré, pas ajusté à l'œil

La demande suggérait d'ajuster l'opacité à l'œil « puisque tu peux voir le
rendu réel sous Windows ». **Ce n'est pas le cas** : l'accès reste
Linux/WSL, et rien de ce qui est écrit ici n'a été vu sous Windows.

Plutôt que de choisir au hasard, la source a été décodée avec
`ios/LunyUI/Tools/lunypng.py` — le lecteur PNG en Python pur écrit pour
l'icône, qui ne demande pas Pillow — et le contraste du texte posé sur le
mélange calculé sur le **pixel le plus clair** du bandeau :

| opacité | titre `#E7ECFA` | sous-titre `#94A0C6` |
|---|---|---|
| 0,10 | 13,03:1 | 5,94:1 |
| **0,15** | **11,42:1** | **5,20:1** |
| 0,20 | 9,83:1 | 4,48:1 — échoue AA |
| 0,35 | 6,19:1 | 2,82:1 |

Les 15 % demandés se trouvent être exactement le plafond utile. La première
version mélangeait à 0,35, ce qui mettait le sous-titre à 2,82:1.

C'est le **sous-titre** qui fixe la limite, pas le titre : celui-ci reste
au-dessus de 6:1 jusqu'à 0,35 et n'aurait rien signalé. Mesurer la mauvaise
couleur aurait donné une réponse fausse avec l'air d'être rigoureuse.

Ce que la mesure ne dit pas, et qui reste à l'œil sous Windows : que le
filigrane **se devine**. Le contraste garantit qu'on lit le texte, pas que le
décor produise l'effet voulu.

Détail de mise en œuvre : le bandeau est un **canevas**, non un empilement de
Labels. Tkinter n'a pas de transparence entre widgets, donc un Label d'image
ne peut pas servir de fond à un Label de texte. Sur un canevas, l'image et le
texte sont deux objets, et l'ordre de tracé suffit. Le ré-échantillonnage
n'est refait que si la largeur a changé : un redimensionnement émet des
dizaines d'événements, et refaire un Lanczos à chacun rendrait la fenêtre
poisseuse.

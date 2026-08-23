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
3. **L'exécutable empaqueté.** PyInstaller doit tourner sur Windows.
   *Depuis la §6, la résolution de `sys._MEIPASS` est vérifiée par simulation
   (`tests/test_config.py`) et la recette d'empaquetage est versionnée
   (`luny-transfer.spec`) — ce qui reste non vérifié, c'est la construction
   elle-même.*
4. **ffmpeg.exe.** Non téléchargé, donc ni sa version ni la présence de
   `libmp3lame` ne sont établies. Voir `README-windows.md`.

### 5.4 Ce qui, lui, EST mesuré

- **155 tests**, tous verts, sans appareil ni réseau (93 à la rédaction de
  cette section).
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

> **Section dépassée — voir §6.1.** Tout ce qui suit est exact et ne suffisait
> pas : l'opacité était juste, le **recadrage** ne montrait rien. C'est
> précisément l'histoire de cette section qui explique comment un décor
> invisible a pu être livré deux fois comme corrigé.

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

### 5.10 Le second mur : la signature, pas la clé

Après le mur d'algorithme de clé d'hôte (§5.8), un second refus, déguisé en
premier : **« Permission denied »** dans l'app, alors que la même clé passe
en ligne de commande.

**Le diagnostic reçu désignait `UserKnownHostsFile` manquant dans
`SystemTransport`.** Deux erreurs dans cette hypothèse, vérifiables en une
commande :

```sh
python3 -c "import packtransport as p; \
  print(p.SystemTransport(host='x', key_path='/k').detail())"
```

1. `UserKnownHostsFile` et `StrictHostKeyChecking=no` y étaient **déjà**,
   depuis §5.8.
2. Surtout, `_make_transport` choisit **paramiko** dès qu'une clé est
   renseignée et que le module est installé. Ce n'est donc pas
   `SystemTransport` qui a produit ce refus.

Et l'hypothèse d'une vérification d'hôte mal classée ne pouvait pas tenir sur
ce chemin : sur le transport paramiko, l'empreinte n'est **jamais** vérifiée —
`Transport` est employé directement, sans `HostKeys`. Aucun rejet d'hôte n'y
est possible. Le classement « authentification » était donc juste.

**La vraie cause.** L'appareil est un **OpenSSH_6.7** (relevé : `remote
software version OpenSSH_6.7`). Or :

| | apparu dans |
|---|---|
| signatures `rsa-sha2-256/512` | OpenSSH 7.2 |
| extension `server-sig-algs` | OpenSSH 7.2 |

Un serveur 6.7 n'accepte donc que `ssh-rsa` (SHA-1) pour une clé RSA, **et
n'a aucun moyen de l'annoncer**. paramiko, depuis la 2.9, propose
`rsa-sha2-512` d'abord et se fait refuser. OpenSSH en ligne de commande
retombe seul sur `ssh-rsa` — d'où l'asymétrie « ça marche dehors, pas
dedans », qui est l'indice décisif et non un détail.

Corrigé par une seconde tentative avec `disabled_algorithms={"pubkeys":
[...]}`, dans cet ordre : un hôte moderne obtient toujours une signature
moderne et ne paie jamais la reprise.

**Ce qui a rendu ce diagnostic coûteux** : l'app ne disait pas ce qu'elle
faisait. Il a fallu reconstruire la commande à la main hors de l'app pour
comparer. Le journal de démarrage écrit désormais la ligne exacte, recopiable,
et pour paramiko la version du module, celle du serveur, la clé d'hôte
négociée et la signature retenue.

Ajouté au passage, seule vraie divergence avec la commande manuelle : `-F`,
qui ignore **tout** fichier de configuration ssh — y compris celui du système,
`C:\ProgramData\ssh\ssh_config` sous Windows, qu'on ne pense jamais à
regarder. Posé uniquement si une clé est renseignée : sans clé, l'outil dépend
encore de `~/.ssh/config` pour savoir laquelle employer, et le couper
casserait `packcli` sous WSL.

Enfin, un réglage `transport` (`auto` / `paramiko` / `systeme`) : les deux
transports ne rencontrent pas les mêmes murs sur ce serveur, et rester bloqué
sur l'un ne doit pas obliger à reconstruire l'exécutable pour essayer l'autre.


---

## 6. Itération du 2026-08-23

Sept points demandés : deux défauts, cinq évolutions. Ce qui suit ne consigne
que ce qui s'est révélé instructif ou qui reste à vérifier ailleurs.

### 6.1 Le décor absent — la cause n'était pas celle qu'on cherchait

**L'hypothèse fournie avec la demande** : un chemin relatif qui ne
correspondrait pas au dossier où `--onefile` extrait ses ressources
(`sys._MEIPASS`). C'est la panne classique de ce mode d'empaquetage, et elle
méritait d'être examinée en premier.

**Elle était fausse.** `packconfig.resource_dir()` lisait déjà `sys._MEIPASS`,
et le faisait avant même cette itération. Une simulation d'exécutable gelé —
`sys.frozen`, `sys._MEIPASS` et `sys.executable` posés comme PyInstaller les
pose — le confirme désormais dans `tests/test_config.py`.

**La cause réelle était le recadrage**, et elle se démontre en trois nombres :

| | valeur |
|---|---|
| bandeau | 1180 x 84, soit un rapport de **14,05** |
| source | 772 x 1159 (portrait 2:3) |
| bande retenue | 772 / 14,05 = **54 lignes**, soit **4,7 %** de la hauteur |

Ces 54 lignes sont le haut du ciel : un dégradé gris de moyenne (175, 181,
191), sans fusée, sans lune, sans nuage — aucun ne se trouve dans les 5 %
supérieurs de l'image. Fondu à 15 % vers `#0B1024`, ce dégradé donne
**`#24293B` sur toute la largeur**. Un aplat.

Le rendu a été reproduit hors interface et **regardé** avant de corriger quoi
que ce soit — c'était la consigne, et c'est ce qui manquait aux deux
itérations précédentes.

**Pourquoi les tests ne l'ont pas vu.** Le seul test du filigrane vérifiait
que `BANDEAU_ALPHA <= 0.15`. Il était vert, et il avait raison : l'opacité
*était* juste. Un test qui contrôle un réglage ne peut rien dire du résultat.
Les tests actuels lisent les **pixels réellement remis à Tk** :

| | couleurs distinctes | saturation maximale |
|---|---|---|
| ancien recadrage | 50 | 26 |
| rendu actuel | 1 949 | 166 |

Le premier de ces deux relevés est lui aussi figé dans un test
(`test_l_ancien_cadrage_produisait_bien_un_aplat`) : le diagnostic est
exécutable, pas seulement raconté.

**Second facteur, indépendant et réel.** Le décor passait par Pillow. Absent,
`_header_artwork` rendait `None` **sans un mot** — même symptôme exact, autre
cause. Or Pillow n'est pas installé dans cet environnement : le chemin de code
qui produisait le décor n'y a jamais été exécuté. Le décor est donc désormais
décodé et composé par `packimage`, en Python pur (zlib + struct), remis à Tk
en PNG base64. Plus aucune dépendance, et — ce qui compte autant — **le rendu
devient vérifiable ici**. Pillow ne sert plus qu'aux vignettes de couverture,
qui sont souvent des JPEG.

**La correction visuelle.** Un portrait 2:3 ne peut pas remplir un bandeau de
rapport 14:1 : toute tranche choisie ne montre presque rien. L'illustration
est donc mise à l'échelle entière, posée à droite avec un fondu de 46 px sur
son bord gauche. Le texte restant sur du fond pur, elle peut monter à 0,85
d'opacité sans toucher aux contrastes (15,96:1 pour le titre, 7,27:1 pour le
sous-titre). L'ancien plafond de 0,15 n'existait que parce que l'image passait
**sous** le texte.

**Le silence, enfin.** Chaque échec du décor écrit désormais une ligne dans le
journal — illustration introuvable, illisible, ou refusée par Tk. Aucune de
ces trois situations ne peut plus se présenter comme « rien à l'écran ».

### 6.2 Les fenêtres de console

L'hypothèse était juste, et vérifiée : **aucun appel n'avait
`CREATE_NO_WINDOW`**. Une application `--windowed` n'a pas de console, donc
Windows en crée une par processus console lancé — `ffmpeg` par fichier
converti, `ssh` par commande distante, `scp` par transfert.

Tout passe maintenant par `packproc.run`, qui pose `CREATE_NO_WINDOW` **et**
`STARTF_USESHOWWINDOW` + `SW_HIDE`. Sur tout autre système, il ne pose rien :
le comportement sous WSL est inchangé.

Le point faible de ce genre de correction est l'appel oublié — un seul
`subprocess.run` écrit en direct et les fenêtres reviennent pour ce binaire-là
seulement. Un test **relit le code source** de tous les modules et échoue sur
le premier appel direct trouvé.

**Non vérifiable ici** : que plus aucune fenêtre n'apparaisse réellement. Le
comportement est propre à Windows ; seuls les arguments transmis à
`subprocess` sont vérifiés.

### 6.3 Filtres : masquer n'est pas oublier

Le piège de cette fonctionnalité n'est pas le filtrage, c'est ce qui arrive à
une sélection quand la ligne disparaît. Un pack coché puis masqué **reste
sélectionné**, le récapitulatif dit combien de lignes sont dans ce cas, et la
fenêtre de confirmation les nomme une par une. L'inverse — une sélection
annulée par un changement d'affichage — aurait été silencieux, donc pire que
la liste bruyante qu'on cherchait à réduire.

Le compteur du volet gauche annonce toujours le nombre de lignes cachées :
une liste raccourcie sans le dire ne vaut pas mieux.

### 6.4 Espace disque

`df` est appelé dans le canal SSH déjà ouvert, quel que soit le transport.
L'analyse ne se fie **pas au découpage en colonnes** mais aux trois premiers
entiers rencontrés après l'en-tête : sur ce système minimal, `df` peut venir
de busybox comme de BSD, et un nom de volume long renvoie les chiffres à la
ligne suivante. La taille de bloc est lue dans l'en-tête — un `df` BSD sans
`-k` compte en blocs de 512 octets, et prendre 1024 doublerait la capacité
annoncée.

Deux tentatives (`df -k`, puis `df`), puis repli explicite : « espace disque
non disponible ». Cet appareil a déjà rendu plusieurs utilitaires absents ;
une option refusée doit coder « pas de mesure », jamais « pas de place ».

**Non vérifié** : que `df` existe sur ce 3GS précis, et le format exact de sa
sortie. Les quatre variantes couvertes par les tests sont des reconstitutions.

### 6.5 Taille de fenêtre

80 % de l'écran, plancher à 1000x700, plafond à l'écran lui-même. **L'ordre
des bornes compte** : sur un petit écran, c'est le plafond qui doit l'emporter
sur le plancher, sinon la fenêtre naît plus grande que l'affichage et sa barre
de titre passe hors champ. `minsize` est posé au minimum entre le plancher et
la taille de départ, pour la même raison.

`geometrie()` est une fonction pure : les cas d'écran (2560x1440, 1920x1080,
1366x768, 1280x720, 1024x640) sont vérifiés sans ouvrir la moindre fenêtre.
Relevé réel au lancement sur cette machine : `3072x960` sur un écran
`3840x1200`.

### 6.6 Icônes dessinées, pas écrites

Dossier, corbeille, flèche, rafraîchir, `+`, `−` : tracés au trait sur le
canevas. Un caractère Unicode aurait été plus court à écrire, mais rien ne
garantit qu'une police Windows donnée possède le glyphe voulu, et un caractère
manquant s'affiche en rectangle vide — pire que pas d'icône du tout.

### 6.7 Empaquetage : une recette versionnée

`luny-transfer.spec` remplace la ligne de commande du README. Une option
`--add-data` oubliée donne un exécutable qui démarre normalement et auquel il
manque une ressource : la panne se voit à l'écran, une fois le fichier livré.

L'illustration y est en **`datas`**, jamais en `binaries` — cette dernière
passe par l'analyse des dépendances binaires, qui n'a rien à faire d'une
image. Elle est cherchée à côté du `.spec` puis dans les ressources de l'app
iOS, et **son absence arrête la construction**.

### 6.8 Ce qui reste non vérifiable de ce côté

| | |
|---|---|
| rendu réel sous Windows | polices `Segoe UI`, métriques et thème ttk diffèrent de WSLg |
| **capture d'écran de la fenêtre** | impossible ici : WSLg compose chaque fenêtre hors du root X, `ffmpeg -f x11grab` ne rend qu'un cadre noir, et ni `xwd`, ni ImageMagick, ni `Xvfb` ne sont installés. Le décor a donc été vérifié **par ses pixels** (rendu hors interface, puis relecture de l'image remise à Tk), ce qui couvre le défaut signalé mais pas la mise en page d'ensemble |
| ouverture effective des fenêtres de console | comportement propre à Windows |
| `df` sur ce 3GS | présence et format de sortie supposés, repli prévu |
| l'exécutable empaqueté | PyInstaller doit tourner sur Windows |
| ffmpeg.exe | toujours pas téléchargé — ni version, ni présence de `libmp3lame` |


---

## 7. Itération du 2026-08-23 (soir) — les noms de packs

Le pack « Margot, Apprentie véto en Australie » a fait tomber le transfert sur
`scp: ambiguous target`. En cherchant pourquoi, **quatre défauts** sont
apparus, tous dans la même famille et tous invisibles jusque-là : les packs
d'essai s'appelaient `two-branches`, `IDRISS_ET_COLETTE`, `audio-demo`,
`test-pack`. Que des caractères sans histoire.

Les quatre sont **mesurés contre le vrai 3GS**, pas déduits.

### 7.1 L'espace casse scp — le défaut signalé

Reproduit à l'identique avec un dossier de test portant le même nom :

```
CIBLE scp remise au shell distant :
    root@192.168.1.98:/var/mobile/Documents/packs/Margot, Apprentie véto en Australie

ECHEC transfert : scp: ambiguous target
```

La cause tient en une distinction : **`subprocess` reçoit une liste
d'arguments, donc rien n'est interprété côté Windows** — et on en avait
conclu qu'il n'y avait rien à protéger. Mais la partie située après le `:`
n'est pas lue par le poste : scp la remet au `sh` de l'appareil, qui la
découpe sur les espaces comme n'importe quel shell. Quatre mots, donc
plusieurs cibles, donc refus.

Corrigé par `packtransport.quote_remote`, appliqué à la cible scp et à
`scp -rt` côté paramiko.

### 7.2 L'apostrophe casse le quotage — et c'était dans un `rm -rf`

Les commandes distantes entouraient déjà les chemins de guillemets **simples**
écrits à la main : `rm -rf '%s'`. Cela suffit pour l'espace, la virgule et
l'accent. Pas pour `'`. Sur l'appareil :

```
$ rm -rf '/tmp/luny-essai/Margot, l'apprentie'
sh: -c: line 0: unexpected EOF while looking for matching `''
sh: -c: line 1: syntax error: unexpected end of file
```

Et le cas **pair** est pire que le cas impair. Avec deux apostrophes, les
guillemets se referment deux à deux et la commande devient syntaxiquement
valide — mais elle ne désigne plus le même chemin. Relevé sur l'appareil, en
remplaçant `rm` par `echo` :

```
$ for a in '/var/mobile/Documents/packs/Margot, l'apprentie qui n'existe pas'
    do echo "  [$a]"; done
  [/var/mobile/Documents/packs/Margot, lapprentie]
  [qui]
  [nexiste pas]
```

Trois arguments, trois chemins, aucun n'étant celui voulu. Un `rm -rf` sur ce
découpage n'échoue pas : il efface ailleurs, en silence. Avec le quotage
POSIX, le même nom donne un seul mot, caractère pour caractère.

Une commande de suppression tronquée n'est pas un défaut de confort. Le
procédé POSIX — `'\''` ferme la chaîne, insère une apostrophe littérale, la
rouvre — a été vérifié sur l'appareil avant d'être figé dans le code :

```
$ mkdir -p '/tmp/luny-essai/Margot, l'\''apprentie'
$ ls /tmp/luny-essai
Margot, Apprentie véto en Australie
Margot, l'apprentie
```

Tous les chemins distants passent désormais par `quote_remote` : `mkdir`,
`rm -rf`, `chown`, `df`, et la cible scp. Un test relit chaque commande avec
`shlex.split` et vérifie qu'un shell y retrouve exactement le chemin d'origine.

### 7.3 L'espace casse aussi l'inventaire

`remote_inventory` lisait le chemin comme le **dernier champ** d'une ligne
`ls -l`. Ligne réelle relevée sur l'appareil :

```
-rw-r--r-- 1 root wheel 2 Aug 23 15:23 /tmp/luny-essai/Margot, Apprentie véto en Australie/story.json
```

`split()` en tire 24 champs, et `parts[-1]` vaut `Australie/story.json`. Le
pack était donc compté sous un nom inexistant — ou pas compté du tout.

Corrigé par un découpage **borné** : `split(None, 8)`. Les huit premiers
champs de `ls -l` sont fixes ; le neuvième est le chemin, espaces compris.

### 7.4 HFS+ renormalise les accents — et celui-là, aucun quotage ne le répare

Un nom envoyé en NFC revient en NFD :

```
envoyé   b' Apprentie v\xc3\xa9'      (é = U+00E9)
relu     b' Apprentie ve\xcc\x81'     (e + U+0301)
```

Les octets diffèrent. La comparaison local/distant échouait donc **même après
un transfert réussi** : le pack serait réapparu « absent de l'appareil » à
chaque inventaire, et se serait reproposé indéfiniment.

Ce défaut-là ne se corrige pas à la source — c'est le système de fichiers de
l'appareil qui décide.

### 7.5 La règle de nommage retenue

> **Le nom de dossier est translittéré. Le titre n'est jamais touché.**

```
« Margot, Apprentie véto en Australie »
  -> dossier   Margot_Apprentie_veto_en_Australie
  -> titre     Margot, Apprentie véto en Australie   (story.json, intact)
```

C'est le **titre** que l'app affiche : `LunyLibraryItem -readMetadata` lit
`story.json` et ne retombe sur le nom de dossier que si le titre est vide. La
translittération est donc invisible pour l'enfant, et le nom de dossier
redevient ce qu'il aurait toujours dû être — un identifiant.

Jeu de caractères conservé : `A-Z a-z 0-9 . _ -`. Tout le reste devient `_`,
les groupes se réduisent à un seul `_`, les accents partent par décomposition
Unicode (`é` → `e`), un `-` ou un `.` en tête est retiré (option, fichier
caché), et la longueur est bornée à 64.

| entrée | dossier envoyé |
|---|---|
| `Margot, Apprentie véto en Australie` | `Margot_Apprentie_veto_en_Australie` |
| `Margot, l'apprentie` | `Margot_l_apprentie` |
| `7+ Margot, Apprentie véto au Canada` | `7_Margot_Apprentie_veto_au_Canada` |
| `IDRISS_ET_COLETTE`, `two-branches`, `audio-demo` | **inchangés** |

Ce dernier point n'est pas un détail : les packs déjà sur l'appareil gardent
leur nom, donc leur correspondance. Aucun remue-ménage sur l'existant.

**La règle ne remplace pas le quotage, elle s'y ajoute.** Le quotage reste
indispensable pour supprimer un pack déjà déposé sous un nom riche : sans lui,
il serait impossible à retirer.

**La comparaison passe par la même fonction des deux côtés**
(`packnames.key`), ce qui fait correspondre un dossier local
« Margot, Apprentie véto en Australie » avec un pack déposé autrefois sous ce
nom, quelle que soit la forme Unicode que le système de fichiers lui a donnée.

**Collisions.** Deux entrées locales peuvent se réduire au même nom
(`Margot, apprentie` et `Margot; apprentie`). Elles ne sont pas départagées :
elles ressortent comme **noms ambigus**, décrites et jamais pré-cochées — le
mécanisme existait déjà pour la casse et couvre celui-ci sans rien de spécial.

**Ce que l'utilisateur voit.** La ligne du volet gauche affiche
« dossier envoyé : … » quand le nom change, et le journal de transfert écrit
« dossier renommé pour l'appareil : … (le titre affiché ne change pas) ».
Un renommage silencieux ferait croire à un autre pack au premier inventaire.

### 7.6 Ce qui reste vrai

Les quatre défauts touchaient des étapes différentes — la commande scp, la
commande shell, la lecture de l'inventaire, la comparaison. Un seul jeu
d'essai composé de noms alphanumériques les cachait tous les quatre à la fois.
Les tests portent désormais les caractères réels (`tests/test_noms.py`), y
compris une lecture de l'archive d'origine quand elle est présente sur le
poste.

### 7.7 Trouvé en vérifiant : une suppression réussie annoncée « ÉCHEC »

En prouvant le correctif d'apostrophe contre l'appareil, la suppression est
revenue en échec alors que `rm -rf` avait rendu 0 :

```
ECHEC suppression : Margot, l'apprentie qui n'existe pas — Warning:
Permanently added '192.168.1.98' (RSA) to the list of known hosts.
```

`remote_delete` tient **toute sortie** pour un échec — règle saine, le shell
distant ne parlant qu'en cas de problème. Mais les deux flux sont fusionnés,
et ssh écrivait cette bannière sur stderr **à chaque commande**, puisque le
fichier des hôtes connus est `/dev/null`. Toute suppression réussie
ressortait donc en échec, avec la bannière en guise de motif.

Corrigé par `-o LogLevel=ERROR`, qui ne masque que ce bavardage : les refus de
négociation et d'authentification, sur lesquels repose tout le diagnostic de
connexion (§5.8), sont de niveau erreur et restent visibles. Vérifié dans les
deux sens — la suppression rend maintenant `SUPPRESSION OK`, et
`classify_failure` reconnaît toujours les deux pannes.

### 7.8 Vérification finale — le vrai pack, le vrai appareil

Le cas de test qui a révélé le défaut, transféré pour de bon :

```
CONVERSION terminee : 22 converti(s), 0 echec(s), 40 copie(s) tel(s) quel(s)
--- transfert ---
TRANSFERT OK : Margot_Apprentie_veto_en_Australie
    -> 192.168.1.98:/var/mobile/Documents/packs/Margot_Apprentie_veto_en_Australie
uicache execute
```

Inventaire de l'appareil après coup :

```
  IDRISS_ET_COLETTE                  documents   10 fichier(s)  12.1 Mo
  Margot_Apprentie_veto_en_Australie documents   63 fichier(s)  65.4 Mo
  audio-demo                         bundle       7 fichier(s)   4.4 Mo
  …
```

Et la comparaison des deux bibliothèques, qui est l'autre moitié du défaut :

```
titre                                    etat             dossier sur l'appareil
------------------------------------------------------------------------------------
7+ Margot, Apprentie véto au Canada      local_seul       7_Margot_Apprentie_veto_au_Canada
7+ Margot, Apprentie véto au Kenya       local_seul       7_Margot_Apprentie_veto_au_Kenya
IDRISS ET COLETTE                        des_deux_cotes   IDRISS_ET_COLETTE
Margot, Apprentie véto en Australie      des_deux_cotes   Margot_Apprentie_veto_en_Australie
```

`des_deux_cotes`, et non `local_seul` : le pack est reconnu comme présent, ne
sera pas re-proposé, et son titre reste `Margot, Apprentie véto en Australie`.
Espace disque relevé dans la foulée : 27,2 Go libres sur 28,3 Go.

**189 tests**, tous verts.


---

## 8. Itération du 2026-08-24 — l'illustration, une troisième fois

Journal fourni par l'utilisateur, depuis un vrai build Windows :

```
illustration introuvable : en-tete sans decor (cherchee dans
C:\Users\javau\AppData\Local\Temp\_MEI000059c42)
ffmpeg : C:\...\_MEI000059c42\ffmpeg.exe
```

Deux faits établis d'emblée par ce seul journal, avant toute hypothèse :

- **Le mécanisme `_MEIPASS` fonctionne.** `resource_dir()` a rendu ce même
  dossier pour ffmpeg, qui y a été trouvé. Rouvrir l'hypothèse « le code lit
  le mauvais dossier » — déjà écartée en §6.1 par simulation — n'aurait rien
  apporté.
- **Le nom cherché et le nom écrit dans `luny-transfer.spec` étaient
  identiques, relus caractère par caractère.** Deux définitions du même
  texte, jamais liées entre elles.

### 8.1 Ce qui a changé : une seule définition, importée, pas recopiée

`luny-transfer.spec` **importe désormais `packconfig`** et lui délègue la
recherche (`packconfig.build_source`) et le nom
(`packconfig.ARTWORK_NAMES[0]`) — la même fonction, le même module, que ceux
que `artwork_path()` utilise au démarrage. Il n'existe plus qu'une seule
définition possible à faire diverger.

`tests/test_spec.py` **exécute réellement** la partie « résolution de
ressources » du `.spec` (pas `Analysis`/`EXE`, qui n'existent que dans le
processus PyInstaller — seulement le code du dépôt, sans modification) et
vérifie :

- que le `.spec` ne recopie plus le nom en dur (garde-fou structurel : un
  texte recopié, même correct aujourd'hui, peut diverger demain sans que
  rien ne le signale — c'est exactement ce qui s'est produit) ;
- que le fichier qu'il résout porte le nom que `artwork_path()` cherchera ;
- que la destination dans le paquet est la racine (`"."`), jamais un
  sous-dossier — sans quoi un fichier réellement présent dans le paquet ne
  serait simplement pas au chemin lu ;
- **bout en bout** : le fichier résolu par le `.spec`, copié à plat dans un
  `_MEIPASS` simulé — exactement ce que fait `--onefile` — est retrouvé par
  `artwork_path()` en mode gelé (`sys.frozen`, `sys._MEIPASS`,
  `sys.executable` posés comme PyInstaller les pose).

Ce test aurait échoué sur l'ancien `.spec` **si** les deux noms avaient
divergé. Il ne prouve pas qu'ils ont divergé cette fois-ci — la relecture à
l'œil ne trouvait déjà rien — mais il rend la question impossible à se
reposer une quatrième fois de la même façon.

### 8.2 Ce que ce dépôt ne peut toujours pas trancher

**Aucun PyInstaller, aucun Windows, aucune image de _MEIPASS réelle
accessible d'ici.** Le nom demandé et le nom cherché coïncident, exécuté et
vérifié — mais rien ici ne peut prouver que PyInstaller a réellement copié
le fichier dans le paquet produit sur le poste de l'utilisateur.

L'hypothèse la plus vraisemblable, non vérifiée : un **cache de build
périmé**. `luny-transfer.spec` est arrivé à la §6 (2026-08-23), remplaçant
la commande manuelle du README ; s'il existait déjà un dossier
`build/luny-transfer/` issu d'une construction antérieure (méthode manuelle,
sans le PNG en `datas`), PyInstaller peut réutiliser certains éléments de ce
cache selon la version installée — un point de bascule CLI → `.spec` connu
pour poser ce genre de problème. **Action recommandée avant tout nouveau
build** : supprimer `build/` et `dist/` du côté Windows (ou passer
`--clean`), puis reconstruire.

### 8.3 Le journal, enrichi pour que le prochain échec s'explique lui-même

`packconfig.describe_resource_search()` liste désormais le **contenu réel**
des deux dossiers inspectés, au lieu de seulement les nommer :

```
ressources embarquees (C:\...\_MEIxxxxxx) :
  ffmpeg.exe
  README-windows.md
  README.md
  (…)
a cote de l'executable (C:\...\Bureau) :
  luny-transfer.exe
  luny-transfer.json
```

Si l'illustration manque encore, ce relevé dira lequel des deux cas s'est
produit — absente des deux dossiers, ou présente sous un autre nom — sans
qu'il faille reconstruire une fois de plus pour le savoir. C'est la
différence recherchée : documenter la correspondance et ajouter un test qui
échoue si elle diverge, plutôt que recompiler à l'aveugle une troisième fois.

**194 tests**, tous verts (189 avant).

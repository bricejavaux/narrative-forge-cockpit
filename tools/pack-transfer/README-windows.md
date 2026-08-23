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
| logique de balayage, correspondance, diff, récapitulatif, filtres | **189 tests automatiques**, tous verts |
| **noms de packs** (espace, virgule, accent, apostrophe) | **vérifiés contre le vrai 3GS**, et un transfert réel de bout en bout |
| protocole SCP historique | **vérifié à l'octet près** contre un faux canal |
| conversion `.ogg → .mp3` et `.bmp → .png` | **réellement exécutée**, résultat vérifié par `ffprobe` |
| `packcore` inchangé côté WSL | **non-régression vérifiée** contre le vrai 3GS |
| montage de la fenêtre et câblage complet | **vérifié** sous WSLg, avec un faux appareil |
| négociation SSH **sans** `~/.ssh/config` | **vérifiée contre le vrai 3GS** — voir ci-dessous |
| **décor de l'en-tête** | **pixels vérifiés** : l'image remise à Tk est relue et mesurée |
| résolution des ressources en `--onefile` | **vérifiée** en simulant `sys.frozen` / `sys._MEIPASS` |
| lecture de `df`, y compris repli | **vérifiée** sur quatre formats de sortie |
| **rendu visuel sous Windows** | **non vérifié** — polices, métriques et thème diffèrent |
| **absence effective des fenêtres de console** | **non vérifiable ici** — le comportement est propre à Windows |
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

& $py -m PyInstaller luny-transfer.spec
```

L'exécutable apparaît dans `dist\luny-transfer.exe`.

**La recette est dans [`luny-transfer.spec`](luny-transfer.spec), versionné
avec le code.** Il n'y a plus de ligne de commande à recopier : une option
`--add-data` oubliée donne un exécutable qui démarre normalement et auquel il
manque simplement une ressource — exactement la panne qui a coûté deux
allers-retours sur le décor de l'en-tête.

Ce que le `.spec` garantit :

| ressource | rangée dans | trouvée à l'exécution par |
|---|---|---|
| `luny_background_source_portrait.png` | `datas` | `packconfig.resource_dir()` → `sys._MEIPASS` |
| `README-windows.md`, `README.md` | `datas` | `packconfig.readme_path()` |
| `ffmpeg.exe` | `binaries` | `packconfig.ffmpeg_binary()` |

`datas` et `binaries` ne sont pas interchangeables : `binaries` passe par
l'analyse des dépendances binaires, qui n'a rien à faire d'une image.

L'illustration est cherchée à côté du `.spec`, puis dans
`../../ios/LunyUI/Resources/` — rien à copier à la main. **Si elle est
introuvable, la construction s'arrête** au lieu de produire un exécutable sans
décor, qui ne le signalerait qu'à l'écran.

`ffmpeg.exe`, lui, n'est pas dans le dépôt : son absence n'arrête pas la
construction mais affiche un avertissement, et l'application le redit dans son
journal au démarrage.

Pillow reste utile pour les **vignettes de couverture** (souvent des JPEG). Le
décor de l'en-tête, lui, ne dépend plus de rien : il est décodé et composé par
`packimage`, en Python pur.

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
| `filtre_compatibles` | filtre « compatibles uniquement » du volet gauche |
| `filtre_presence` | `tous`, `absents` ou `presents` |

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
      -o LogLevel=ERROR
      -i <clé> -o IdentitiesOnly=yes root@192.168.1.98 '<commande>'
```

`LogLevel=ERROR` n'est pas cosmétique : le fichier des hôtes connus étant
`/dev/null`, ssh écrivait « Permanently added … » sur stderr **à chaque
commande**. Les deux flux étant fusionnés, une suppression réussie ressortait
en « ÉCHEC suppression », la bannière tenant lieu de motif. Les refus de
négociation et d'authentification sont, eux, de niveau erreur et restent
affichés.

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

**Deux filtres, combinables**, au-dessus de la liste — parce que le même
principe, passé quelques dizaines d'entrées, noie les vrais packs au milieu
des `ffmpeg-extracted` et autres `PS2` :

| filtre | effet |
|---|---|
| **Compatibles uniquement** | masque les entrées sans `story.json` valide |
| **Afficher : tous / absents de l'appareil / déjà sur l'appareil** | isole ce qui reste à transférer |

Ils **masquent, ils n'oublient pas** : le compteur annonce combien de lignes
sont cachées, et un pack coché puis masqué **reste sélectionné** — la fenêtre
de confirmation le nomme à part, sous « sélectionnés mais masqués par le
filtre ». L'état des filtres est mémorisé d'un lancement à l'autre.

### Les cases à cocher

Cocher ne veut pas dire la même chose des deux côtés, et une case native rend
les deux gestes identiques à l'œil. Chaque volet porte donc sa phrase, et
chaque case son signe :

| volet | légende | case |
|---|---|---|
| gauche | « Cocher = sera ajouté à l'appareil » | **`+` vert** (`#8FC7A8`) |
| droite | « Cocher = sera supprimé de l'appareil » | **`−` rose** (`#D98FA6`) |

Le signe est visible **avant** le clic, en creux, puis plein une fois coché :
l'intention se lit case vide comme case pleine.

### Volet droit — bibliothèque de l'appareil

Inventaire distant au chargement, et **espace disque** dans l'en-tête du
volet — « 4.7 Go libres sur 13.7 Go », lu par un `df` passé dans le canal SSH
déjà ouvert, quel que soit le transport actif. Si `df` manque ou répond
autrement — ce système minimal a déjà rendu plusieurs utilitaires absents —
l'en-tête affiche **« espace disque non disponible »** plutôt que rien.

Vignette si le pack a été envoyé depuis cet outil (cache local), initiale du
titre sinon — l'appareil ne renvoie jamais d'image. Les packs livrés avec
l'application sont marqués **non supprimables** et leur case est désactivée.

Après un transfert réussi, **l'inventaire est relancé automatiquement**, par
le même chemin que le bouton « Rafraîchir » : le volet droit et l'espace
disque reflètent le nouvel état sans action supplémentaire.

### Le décor de l'en-tête

L'illustration fusée/lune/nuages de l'app iOS, mise à l'échelle **entière** et
posée **à droite**, avec un fondu de 46 px sur son bord gauche.

Elle était auparavant recadrée sur sa bande haute pour servir de filigrane
pleine largeur. Ce recadrage ne retenait que **4,7 % de la hauteur** de la
source — un dégradé de ciel, sans fusée ni lune — que l'opacité de 15 %
ramenait à un aplat `#24293B`. Présente dans le build, invisible à l'écran.

Un portrait 2:3 ne peut pas remplir un bandeau de rapport 14:1 : quelle que
soit la tranche choisie, elle ne montre presque rien. D'où le changement de
principe. Le texte restant sur du **fond pur**, l'illustration peut être
nettement plus opaque (0,85) sans toucher aux contrastes :

| élément | couleur | sur | contraste |
|---|---|---|---|
| titre | `#E7ECFA` | `#0B1024` | **15,96:1** |
| sous-titre | `#94A0C6` | `#0B1024` | **7,27:1** |

Mesures du décor lui-même, avant et après :

| | couleurs distinctes | saturation maximale |
|---|---|---|
| ancien recadrage | 50 | 26 |
| rendu actuel | 1 949 | 166 |

Ces deux nombres sont vérifiés par les tests, sur les pixels réellement remis
à Tk — pas sur une constante de réglage. C'est ce qui manquait : l'ancien test
contrôlait l'opacité, laquelle était juste.

### Noms de packs — espace, virgule, accent, apostrophe

Le pack « Margot, Apprentie véto en Australie » a fait tomber le transfert sur
`scp: ambiguous target`, et a révélé **quatre défauts** d'un coup. Tous les
packs essayés jusque-là s'appelaient `two-branches`, `IDRISS_ET_COLETTE`,
`audio-demo` : que des caractères sans histoire.

| caractère | ce qu'il cassait |
|---|---|
| espace | la cible scp — le shell distant en faisait plusieurs mots |
| espace | l'inventaire — le chemin était lu comme le dernier champ de `ls -l` |
| apostrophe | les commandes distantes, entourées de guillemets simples écrits à la main |
| accent | la correspondance local/distant — HFS+ renormalise NFC en NFD |

Les trois premiers sont corrigés là où ils se produisent : quotage POSIX de
tout chemin distant, et lecture de `ls -l` en champs bornés. Le quatrième ne
se corrige pas à la source — c'est le système de fichiers de l'appareil qui
décide.

D'où la règle :

> **Le nom de dossier est translittéré. Le titre n'est jamais touché.**

```
« Margot, Apprentie véto en Australie »
  -> dossier   Margot_Apprentie_veto_en_Australie
  -> titre     Margot, Apprentie véto en Australie   (story.json, intact)
```

C'est le **titre** que l'app affiche ; elle ne retombe sur le nom de dossier
que si le titre est vide. La translittération est donc invisible à l'écran de
l'appareil.

Jeu de caractères conservé : `A-Z a-z 0-9 . _ -`. Le reste devient `_`, les
groupes se réduisent à un seul `_`, les accents partent par décomposition
Unicode (`é` → `e`), un `-` ou un `.` en tête est retiré, longueur bornée à 64.

| entrée | dossier envoyé |
|---|---|
| `Margot, Apprentie véto en Australie` | `Margot_Apprentie_veto_en_Australie` |
| `Margot, l'apprentie` | `Margot_l_apprentie` |
| `7+ Margot, Apprentie véto au Canada` | `7_Margot_Apprentie_veto_au_Canada` |
| `IDRISS_ET_COLETTE`, `two-branches`, `audio-demo` | **inchangés** |

Les packs déjà sur l'appareil gardent donc leur nom, et leur correspondance.

La ligne du volet gauche affiche **« dossier envoyé : … »** quand le nom
change, et le journal l'écrit au transfert. Deux entrées locales qui se
réduisent au même nom ressortent comme **noms ambigus** et ne sont jamais
pré-cochées.

Le quotage reste en place malgré la translittération : sans lui, un pack
déposé autrefois sous un nom riche serait impossible à supprimer.

### La règle de correspondance

Les deux volets se comparent par le **nom de dossier que le pack occupera sur
l'appareil**, jamais par le titre : l'appareil ne connaît que le premier.

| entrée locale | nom retenu |
|---|---|
| dossier | son nom |
| ZIP avec `story.json` à la racine | le nom de l'archive |
| ZIP avec `PACK/story.json` | `PACK` |

C'est exactement ce que fait `packcore.extract_zip` lors d'un vrai transfert.
Ce nom est ensuite **translittéré** (voir ci-dessus) avant d'atteindre
l'appareil.

Comparaison **insensible à la casse** : le système de fichiers de cet iOS l'est
aussi, et `MonPack` y écraserait `monpack` sans le dire. Elle est aussi
insensible à la forme de normalisation Unicode et à la translittération —
la même fonction est appliquée des deux côtés, sinon un pack transféré avec
succès reviendrait « absent de l'appareil » à chaque inventaire.

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

---

## Fenêtre, palette et pied de page

**Taille au lancement : 80 % de l'écran**, jamais moins de 1000x700, jamais
plus que l'écran lui-même — et redimensionnable ensuite. Une taille fixe ne
peut pas convenir à la fois à un écran moderne, où 1080x760 était étriqué, et
à un portable ancien, où la même fenêtre débordait. Cet ordre de bornes
compte : sur un petit écran c'est le plafond qui l'emporte, sinon la barre de
titre naît hors champ.

**Palette : celle de `LunyTheme`**, reprise à l'identique de l'app iOS, dont
les contrastes ont déjà été mesurés. Aucune valeur choisie à l'œil.

| rôle | couleur |
|---|---|
| fond | `#0B1024` |
| carte | `#141A32` |
| accent | `#F0B357` |
| texte vif / courant / doux | `#E7ECFA` / `#C8D3F2` / `#94A0C6` |
| succès (ajout) | `#8FC7A8` |
| alerte (suppression) | `#D98FA6` |

**Icônes dessinées au trait** — dossier, corbeille, flèche, rafraîchir, `+`,
`−` — et non écrites avec des caractères Unicode : rien ne garantit qu'une
police Windows donnée possède le glyphe voulu, et un caractère manquant
s'affiche en rectangle vide. Style plat, sans relief ni dégradé, comme le
reste.

**Pied de page**, discret : version de l'application, date de construction,
« Brice avec Claude », et le chemin du README, cliquable. Un `.exe` recopié sur
un autre poste ne porte aucune trace de son origine, et « quelle version
as-tu ? » est la première question de tout diagnostic.

---

## Aucune fenêtre de console

Une application `--windowed` n'a pas de console, donc Windows en **crée une
pour chaque processus console qu'elle lance**. Un transfert enchaîne des
dizaines d'appels à `ffmpeg`, `ssh` et `scp` : autant de fenêtres noires qui
clignotent et volent le focus.

Tout appel externe passe donc par `packproc.run`, qui pose deux verrous :

| verrou | rôle |
|---|---|
| `CREATE_NO_WINDOW` | empêche la création de la console |
| `STARTF_USESHOWWINDOW` + `SW_HIDE` | la ceinture, si le binaire reprend la main sur sa fenêtre |

Sur tout autre système, `packproc` ne pose rien : le comportement sous WSL est
strictement inchangé.

Le point faible d'une telle correction est l'appel oublié — un seul
`subprocess.run` écrit en direct et les fenêtres reviennent, pour ce
binaire-là seulement, donc d'autant plus difficile à relier à sa cause. Un
test **relit le code source** de tous les modules et échoue sur le premier
appel direct qu'il y trouve.

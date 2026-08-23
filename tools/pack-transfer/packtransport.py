"""
Transports vers le 3GS : binaires systeme, ou paramiko en Python pur.

Deux implementations derriere la meme interface, pour que `packcore` ne sache
pas laquelle il utilise :

    SystemTransport     appelle les binaires ssh/scp du poste. C'est ce que
                        l'outil fait depuis toujours sous WSL, et rien ne
                        change pour packcli.py / packgui.py.
    ParamikoTransport   n'appelle aucun binaire. Necessaire a l'application
                        Windows autoporteuse : un .exe unique ne peut pas
                        supposer qu'un client OpenSSH est installe.

Interface commune :

    run(commande, timeout)            -> Result(returncode, stdout: bytes)
    send_dir(local_dir, base, nom)    -> Result

`Result` imite exactement la forme de `subprocess.CompletedProcess` telle que
`packcore` l'utilise deja (`.returncode`, `.stdout` en octets). C'est
volontaire : aucun appelant existant n'a eu a changer.

----------------------------------------------------------------------------
Pourquoi le protocole SCP historique est reimplemente ici
----------------------------------------------------------------------------

Le serveur SFTP de cet iOS 6 ne sait pas creer de repertoire : toute copie de
dossier echoue en « path canonicalization failed ». C'est deja documente pour
le `scp` du poste, contourne par `scp -O`. Le meme mur se dresse pour
paramiko : son `SFTPClient` est donc inutilisable ici, et `paramiko.SSHClient`
n'offre aucun SCP.

Le protocole SCP historique est donc parle directement, sur un canal ou l'on
a lance `scp -rt <dossier>` a distance. Il est simple et entierement
specifie par le comportement d'OpenSSH :

    <- \\0                      le puits annonce qu'il est pret
    -> D0755 0 <nom>\\n         entrer dans un repertoire
    <- \\0
    -> C0644 <taille> <nom>\\n  annoncer un fichier
    <- \\0
    -> <taille octets><\\0>     le contenu, puis un zero de fin
    <- \\0
    -> E\\n                     sortir du repertoire
    <- \\0

Un accuse vaut 0 pour « recu », 1 pour un avertissement et 2 pour une erreur
fatale ; 1 et 2 sont suivis d'un message termine par un saut de ligne.

`scp_send_directory` ne connait que `send` et `recv` : elle accepte donc
n'importe quel objet qui les expose. C'est ce qui la rend verifiable sans
paramiko, sans reseau et sans appareil — voir tests/test_scp.py, qui compare
les octets emis a l'octet pres. Ce detour n'est pas de la coquetterie : c'est
le seul morceau de cet outil que l'environnement de developpement ne peut pas
essayer pour de vrai.
"""

import os
import re
import socket
import subprocess

import packproc

DEFAULT_HOST = "192.168.1.98"
DEFAULT_USER = "root"

# ------------------------------------------------------------------ #
# Le mur d'algorithme de cet appareil                                 #
# ------------------------------------------------------------------ #
#
# Cet iOS 6 n'offre que deux types de CLE D'HOTE :
#
#     debug2: host key algorithms: ssh-rsa,ssh-dss
#
# Les deux reposent sur SHA-1 et sont desactives par defaut dans les clients
# recents. D'ou, sans reglage :
#
#     Unable to negotiate with 192.168.1.98 port 22:
#     no matching host key type found. Their offer: ssh-rsa,ssh-dss
#
# Sous WSL, `~/.ssh/config` compensait avec `HostKeyAlgorithms=+ssh-rsa`.
# Sous Windows ce fichier n'existe pas, et un outil autoporteur ne peut pas
# demander d'en creer un : le reglage est donc pose DANS LE CODE, des deux
# cotes, transport systeme comme paramiko.
#
# Verifie sur l'appareil : le reste de la negociation passe sans rien forcer.
# Il n'offre que ce seul mur, pas plusieurs.
#
#     KEX     curve25519-sha256@libssh.org, ecdh-sha2-nistp256/384/521,
#             diffie-hellman-group-exchange-sha256, group14-sha1
#     chiffr. aes128/192/256-ctr, chacha20-poly1305@openssh.com
#     MAC     umac, hmac-sha2-256/512, hmac-sha1
#
# Tous acceptables tels quels par un client moderne et par paramiko.

LEGACY_HOST_KEY_TYPES = ("ssh-rsa", "ssh-dss")

# ------------------------------------------------------------------ #
# Le second mur : la SIGNATURE d'authentification                     #
# ------------------------------------------------------------------ #
#
# Distinct du precedent, et facile a confondre avec lui parce qu'il se
# manifeste par un banal « Permission denied » — donc comme une mauvaise cle.
#
# Cet appareil tourne sous **OpenSSH_6.7** (releve : « remote software version
# OpenSSH_6.7 »). Or :
#
#   - les signatures RSA-SHA2 (rsa-sha2-256/512) datent d'OpenSSH 7.2 ;
#   - l'extension `server-sig-algs`, par laquelle un serveur annonce les
#     signatures qu'il accepte, date de la meme version.
#
# Un serveur 6.7 n'accepte donc QUE des signatures `ssh-rsa` (SHA-1) pour une
# cle RSA, et n'a aucun moyen de le dire. paramiko, depuis la 2.9, propose
# `rsa-sha2-512` en premier : le serveur la refuse, et l'echec ressemble trait
# pour trait a une cle rejetee.
#
# La meme cle passe pourtant en ligne de commande, parce qu'OpenSSH retombe
# seul sur ssh-rsa. C'est exactement le symptome rapporte : « la cle marche
# hors de l'app, pas dedans ».
#
# On tente donc l'authentification normalement, puis, en cas d'echec, on
# recommence en interdisant les signatures RSA-SHA2. L'ordre compte : un hote
# moderne doit continuer d'obtenir une signature moderne.

MODERN_PUBKEY_SIGNATURES = ("rsa-sha2-512", "rsa-sha2-256")

# Droits poses sur ce qui est envoye. Les fichiers d'un pack sont lus par
# l'app, jamais executes.
DIR_MODE = "0755"
FILE_MODE = "0644"

BLOCK = 32768


# ------------------------------------------------------------------ #
# Classement des pannes                                               #
# ------------------------------------------------------------------ #
#
# Trois causes se ressemblent a l'ecran et n'ont rien a voir :
#
#   negociation      le client et l'appareil n'ont aucun algorithme commun.
#                    Reessayer n'y changera JAMAIS rien.
#   authentification la cle est refusee, absente ou du mauvais type.
#   reseau           l'appareil ne repond pas — c'est le seul cas ou
#                    « reveiller l'ecran » est un conseil utile.
#
# Le message unique d'avant orientait toujours vers la veille de l'appareil.
# Devant un refus d'algorithme, il envoyait chercher une panne qui n'existait
# pas : d'ou ce classement.

PANNE_NEGOCIATION = "negociation"
PANNE_AUTH = "authentification"
PANNE_RESEAU = "reseau"
PANNE_INCONNUE = "inconnue"

_MOTIFS = (
    # L'ordre compte : la negociation d'abord, ses libelles etant les plus
    # specifiques et les plus faciles a confondre avec le reste.
    (PANNE_NEGOCIATION, (
        r"no matching host key type",
        r"no matching key exchange method",
        r"no matching cipher",
        r"no matching mac",
        r"unable to negotiate",
        r"incompatible ssh peer",
        r"no acceptable host key",
        r"couldn't agree on",
    )),
    (PANNE_AUTH, (
        r"unsupported public key algorithm",
        r"permission denied",
        r"authentication failed",
        r"no authentication methods",
        r"too many authentication failures",
        r"bad permissions",
        r"invalid key",
        r"not a valid .* key",
    )),
    (PANNE_RESEAU, (
        r"connection timed out",
        r"timed out",
        r"no route to host",
        r"connection refused",
        r"network is unreachable",
        r"host is down",
        r"banner exchange",
        r"connection reset",
        r"connection closed",
        r"broken pipe",
    )),
)

_CONSEILS = {
    PANNE_NEGOCIATION:
        "aucun algorithme commun avec l'appareil. Il n'offre que des cles "
        "d'hote ssh-rsa/ssh-dss, refusees par defaut depuis OpenSSH 8.8. "
        "Reessayer n'y changera rien : c'est un reglage du client, pose par "
        "cet outil — si le message persiste, le reglage n'a pas ete applique.",
    PANNE_AUTH:
        "l'appareil a refuse la cle. Si la MEME cle passe en ligne de "
        "commande, ce n'est pas la cle : cet OpenSSH 6.7 n'accepte que des "
        "signatures ssh-rsa (SHA-1) et refuse les rsa-sha2 que paramiko "
        "propose d'abord — l'outil reessaie seul en les interdisant. Sinon, "
        "verifier le fichier de cle prive renseigne, et que la cle publique "
        "correspondante est bien dans /var/root/.ssh/authorized_keys.",
    PANNE_RESEAU:
        "l'appareil ne repond pas. Il coupe son Wi-Fi en veille : reveiller "
        "l'ecran et reessayer.",
    PANNE_INCONNUE:
        "cause non reconnue. Si l'appareil est endormi, le reveiller et "
        "reessayer ; sinon, le message brut ci-dessus est le seul indice.",
}


def classify_failure(text):
    """
    Classe un message d'echec. Retourne (genre, conseil).

    Le texte peut venir du binaire ssh comme d'une exception paramiko : les
    deux sont parcourus par les memes motifs, insensibles a la casse.
    """
    bas = (text or "").lower()

    for genre, motifs in _MOTIFS:
        for motif in motifs:
            if re.search(motif, bas):
                return genre, _CONSEILS[genre]

    return PANNE_INCONNUE, _CONSEILS[PANNE_INCONNUE]


class TransportError(Exception):
    """Panne de transport : connexion, authentification, protocole."""


class AuthError(TransportError):
    """
    L'appareil a refuse la cle.

    Distincte de TransportError pour une raison de fond : c'est la SEULE panne
    dont on sache qu'une seconde tentative, avec d'autres algorithmes de
    signature, peut venir a bout. Les autres ne gagnent rien a etre reessayees.
    """


class ScpError(TransportError):
    """Le puits SCP distant a refuse quelque chose, ou le flux a desynchronise."""


class Result(object):
    """
    Meme forme que subprocess.CompletedProcess pour les deux seuls attributs
    que packcore lit. `stdout` est en OCTETS, comme subprocess : les appelants
    existants font tous `.stdout.decode(...)` et ne doivent pas changer.
    """

    __slots__ = ("returncode", "stdout")

    def __init__(self, returncode, stdout=b""):
        self.returncode = returncode
        self.stdout = stdout if isinstance(stdout, bytes) else stdout.encode("utf-8")

    @property
    def text(self):
        return self.stdout.decode("utf-8", "replace").strip()

    def __repr__(self):
        return "Result(returncode=%d, stdout=%r)" % (self.returncode, self.stdout[:120])


# ------------------------------------------------------------------ #
# Protocole SCP historique                                            #
# ------------------------------------------------------------------ #

def _send_all(channel, data):
    """
    `send` peut n'ecrire qu'une partie du tampon — c'est le contrat des
    sockets, et l'oublier produit une corruption silencieuse plutot qu'une
    erreur : le flux SCP se desynchronise et le pack arrive tronque.
    """
    view = memoryview(data)

    while len(view):
        written = channel.send(view)

        if not written:
            raise ScpError("canal ferme pendant l'ecriture")

        view = view[written:]


def _read_ack(channel):
    code = channel.recv(1)

    if not code:
        raise ScpError("le distant a ferme la connexion sans accuser reception")

    if code == b"\x00":
        return

    # 1 = avertissement, 2 = fatal ; les deux sont suivis d'un message.
    message = b""

    while True:
        char = channel.recv(1)

        if not char or char == b"\n":
            break

        message += char

    detail = message.decode("utf-8", "replace").strip()
    raise ScpError(detail or "accuse SCP inattendu %r" % code)


def _check_name(name):
    """
    Le nom est le reste de la ligne de controle : un saut de ligne le
    couperait en deux et un zero terminerait la chaine. Les espaces, eux, sont
    parfaitement legaux et frequents dans les titres.
    """
    if not name:
        raise ScpError("nom vide")

    if "\n" in name or "\r" in name or "\0" in name:
        raise ScpError("nom impossible a transmettre en SCP : %r" % name)

    return name


def _send_file(channel, path, name, log=None):
    size = os.path.getsize(path)
    header = "C%s %d %s\n" % (FILE_MODE, size, _check_name(name))

    _send_all(channel, header.encode("utf-8"))
    _read_ack(channel)

    sent = 0

    with open(path, "rb") as handle:
        while sent < size:
            chunk = handle.read(min(BLOCK, size - sent))

            if not chunk:
                # La taille annoncee fait foi pour le distant : s'arreter ici
                # laisserait le flux desynchronise et le pack suivant
                # illisible. Mieux vaut echouer franchement.
                raise ScpError(
                    "%s a retreci pendant l'envoi (%d octets sur %d)"
                    % (name, sent, size))

            _send_all(channel, chunk)
            sent += len(chunk)

    _send_all(channel, b"\x00")
    _read_ack(channel)

    if log:
        log("    envoye : %s (%d o)" % (name, size))

    return size


def _send_tree(channel, directory, log=None):
    """Fichiers puis sous-dossiers, tries : un envoi doit etre reproductible."""
    entries = sorted(os.listdir(directory))
    files = [e for e in entries if os.path.isfile(os.path.join(directory, e))]
    dirs = [e for e in entries if os.path.isdir(os.path.join(directory, e))]
    total = 0

    for name in files:
        total += _send_file(channel, os.path.join(directory, name), name, log)

    for name in dirs:
        _send_all(channel, ("D%s 0 %s\n" % (DIR_MODE, _check_name(name))).encode("utf-8"))
        _read_ack(channel)
        total += _send_tree(channel, os.path.join(directory, name), log)
        _send_all(channel, b"E\n")
        _read_ack(channel)

    return total


def scp_send_directory(channel, local_dir, name, log=None):
    """
    Envoie `local_dir` sous le nom `name` a un `scp -rt <parent>` distant.

    `channel` n'a besoin que de `send(bytes) -> int` et `recv(n) -> bytes`.
    Retourne le nombre total d'octets de contenu envoyes.
    """
    if not os.path.isdir(local_dir):
        raise ScpError("dossier introuvable : %s" % local_dir)

    _read_ack(channel)   # le puits annonce qu'il est pret

    _send_all(channel, ("D%s 0 %s\n" % (DIR_MODE, _check_name(name))).encode("utf-8"))
    _read_ack(channel)

    total = _send_tree(channel, local_dir, log)

    _send_all(channel, b"E\n")
    _read_ack(channel)

    return total


# ------------------------------------------------------------------ #
# Transport par binaires systeme (comportement historique)            #
# ------------------------------------------------------------------ #

class SystemTransport(object):
    """
    Appelle les binaires ssh/scp du poste. Inchange : c'est exactement ce que
    packcore faisait en ligne, extrait ici sans modification de comportement.
    """

    def __init__(self, host=DEFAULT_HOST, user=DEFAULT_USER, key_path=None,
                 port=22, connect_timeout=10):
        self.host = host
        self.user = user
        self.key_path = key_path
        self.port = port
        self.connect_timeout = connect_timeout

    @property
    def target(self):
        return "%s@%s" % (self.user, self.host)

    def describe(self):
        return "ssh/scp du systeme vers %s" % self.target

    def connect(self):
        return True

    def close(self):
        pass

    def options(self):
        """
        Les reglages communs a ssh et scp, poses en ligne de commande.

        AUCUN ne doit dependre de `~/.ssh/config` : ce fichier existe sous WSL
        et pas sous Windows, et c'est precisement ce qui a fait echouer le
        premier essai reel contre l'appareil. Un outil autoporteur porte sa
        configuration avec lui.
        """
        opts = []

        if self.key_path:
            # `-F` ignore TOUT fichier de configuration ssh — celui de
            # l'utilisateur comme celui du systeme (sous Windows,
            # C:\ProgramData\ssh\ssh_config). Une machine peut y avoir des
            # reglages qui contredisent les notres, et on ne le saurait pas.
            #
            # Uniquement quand une cle est renseignee : sans cle, l'outil
            # DEPEND encore de `~/.ssh/config` pour savoir laquelle employer,
            # et c'est ainsi que packcli fonctionne sous WSL. Couper la
            # configuration dans ce cas casserait l'usage historique.
            opts += ["-F", os.devnull]

        opts += [
            "-o", "ConnectTimeout=%d" % self.connect_timeout,
            "-o", "BatchMode=yes",
            # Le mur d'algorithme de cet appareil. `+` ajoute a la liste par
            # defaut au lieu de la remplacer : un hote moderne continue de
            # negocier ce qu'il a de mieux.
            "-o", "HostKeyAlgorithms=+%s" % ",".join(LEGACY_HOST_KEY_TYPES),
            "-o", "PubkeyAcceptedKeyTypes=+ssh-rsa",
            # Empreinte non verifiee : cet appareil de test est reinstalle
            # souvent et la sienne change a chaque fois. Choix assume et borne
            # a cet usage — voir NOTES.md.
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=%s" % os.devnull,
        ]

        if self.port and int(self.port) != 22:
            opts += ["-o", "Port=%d" % int(self.port)]

        if self.key_path:
            # `IdentitiesOnly` evite que l'agent propose d'abord ses propres
            # cles et epuise les tentatives avant d'arriver a celle-ci.
            opts += ["-i", self.key_path, "-o", "IdentitiesOnly=yes"]

        return opts

    def argv(self, command="<commande>"):
        """La ligne de commande exacte, telle que subprocess la recevra."""
        return ["ssh"] + self.options() + [self.target, command]

    def detail(self):
        """
        Ce qui sera reellement execute, recopiable dans un terminal.

        Existe pour une raison precise : diagnostiquer un refus de connexion a
        demande de reconstruire la commande a la main hors de l'app, et de
        comparer option par option. L'outil doit dire ce qu'il fait.
        """
        import shlex
        return " ".join(shlex.quote(a) for a in self.argv())

    def run(self, command, timeout=60):
        # `packproc.run` et non `subprocess.run` : sous Windows, chaque appel
        # a ssh depuis une application `--windowed` fait clignoter une console
        # qui vole le focus. Voir packproc.
        proc = packproc.run(self.argv(command), timeout=timeout)

        return Result(proc.returncode, proc.stdout)

    def send_dir(self, local_dir, base, name=None, timeout=600, log=None):
        name = name or os.path.basename(os.path.normpath(local_dir))

        # -O impose le protocole SCP historique. Sans lui, le scp recent passe
        # par SFTP, et le serveur SFTP de cet iOS 6 ne sait pas creer de
        # repertoire : « path canonicalization failed » des qu'on envoie un
        # dossier.
        proc = packproc.run(
            ["scp", "-O", "-r", "-q"] + self.options()
            + [local_dir, "%s:%s/%s" % (self.target, base, name)],
            timeout=timeout)

        return Result(proc.returncode, proc.stdout)


# ------------------------------------------------------------------ #
# Transport paramiko (Python pur, pour l'application Windows)         #
# ------------------------------------------------------------------ #

class ParamikoTransport(object):
    """
    SSH en Python pur. Aucun binaire suppose sur le poste.

    On emploie `paramiko.Transport` directement plutot que `SSHClient` : les
    types de cle d'hote acceptes ne se reglent qu'a ce niveau, par
    `get_security_options()`, et c'est exactement ce qui manque pour parler a
    cet appareil. `SSHClient` n'expose que `disabled_algorithms`, qui retire
    des algorithmes mais n'en remet aucun.

    Aucune fonctionnalite n'est perdue au passage : cette classe n'a jamais eu
    besoin que d'ouvrir des sessions, ce que `Transport` fait directement.

    paramiko est importe A L'APPEL et non au chargement du module : packcore,
    packcli et les tests doivent pouvoir s'importer sur une machine qui ne
    l'a pas — c'est le cas de l'environnement de developpement de cet outil.
    """

    def __init__(self, host=DEFAULT_HOST, user=DEFAULT_USER, key_path=None,
                 port=22, passphrase=None, connect_timeout=10):
        self.host = host
        self.user = user
        self.key_path = key_path
        self.port = int(port or 22)
        self.passphrase = passphrase
        self.connect_timeout = connect_timeout
        self.transport = None
        self.negotiated = None       # type de cle d'hote retenu
        self.remote_version = None   # banniere du serveur, ex. « OpenSSH_6.7 »
        self.signature = None        # signature d'authentification employee

    @property
    def target(self):
        return "%s@%s" % (self.user, self.host)

    def describe(self):
        return "paramiko vers %s (cle %s)" % (self.target, self.key_path or "aucune")

    @staticmethod
    def available():
        try:
            import paramiko  # noqa: F401
        except ImportError:
            return False
        return True

    @staticmethod
    def version():
        try:
            import paramiko
        except ImportError:
            return None
        return getattr(paramiko, "__version__", "inconnue")

    @staticmethod
    def load_key(key_path, passphrase=None):
        """
        Le type de cle n'est pas devinable a partir du nom du fichier. On les
        essaie donc dans l'ordre, et on distingue « mot de passe requis » du
        reste : c'est la seule erreur que l'utilisateur peut corriger lui-meme.
        """
        import paramiko

        if not key_path or not os.path.isfile(key_path):
            raise TransportError("fichier de cle privee introuvable : %s" % key_path)

        erreurs = []
        classes = []

        # DSSKey a disparu de certaines versions recentes : on ne reference
        # que ce qui existe reellement dans le paramiko installe.
        for nom in ("RSAKey", "Ed25519Key", "ECDSAKey", "DSSKey"):
            classe = getattr(paramiko, nom, None)
            if classe is not None:
                classes.append(classe)

        for classe in classes:
            try:
                return classe.from_private_key_file(key_path, password=passphrase)
            except paramiko.PasswordRequiredException:
                raise TransportError(
                    "la cle %s est protegee par un mot de passe" % key_path)
            except Exception as error:   # type non reconnu : on essaie le suivant
                erreurs.append("%s: %s" % (classe.__name__, error))

        raise TransportError(
            "cle privee illisible (%s) — formats essayes :\n  %s"
            % (key_path, "\n  ".join(erreurs)))

    @staticmethod
    def allow_legacy_host_keys(transport):
        """
        Remet ssh-rsa et ssh-dss dans les types de cle d'hote acceptes.

        Ils sont AJOUTES EN FIN de liste, pas en tete : un hote moderne
        continue ainsi de negocier rsa-sha2-512 ou ed25519, et seul un hote
        qui n'a rien d'autre — celui-ci — retombe sur ssh-rsa.

        Retourne la liste finale, ou None si la version de paramiko installee
        ne permet pas ce reglage. On ne leve pas : un echec ici doit produire
        un message clair au moment de la connexion, pas une trace a
        l'ouverture de la fenetre.
        """
        try:
            options = transport.get_security_options()
            actuels = list(options.key_types)
            manquants = [k for k in LEGACY_HOST_KEY_TYPES if k not in actuels]

            if manquants:
                options.key_types = tuple(actuels + manquants)

            return list(transport.get_security_options().key_types)
        except Exception:
            # API differente, ou algorithme retire du paramiko installe.
            return None

    def _ouvre(self, disabled_algorithms=None):
        """Une tentative : socket, poignee de main, authentification."""
        import paramiko

        key = self.load_key(self.key_path, self.passphrase)

        try:
            sock = socket.create_connection((self.host, self.port),
                                            self.connect_timeout)
        except OSError as error:
            raise TransportError("%s injoignable : %s" % (self.target, error))

        if disabled_algorithms:
            transport = paramiko.Transport(sock,
                                           disabled_algorithms=disabled_algorithms)
        else:
            transport = paramiko.Transport(sock)

        types = self.allow_legacy_host_keys(transport)

        if types is None or not any(t in types for t in LEGACY_HOST_KEY_TYPES):
            transport.close()
            raise TransportError(
                "paramiko %s ne permet pas d'accepter les cles d'hote %s, que "
                "cet appareil est seul a offrir"
                % (self.version(), "/".join(LEGACY_HOST_KEY_TYPES)))

        try:
            transport.start_client(timeout=self.connect_timeout)
        except Exception as error:
            transport.close()
            genre, conseil = classify_failure(str(error))
            raise TransportError("negociation avec %s impossible (%s) : %s\n  %s"
                                 % (self.target, genre, error, conseil))

        self.remote_version = getattr(transport, "remote_version", None)

        try:
            transport.auth_publickey(self.user, key)
        except Exception as error:
            transport.close()
            raise AuthError(str(error))

        return transport

    def connect(self):
        """
        Connexion, avec une seconde tentative sur le mur de signature.

        Cet appareil est un OpenSSH 6.7 : il n'accepte que des signatures
        `ssh-rsa`, et n'a aucun moyen de l'annoncer, l'extension
        `server-sig-algs` datant de la 7.2. paramiko propose `rsa-sha2-512`
        d'abord et se fait refuser — ce qui ressemble a une cle invalide alors
        que la meme cle passe en ligne de commande.

        On tente donc normalement, puis on recommence en interdisant les
        signatures RSA-SHA2. Dans cet ordre : un hote moderne doit continuer
        d'obtenir une signature moderne, et ne paie jamais la seconde
        tentative.
        """
        if self.transport is not None and self.transport.is_active():
            return True

        self.transport = None
        self.signature = None

        try:
            self.transport = self._ouvre()
            self.signature = "rsa-sha2 (moderne)"
        except AuthError as premier:
            try:
                self.transport = self._ouvre(
                    disabled_algorithms={"pubkeys": list(MODERN_PUBKEY_SIGNATURES)})
                self.signature = "ssh-rsa (SHA-1, repli pour serveur ancien)"
            except AuthError as second:
                raise TransportError(
                    "authentification refusee par %s.\n"
                    "  signature moderne : %s\n"
                    "  repli ssh-rsa     : %s\n"
                    "  %s"
                    % (self.target, premier, second, _CONSEILS[PANNE_AUTH]))

        cle_hote = self.transport.get_remote_server_key()
        self.negotiated = getattr(cle_hote, "get_name", lambda: "?")()
        return True

    def detail(self):
        """Ce que l'on sait de la liaison, pour un diagnostic sans devinette."""
        lignes = [
            "paramiko %s" % self.version(),
            "  hote           %s port %d" % (self.target, self.port),
            "  cle privee     %s" % (self.key_path or "aucune"),
            "  cles d'hote    defaut + %s" % ", ".join(LEGACY_HOST_KEY_TYPES),
        ]

        if self.remote_version:
            lignes.append("  serveur        %s" % self.remote_version)
        if self.negotiated:
            lignes.append("  cle d'hote     %s" % self.negotiated)
        if self.signature:
            lignes.append("  signature      %s" % self.signature)

        return "\n".join(lignes)

    def close(self):
        if self.transport is not None:
            self.transport.close()
            self.transport = None

    def _session(self, timeout):
        channel = self.transport.open_session(timeout=self.connect_timeout)
        channel.settimeout(timeout)
        # Les deux flux sont fusionnes : packcore lit un seul `stdout`, et les
        # messages d'erreur de l'appareil arrivent sur stderr.
        channel.set_combine_stderr(True)
        return channel

    def run(self, command, timeout=60):
        try:
            self.connect()
        except TransportError as error:
            return Result(255, str(error))

        try:
            channel = self._session(timeout)
            channel.exec_command(command)

            sortie = b""

            while True:
                morceau = channel.recv(BLOCK)
                if not morceau:
                    break
                sortie += morceau

            code = channel.recv_exit_status()
            channel.close()
        except Exception as error:
            return Result(255, "echec de la commande distante : %s" % error)

        return Result(code, sortie)

    def send_dir(self, local_dir, base, name=None, timeout=600, log=None):
        name = name or os.path.basename(os.path.normpath(local_dir))

        try:
            self.connect()
        except TransportError as error:
            return Result(255, str(error))

        try:
            channel = self._session(timeout)
            channel.exec_command("scp -rt '%s'" % base)

            scp_send_directory(channel, local_dir, name, log)

            channel.shutdown_write()
            reste = b""

            while True:
                morceau = channel.recv(BLOCK)
                if not morceau:
                    break
                reste += morceau

            code = channel.recv_exit_status()
            channel.close()
        except ScpError as error:
            return Result(1, "protocole SCP : %s" % error)
        except Exception as error:
            return Result(255, "echec du transfert : %s" % error)

        return Result(code, reste)

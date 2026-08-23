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
import subprocess

DEFAULT_HOST = "192.168.1.98"
DEFAULT_USER = "root"

# Droits poses sur ce qui est envoye. Les fichiers d'un pack sont lus par
# l'app, jamais executes.
DIR_MODE = "0755"
FILE_MODE = "0644"

BLOCK = 32768


class TransportError(Exception):
    """Panne de transport : connexion, authentification, protocole."""


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

    def __init__(self, host=DEFAULT_HOST, user=DEFAULT_USER, connect_timeout=10):
        self.host = host
        self.user = user
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

    def run(self, command, timeout=60):
        proc = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=%d" % self.connect_timeout,
             "-o", "BatchMode=yes", self.target, command],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)

        return Result(proc.returncode, proc.stdout)

    def send_dir(self, local_dir, base, name=None, timeout=600, log=None):
        name = name or os.path.basename(os.path.normpath(local_dir))

        # -O impose le protocole SCP historique. Sans lui, le scp recent passe
        # par SFTP, et le serveur SFTP de cet iOS 6 ne sait pas creer de
        # repertoire : « path canonicalization failed » des qu'on envoie un
        # dossier.
        proc = subprocess.run(
            ["scp", "-O", "-r", "-q",
             "-o", "ConnectTimeout=%d" % self.connect_timeout,
             "-o", "BatchMode=yes",
             local_dir, "%s:%s/%s" % (self.target, base, name)],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)

        return Result(proc.returncode, proc.stdout)


# ------------------------------------------------------------------ #
# Transport paramiko (Python pur, pour l'application Windows)         #
# ------------------------------------------------------------------ #

class ParamikoTransport(object):
    """
    SSH en Python pur. Aucun binaire suppose sur le poste.

    paramiko est importe A L'APPEL et non au chargement du module : packcore,
    packcli et les tests doivent pouvoir s'importer sur une machine qui ne
    l'a pas — c'est le cas de l'environnement de developpement de cet outil.
    """

    def __init__(self, host=DEFAULT_HOST, user=DEFAULT_USER, key_path=None,
                 port=22, passphrase=None, connect_timeout=10):
        self.host = host
        self.user = user
        self.key_path = key_path
        self.port = port
        self.passphrase = passphrase
        self.connect_timeout = connect_timeout
        self.client = None

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

        for classe in (paramiko.RSAKey, paramiko.Ed25519Key,
                       paramiko.ECDSAKey, paramiko.DSSKey):
            try:
                return classe.from_private_key_file(key_path, password=passphrase)
            except paramiko.PasswordRequiredException:
                raise TransportError(
                    "la cle %s est protegee par un mot de passe" % key_path)
            except Exception as error:      # type de cle non reconnu, on essaie le suivant
                erreurs.append("%s: %s" % (classe.__name__, error))

        raise TransportError(
            "cle privee illisible (%s) — formats essayes :\n  %s"
            % (key_path, "\n  ".join(erreurs)))

    def connect(self):
        import paramiko

        if self.client is not None:
            return True

        key = self.load_key(self.key_path, self.passphrase)
        client = paramiko.SSHClient()

        # Cet appareil est un 3GS sur un reseau local, reinstalle souvent :
        # son empreinte change, et refuser un hote inconnu rendrait l'outil
        # inutilisable apres chaque reinstallation. Le choix est assume et
        # borne a cet usage — voir NOTES.md.
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            client.connect(
                hostname=self.host, port=self.port, username=self.user,
                pkey=key, timeout=self.connect_timeout,
                allow_agent=False, look_for_keys=False,
                # Cet OpenSSH est ancien : ses algorithmes le sont aussi, et
                # paramiko recent les desactive par defaut.
                disabled_algorithms={"pubkeys": []})
        except Exception as error:
            client.close()
            raise TransportError("connexion a %s impossible : %s" % (self.target, error))

        self.client = client
        return True

    def close(self):
        if self.client is not None:
            self.client.close()
            self.client = None

    def run(self, command, timeout=60):
        try:
            self.connect()
        except TransportError as error:
            return Result(255, str(error))

        try:
            channel = self.client.get_transport().open_session(timeout=self.connect_timeout)
            channel.settimeout(timeout)
            # Les deux flux sont fusionnes : packcore lit un seul `stdout`, et
            # les messages d'erreur de l'appareil arrivent sur stderr.
            channel.set_combine_stderr(True)
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
            channel = self.client.get_transport().open_session(timeout=self.connect_timeout)
            channel.settimeout(timeout)
            channel.set_combine_stderr(True)
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

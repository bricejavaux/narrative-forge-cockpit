#!/usr/bin/env python3
"""
Gestion de la bibliotheque Luny — application de bureau, une seule fenetre.

Deux volets cote a cote : ce qu'il y a sur le poste, ce qu'il y a sur le 3GS,
et la difference entre les deux. Un seul bouton pour executer la selection.

Ce fichier ne contient que de l'interface. La validation, la conversion, la
protection du bundle et le refus de doublon restent dans `packcore`, deja
eprouve sur l'appareil ; le balayage et la comparaison sont dans
`packlibrary`, verifiables sans interface (voir tests/).

    python packgui_win.py

Regle a ne pas enfreindre, apprise a la dure sur la premiere version de cet
outil (tools/pack-transfer/NOTES.md) : **aucun appel a un widget depuis un fil
autre que le principal**. Tkinter n'est pas sur de ce point de vue, et la
panne qui en resulte est intermittente. Les fils de travail ne font que
deposer des ordres dans une file ; la boucle Tk la vide et agit.
"""

import os
import queue
import sys
import threading
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:
    sys.exit("tkinter est absent de cette installation de Python.")

import packconfig
import packcore
import packlibrary
import packtransport

# ------------------------------------------------------------------ #
# Palette                                                             #
# ------------------------------------------------------------------ #
#
# Reprise telle quelle de LunyTheme (theme sombre), dont les contrastes ont
# ete mesures pour l'app iOS. Aucune valeur n'est choisie a l'oeil ici : les
# reprendre a l'identique garde l'outil et l'appareil visiblement parents, et
# evite de refaire un travail de contraste deja fait.

FOND = "#0B1024"
CARTE = "#141A32"
ACCENT = "#F0B357"
TEXTE = "#C8D3F2"
TEXTE_VIF = "#E7ECFA"
TEXTE_DOUX = "#94A0C6"
SUCCES = "#8FC7A8"
ALERTE = "#D98FA6"

# Derivees, pour les seuls etats d'interaction. Assombrissement simple : la
# palette n'a pas de variante pressee, et en inventer une couleur pleine
# risquerait de sortir des contrastes mesures.
ACCENT_PRESSE = "#C8944A"
CARTE_SURVOL = "#1B2340"

POLICE = ("Segoe UI", 9)
POLICE_GRAS = ("Segoe UI", 9, "bold")
POLICE_TITRE = ("Segoe UI", 15, "bold")
POLICE_SOUS = ("Segoe UI", 8)

VIGNETTE = 44


def _pillow():
    try:
        from PIL import Image, ImageTk
    except ImportError:
        return None, None
    return Image, ImageTk


# ------------------------------------------------------------------ #
# Bouton plat a coins arrondis                                        #
# ------------------------------------------------------------------ #

class FlatButton(tk.Canvas):
    """
    Tkinter n'a pas de bouton a coins arrondis, et le bouton natif de Windows
    impose son propre relief — impossible a plat. Il est donc dessine : un
    rectangle arrondi et un libelle sur un canevas.

    Aucun degrade, aucun relief : seule la teinte change au contact, comme
    « Choisir » et « Debut » dans l'app iOS.
    """

    RAYON = 6

    def __init__(self, master, text, command, fill=ACCENT, fg=FOND,
                 width=170, height=30, font=POLICE_GRAS, **kw):
        tk.Canvas.__init__(self, master, width=width, height=height,
                           highlightthickness=0, bd=0, bg=master["bg"], **kw)
        self._command = command
        self._fill = fill
        self._fg = fg
        self._enabled = True
        self._font = font
        self._text = text

        # PAS `self._w` ni `self._h` : `_w` est le nom Tcl interne du widget
        # dans tkinter.Misc. L'ecraser remplace le chemin du widget par un
        # entier, et le premier appel venu echoue en « invalid command name
        # "90" » — panne constatee au premier lancement, sur tous les boutons.
        self._largeur = width
        self._hauteur = height

        self.bind("<Button-1>", self._press)
        self.bind("<ButtonRelease-1>", self._release)
        self.bind("<Leave>", lambda _e: self._draw(self._fill))

        self._draw(self._fill)

    def _rounded(self, fill):
        r = self.RAYON
        w, h = self._largeur, self._hauteur

        # Un rectangle arrondi se compose de deux rectangles croises et de
        # quatre quarts de disque : `create_polygon` avec smooth deformerait
        # les cotes droits.
        self.create_rectangle(r, 0, w - r, h, fill=fill, outline=fill)
        self.create_rectangle(0, r, w, h - r, fill=fill, outline=fill)

        for x, y in ((0, 0), (w - 2 * r, 0), (0, h - 2 * r), (w - 2 * r, h - 2 * r)):
            self.create_oval(x, y, x + 2 * r, y + 2 * r, fill=fill, outline=fill)

    def _draw(self, fill):
        self.delete("all")

        if not self._enabled:
            fill = CARTE
            couleur = TEXTE_DOUX
        else:
            couleur = self._fg

        self._rounded(fill)
        self.create_text(self._largeur / 2, self._hauteur / 2, text=self._text,
                         fill=couleur, font=self._font)

    def _press(self, _event):
        if self._enabled:
            self._draw(ACCENT_PRESSE if self._fill == ACCENT else CARTE_SURVOL)

    def _release(self, _event):
        if not self._enabled:
            return

        self._draw(self._fill)

        if self._command:
            self._command()

    def set_text(self, text):
        self._text = text
        self._draw(self._fill)

    def set_enabled(self, enabled):
        self._enabled = bool(enabled)
        self._draw(self._fill)


# ------------------------------------------------------------------ #
# Zone de liste defilante                                             #
# ------------------------------------------------------------------ #

class ScrollArea(tk.Frame):
    """Un canevas et sa barre : Tkinter n'a pas de conteneur defilant tout fait."""

    def __init__(self, master, bg=CARTE):
        tk.Frame.__init__(self, master, bg=bg)

        self.canvas = tk.Canvas(self, bg=bg, highlightthickness=0, bd=0)
        self.bar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.bar.set)

        self.bar.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)

        self.body = tk.Frame(self.canvas, bg=bg)
        self._window = self.canvas.create_window((0, 0), window=self.body, anchor="nw")

        self.body.bind("<Configure>", self._on_body)
        self.canvas.bind("<Configure>", self._on_canvas)
        self.canvas.bind("<Enter>", lambda _e: self._bind_wheel(True))
        self.canvas.bind("<Leave>", lambda _e: self._bind_wheel(False))

    def _on_body(self, _event):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _on_canvas(self, event):
        # Les lignes doivent occuper toute la largeur : sans cela le canevas
        # garde la largeur naturelle du contenu et laisse une bande vide.
        self.canvas.itemconfigure(self._window, width=event.width)

    def _bind_wheel(self, on):
        if on:
            self.canvas.bind_all("<MouseWheel>", self._wheel)
        else:
            self.canvas.unbind_all("<MouseWheel>")

    def _wheel(self, event):
        self.canvas.yview_scroll(int(-event.delta / 120), "units")

    def clear(self):
        for child in self.body.winfo_children():
            child.destroy()


# ------------------------------------------------------------------ #
# Application                                                         #
# ------------------------------------------------------------------ #

class Application(tk.Frame):

    def __init__(self, master):
        tk.Frame.__init__(self, master, bg=FOND)
        self.pack(fill="both", expand=True)

        self.config_values = packconfig.load()
        self.queue = queue.Queue()
        self.busy = False
        self.alive = True

        self.local_packs = []
        self.remote_packs = []
        self.rows = []

        self.send_vars = {}        # cle -> BooleanVar
        self.delete_vars = {}      # cle -> BooleanVar

        # Choix EXPLICITES de l'utilisateur, distincts de la pre-selection
        # automatique. Alimentes par le `command` des cases, qui ne se
        # declenche qu'a un vrai clic — contrairement a une trace de variable,
        # qui se declenche aussi quand le programme ecrit dedans.
        self.user_send = {}
        self.user_delete = {}
        self._images = []          # references : sans elles Tk libere les images

        self.build_root = os.path.join(packconfig.app_dir(), "build")
        self.cache_dir = os.path.join(packconfig.app_dir(), "cache")

        self._apply_runtime_config()
        self._build()

        # Le premier inventaire part APRES l'affichage, jamais depuis la
        # construction : une version precedente ouvrait une connexion SSH
        # avant que la boucle Tk existe. Voir NOTES.md.
        self.after(400, self.refresh_remote)
        self.after(80, self._drain)
        self._announce()

    def _announce(self):
        """
        Dit d'emblee ce qui est REELLEMENT actif.

        Les deux replis de cet outil — transport systeme faute de paramiko,
        ffmpeg du PATH faute de binaire embarque — sont silencieux par
        construction. Silencieux et invisibles, ils produiraient plus tard une
        panne incomprehensible : « pourquoi ce pack n'est-il pas converti ? ».
        """
        transport = packcore.default_transport()
        self.log("transport : %s" % transport.describe(), TEXTE_DOUX)

        if isinstance(transport, packtransport.SystemTransport):
            cle = (self.config_values.get("key_path") or "").strip()

            if cle and not packtransport.ParamikoTransport.available():
                self.log("  paramiko absent : repli sur les binaires ssh/scp "
                         "du systeme, la cle renseignee est ignoree", ALERTE)
            elif not cle:
                self.log("  aucune cle renseignee : repli sur la configuration "
                         "ssh du systeme", TEXTE_DOUX)

        binaire = packcore.ffmpeg_path()

        if binaire is None:
            self.log("ffmpeg introuvable : les .ogg et .bmp seront transferes "
                     "tels quels, donc muets ou illisibles sur l'appareil", ALERTE)
        else:
            embarque = packconfig.ffmpeg_binary()
            self.log("ffmpeg : %s%s" % (binaire, "" if embarque else "  (du PATH)"),
                     TEXTE_DOUX)

        if _pillow()[0] is None:
            self.log("Pillow absent : vignettes remplacees par l'initiale du titre",
                     TEXTE_DOUX)

    # -------------------------------------------------------------- #
    # Reglages                                                        #
    # -------------------------------------------------------------- #

    def _apply_runtime_config(self):
        """Branche packcore sur le ffmpeg embarque et le transport choisi."""
        embarque = packconfig.ffmpeg_binary()

        if embarque:
            packcore.FFMPEG_BINARY = embarque

        packcore.HOST = self.config_values["host"]
        packcore.TRANSPORT = self._make_transport()

    def _make_transport(self):
        """
        paramiko si disponible ET si une cle est renseignee ; sinon les
        binaires du systeme.

        Ce repli n'est pas un detail : il laisse l'outil utilisable depuis les
        sources sous Linux, ou paramiko peut manquer, sans rien changer au
        comportement historique.
        """
        cle = (self.config_values.get("key_path") or "").strip()

        if cle and packtransport.ParamikoTransport.available():
            return packtransport.ParamikoTransport(
                host=self.config_values["host"],
                user=self.config_values["user"],
                key_path=cle,
                port=int(self.config_values.get("port") or 22))

        return packtransport.SystemTransport(
            host=self.config_values["host"], user=self.config_values["user"])

    def _save_config(self):
        self.config_values["host"] = self.host_var.get().strip() or "192.168.1.98"
        self.config_values["user"] = self.user_var.get().strip() or "root"
        self.config_values["key_path"] = self.key_var.get().strip()
        self.config_values["target"] = self.target_var.get()

        message = packconfig.save(self.config_values)

        if message:
            self.log(message, ALERTE)
        else:
            self.log("reglages enregistres dans %s" % packconfig.config_path(), TEXTE_DOUX)

        self._apply_runtime_config()

    # -------------------------------------------------------------- #
    # Construction de la fenetre                                      #
    # -------------------------------------------------------------- #

    def _build(self):
        self._build_header()
        self._build_settings()

        volets = tk.Frame(self, bg=FOND)
        volets.pack(fill="both", expand=True, padx=12, pady=(8, 4))

        self.left = self._build_pane(volets, "Bibliotheque locale", "left")
        self.right = self._build_pane(volets, "Sur l'appareil", "right")

        self._build_footer()

    def _card(self, master):
        return tk.Frame(master, bg=CARTE, highlightthickness=0, bd=0)

    def _build_header(self):
        header = tk.Frame(self, bg=FOND, height=64)
        header.pack(fill="x", padx=12, pady=(10, 4))

        texte = tk.Frame(header, bg=FOND)
        texte.pack(side="left", anchor="w")

        tk.Label(texte, text="Bibliotheque Luny", bg=FOND, fg=TEXTE_VIF,
                 font=POLICE_TITRE).pack(anchor="w")
        tk.Label(texte, text="poste de travail  ↔  iPhone 3GS", bg=FOND,
                 fg=TEXTE_DOUX, font=POLICE_SOUS).pack(anchor="w")

        # Filigrane : l'illustration deja produite pour l'icone et le fond de
        # l'app. Melangee vers le fond, comme sur l'ecran Bibliotheque, pour
        # rester un decor et non un element qui gene la lecture des listes.
        image = self._header_artwork()

        if image is not None:
            tk.Label(header, image=image, bg=FOND, bd=0).pack(side="right")

    def _header_artwork(self):
        Image, ImageTk = _pillow()
        chemin = packconfig.artwork_path()

        if Image is None or not chemin:
            return None

        try:
            source = Image.open(chemin).convert("RGB")
            largeur, hauteur = 200, 56

            # Recadrage sur la BANDE HAUTE de l'illustration : c'est la que se
            # trouvent la lune et les etoiles. Un simple redimensionnement
            # ecraserait un portrait 2:3 en bandeau et rendrait la scene
            # meconnaissable.
            ratio = largeur / float(hauteur)
            h_source = int(source.width / ratio)
            source = source.crop((0, 0, source.width, min(h_source, source.height)))
            source = source.resize((largeur, hauteur), Image.LANCZOS)

            fond = Image.new("RGB", source.size, FOND)
            melange = Image.blend(fond, source, 0.35)

            photo = ImageTk.PhotoImage(melange)
            self._images.append(photo)
            return photo
        except Exception:
            # Un decor absent ne doit jamais empecher l'outil de demarrer.
            return None

    def _build_settings(self):
        barre = self._card(self)
        barre.pack(fill="x", padx=12, pady=4)

        inner = tk.Frame(barre, bg=CARTE)
        inner.pack(fill="x", padx=10, pady=8)

        self.host_var = tk.StringVar(value=self.config_values["host"])
        self.user_var = tk.StringVar(value=self.config_values["user"])
        self.key_var = tk.StringVar(value=self.config_values["key_path"])
        self.target_var = tk.StringVar(value=self.config_values["target"])

        def champ(parent, libelle, variable, largeur):
            tk.Label(parent, text=libelle, bg=CARTE, fg=TEXTE_DOUX,
                     font=POLICE_SOUS).pack(side="left", padx=(0, 4))
            entree = tk.Entry(parent, textvariable=variable, width=largeur,
                              bg=FOND, fg=TEXTE, insertbackground=TEXTE,
                              relief="flat", font=POLICE,
                              highlightthickness=1, highlightbackground=FOND,
                              highlightcolor=ACCENT)
            entree.pack(side="left", padx=(0, 12), ipady=3)
            return entree

        champ(inner, "Appareil", self.host_var, 15)
        champ(inner, "Utilisateur", self.user_var, 8)
        champ(inner, "Cle privee", self.key_var, 34)

        FlatButton(inner, "Parcourir…", self._choose_key, fill=CARTE_SURVOL,
                   fg=TEXTE, width=90, height=26).pack(side="left", padx=(0, 12))

        tk.Label(inner, text="Destination", bg=CARTE, fg=TEXTE_DOUX,
                 font=POLICE_SOUS).pack(side="left", padx=(0, 4))

        for cle in sorted(packcore.TARGETS):
            tk.Radiobutton(inner, text=cle, value=cle, variable=self.target_var,
                           bg=CARTE, fg=TEXTE, selectcolor=FOND,
                           activebackground=CARTE, activeforeground=ACCENT,
                           font=POLICE_SOUS, bd=0, highlightthickness=0).pack(side="left")

        FlatButton(inner, "Enregistrer", self._save_config, fill=CARTE_SURVOL,
                   fg=TEXTE, width=94, height=26).pack(side="right")

    def _build_pane(self, master, titre, side):
        carte = self._card(master)
        carte.pack(side=side, fill="both", expand=True,
                   padx=(0, 6) if side == "left" else (6, 0))

        entete = tk.Frame(carte, bg=CARTE)
        entete.pack(fill="x", padx=10, pady=(8, 4))

        tk.Label(entete, text=titre, bg=CARTE, fg=TEXTE_VIF,
                 font=POLICE_GRAS).pack(side="left")

        compteur = tk.Label(entete, text="", bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS)
        compteur.pack(side="right")

        actions = tk.Frame(carte, bg=CARTE)
        actions.pack(fill="x", padx=10, pady=(0, 6))

        if side == "left":
            FlatButton(actions, "Choisir un dossier…", self.choose_local,
                       width=150, height=28).pack(side="left")
            self.local_dir_label = tk.Label(
                actions, text=self.config_values["last_local_dir"] or "aucun dossier",
                bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS, anchor="w")
            self.local_dir_label.pack(side="left", padx=8, fill="x", expand=True)
        else:
            FlatButton(actions, "Rafraichir", self.refresh_remote,
                       fill=CARTE_SURVOL, fg=TEXTE, width=110, height=28).pack(side="left")

        zone = ScrollArea(carte)
        zone.pack(fill="both", expand=True, padx=6, pady=(0, 8))

        if side == "left":
            self.left_count = compteur
            self.left_area = zone
        else:
            self.right_count = compteur
            self.right_area = zone

        return carte

    def _build_footer(self):
        pied = self._card(self)
        pied.pack(fill="x", padx=12, pady=(4, 10))

        haut = tk.Frame(pied, bg=CARTE)
        haut.pack(fill="x", padx=10, pady=(8, 4))

        self.summary_label = tk.Label(haut, text="rien de selectionne", bg=CARTE,
                                      fg=TEXTE, font=POLICE, anchor="w")
        self.summary_label.pack(side="left", fill="x", expand=True)

        self.go_button = FlatButton(haut, "Go — transferer la selection",
                                    self.execute, width=210, height=32)
        self.go_button.pack(side="right")

        # ttk n'obeit pas aux couleurs sans passer par un theme modifiable :
        # « clam » est le seul livre partout qui accepte une teinte de barre.
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Luny.Horizontal.TProgressbar", troughcolor=FOND,
                        background=ACCENT, bordercolor=FOND,
                        lightcolor=ACCENT, darkcolor=ACCENT)

        self.progress = ttk.Progressbar(pied, style="Luny.Horizontal.TProgressbar",
                                        mode="determinate", maximum=100)
        self.progress.pack(fill="x", padx=10, pady=(2, 2))

        self.status_label = tk.Label(pied, text="", bg=CARTE, fg=TEXTE_DOUX,
                                     font=POLICE_SOUS, anchor="w")
        self.status_label.pack(fill="x", padx=10, pady=(0, 4))

        self.journal = tk.Text(pied, height=9, bg=FOND, fg=TEXTE, relief="flat",
                               font=("Consolas", 8), wrap="word",
                               highlightthickness=0, bd=0)
        self.journal.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.journal.configure(state="disabled")

        for nom, couleur in (("accent", ACCENT), ("succes", SUCCES),
                             ("alerte", ALERTE), ("doux", TEXTE_DOUX)):
            self.journal.tag_configure(nom, foreground=couleur)

    # -------------------------------------------------------------- #
    # Journal et file                                                 #
    # -------------------------------------------------------------- #

    def log(self, message, couleur=None):
        """Depose une ligne. Appelable depuis n'importe quel fil."""
        self.queue.put(("log", (message, couleur)))

    def status(self, message):
        self.queue.put(("status", message))

    def progress_to(self, done, total):
        self.queue.put(("progress", (done, total)))

    def shutdown(self):
        """
        Arrete la boucle de vidage. A appeler avant de detruire la fenetre.

        Sans cela le rappel `after` continue de se reprogrammer sur un widget
        en cours de destruction, et Tcl finit par se plaindre d'un « async
        handler deleted by the wrong thread » — panne constatee en enchainant
        plusieurs montages dans une meme session de tests.

        Les variables Tk sont relachees ICI, tant que l'interpreteur Tcl vit
        encore. Gardees jusqu'a la fin du programme, chaque `BooleanVar` se
        finalise apres la disparition de la boucle et sort un « main thread is
        not in main loop » a l'arret — bruyant, et pour certaines versions de
        Tcl, fatal.
        """
        self.alive = False
        self.send_vars = {}
        self.delete_vars = {}
        self._images = []

        # Balayage generique plutot qu'une liste a tenir a jour : la prochaine
        # variable ajoutee a l'interface reintroduirait sinon le defaut sans
        # que personne y pense.
        for nom, valeur in list(self.__dict__.items()):
            if isinstance(valeur, tk.Variable):
                setattr(self, nom, None)

    def _drain(self):
        """Vide la file cote fil principal. Seul endroit qui touche un widget."""
        if not self.alive or not self.winfo_exists():
            # Fenetre fermee alors qu'un rappel restait programme : sans ce
            # garde, Tk se plaint dans une « after script » et la trace fait
            # croire a une panne.
            return

        try:
            while True:
                genre, charge = self.queue.get_nowait()

                if genre == "log":
                    self._write(*charge)
                elif genre == "status":
                    self.status_label.configure(text=charge)
                elif genre == "progress":
                    done, total = charge
                    self.progress.configure(
                        value=(100.0 * done / total) if total else 0)
                elif genre == "call":
                    charge()
        except queue.Empty:
            pass
        except tk.TclError:
            return      # fenetre detruite entre-temps

        self.after(80, self._drain)

    def _write(self, message, couleur):
        tag = {ACCENT: "accent", SUCCES: "succes",
               ALERTE: "alerte", TEXTE_DOUX: "doux"}.get(couleur)

        self.journal.configure(state="normal")
        self.journal.insert("end", message + "\n", (tag,) if tag else ())
        self.journal.see("end")
        self.journal.configure(state="disabled")

    def call_on_main(self, fonction):
        self.queue.put(("call", fonction))

    def _core_log(self, message):
        """
        Rappel remis a packcore. La couleur distingue au premier coup d'oeil
        un pack converti d'un pack passe tel quel, ce que le journal texte de
        packcli ne faisait que par les mots.
        """
        bas = message.lower()

        if "converti" in bas:
            self.log(message, ACCENT)
        elif "echec" in bas or "attention" in bas or "ignore" in bas:
            self.log(message, ALERTE)
        elif "ok" in bas:
            self.log(message, SUCCES)
        else:
            self.log(message)

    # -------------------------------------------------------------- #
    # Travail de fond                                                 #
    # -------------------------------------------------------------- #

    def _work(self, fonction):
        if self.busy:
            self.log("une operation est deja en cours", ALERTE)
            return

        self.busy = True
        self.call_on_main(lambda: self.go_button.set_enabled(False))

        def enveloppe():
            try:
                fonction()
            except Exception:
                for ligne in traceback.format_exc().splitlines():
                    self.log(ligne, ALERTE)
            finally:
                self.busy = False
                self.call_on_main(lambda: self.go_button.set_enabled(True))

        threading.Thread(target=enveloppe, daemon=True).start()

    # -------------------------------------------------------------- #
    # Bibliotheque locale                                             #
    # -------------------------------------------------------------- #

    def _choose_key(self):
        chemin = filedialog.askopenfilename(title="Fichier de cle privee")

        if chemin:
            self.key_var.set(chemin)

    def choose_local(self):
        dossier = filedialog.askdirectory(title="Dossier contenant les packs")

        if not dossier:
            return

        self.config_values["last_local_dir"] = dossier
        packconfig.save(self.config_values)
        self.local_dir_label.configure(text=dossier)
        self.scan_local(dossier)

    def scan_local(self, dossier):
        def travail():
            self.status("balayage de %s" % dossier)
            packs = packlibrary.scan_local(dossier, self._core_log)
            self.local_packs = packs
            self.call_on_main(self.rebuild_rows)
            self.status("")

        self._work(travail)

    def refresh_remote(self):
        def travail():
            self.status("inventaire de l'appareil…")

            if not packcore.device_reachable(self._core_log):
                self.remote_packs = []
                self.call_on_main(self.rebuild_rows)
                self.status("appareil injoignable")
                return

            rows = packcore.remote_inventory()
            self.remote_packs = packlibrary.remote_packs_from_rows(rows)
            self.log("appareil : %d pack(s)" % len(self.remote_packs), TEXTE_DOUX)
            self.call_on_main(self.rebuild_rows)
            self.status("")

        self._work(travail)

    # -------------------------------------------------------------- #
    # Rendu des deux volets                                           #
    # -------------------------------------------------------------- #

    def rebuild_rows(self):
        self.rows = packlibrary.build_diff(self.local_packs, self.remote_packs)

        # La pre-selection est RECALCULEE a chaque reconstruction, et seuls
        # les choix explicites de l'utilisateur sont reportes.
        #
        # Reporter l'etat des cases, comme le faisait la premiere version,
        # rendait collante une pre-selection automatique : un pack choisi
        # pendant que l'inventaire distant chargeait encore restait coche une
        # fois decouvert present sur l'appareil, donc pre-selectionne pour un
        # ecrasement que personne n'avait demande. Constate par le test de
        # montage.
        self.send_vars = {}
        self.delete_vars = {}
        self._images = [i for i in self._images[:1]]   # on garde le filigrane

        self.left_area.clear()
        self.right_area.clear()

        gauche = droite = 0

        for row in self.rows:
            if row.local is not None:
                self._local_row(row)
                gauche += 1

            for remote in row.remotes:
                self._remote_row(row, remote)
                droite += 1

        self.left_count.configure(text="%d pack(s)" % gauche)
        self.right_count.configure(text="%d pack(s)" % droite)
        self.update_summary()

    def _row_frame(self, parent):
        cadre = tk.Frame(parent, bg=CARTE)
        cadre.pack(fill="x", padx=4, pady=2)
        return cadre

    def _thumb(self, parent, data, titre, accent):
        """Vignette de couverture, ou initiale — jamais une case vide."""
        Image, ImageTk = _pillow()

        if data and Image is not None:
            try:
                import io
                image = Image.open(io.BytesIO(data)).convert("RGB")
                image = image.resize((VIGNETTE, VIGNETTE), Image.LANCZOS)
                photo = ImageTk.PhotoImage(image)
                self._images.append(photo)
                return tk.Label(parent, image=photo, bg=CARTE, bd=0)
            except Exception:
                pass

        # Repli : l'initiale, calculee comme la tuile de l'app.
        toile = tk.Canvas(parent, width=VIGNETTE, height=VIGNETTE, bg=CARTE,
                          highlightthickness=0, bd=0)
        toile.create_rectangle(0, 0, VIGNETTE, VIGNETTE, fill=FOND, outline=FOND)
        toile.create_text(VIGNETTE / 2, VIGNETTE / 2,
                          text=packlibrary.cover_initial(titre),
                          fill=accent, font=("Segoe UI", 18, "bold"))
        return toile

    def _local_row(self, row):
        pack = row.local
        cadre = self._row_frame(self.left_area.body)

        variable = tk.BooleanVar(
            value=self.user_send.get(row.key, row.preselect_send))
        self.send_vars[row.key] = variable

        def choisi(cle=row.key, var=variable):
            self.user_send[cle] = var.get()
            self.update_summary()

        case = tk.Checkbutton(cadre, variable=variable, command=choisi,
                              bg=CARTE, fg=TEXTE,
                              selectcolor=FOND, activebackground=CARTE,
                              bd=0, highlightthickness=0)
        case.pack(side="left")

        if not pack.valid:
            case.configure(state="disabled")

        self._thumb(cadre, packlibrary.read_cover_bytes(pack),
                    pack.title, ACCENT).pack(side="left", padx=6)

        texte = tk.Frame(cadre, bg=CARTE)
        texte.pack(side="left", fill="x", expand=True)

        tk.Label(texte, text=pack.title, bg=CARTE, fg=TEXTE_VIF, font=POLICE_GRAS,
                 anchor="w").pack(fill="x")

        couleur = ALERTE if not pack.valid else (
            ACCENT if pack.needs_conversion else SUCCES)

        detail = "%s · %s · %d noeud(s)" % (pack.kind, pack.state_label, pack.node_count)
        tk.Label(texte, text=detail, bg=CARTE, fg=couleur, font=POLICE_SOUS,
                 anchor="w").pack(fill="x")

        tk.Label(texte, text=row.note, bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS,
                 anchor="w").pack(fill="x")

    def _remote_row(self, row, remote):
        cadre = self._row_frame(self.right_area.body)
        cle = "%s@%s" % (row.key, remote.location)

        # Une suppression n'est jamais pre-cochee : le defaut est False, et
        # seul un clic peut le changer.
        variable = tk.BooleanVar(value=self.user_delete.get(cle, False))
        self.delete_vars[cle] = variable

        def choisi(k=cle, var=variable):
            self.user_delete[k] = var.get()
            self.update_summary()

        case = tk.Checkbutton(cadre, variable=variable, command=choisi,
                              bg=CARTE, fg=TEXTE,
                              selectcolor=FOND, activebackground=CARTE,
                              bd=0, highlightthickness=0)
        case.pack(side="left")

        if remote.protected:
            case.configure(state="disabled")

        self._thumb(cadre, self._cached_cover(row.key), remote.name,
                    TEXTE_DOUX if remote.protected else ACCENT).pack(side="left", padx=6)

        texte = tk.Frame(cadre, bg=CARTE)
        texte.pack(side="left", fill="x", expand=True)

        tk.Label(texte, text=remote.name, bg=CARTE, fg=TEXTE_VIF, font=POLICE_GRAS,
                 anchor="w").pack(fill="x")

        couleur = TEXTE_DOUX if remote.protected else TEXTE
        tk.Label(texte, text="%s · %s · %s" % (remote.location, remote.state_label,
                                               packcore.human(remote.size)),
                 bg=CARTE, fg=couleur, font=POLICE_SOUS, anchor="w").pack(fill="x")

    # -------------------------------------------------------------- #
    # Cache de vignettes                                              #
    # -------------------------------------------------------------- #

    def _cache_file(self, key):
        sur = "".join(c if c.isalnum() or c in "-_" else "_" for c in key)
        return os.path.join(self.cache_dir, sur + ".bin")

    def _cached_cover(self, key):
        chemin = self._cache_file(key)

        if not os.path.isfile(chemin):
            return None

        try:
            with open(chemin, "rb") as handle:
                return handle.read()
        except OSError:
            return None

    def _remember_cover(self, key, data):
        """
        Garde la couverture d'un pack envoye depuis cet outil, pour que le
        volet droit puisse l'afficher au prochain lancement. L'appareil, lui,
        ne renvoie jamais d'image : sans ce cache le volet droit ne pourrait
        montrer qu'une initiale.
        """
        if not data:
            return

        try:
            os.makedirs(self.cache_dir, exist_ok=True)

            with open(self._cache_file(key), "wb") as handle:
                handle.write(data)
        except OSError:
            pass

    # -------------------------------------------------------------- #
    # Recapitulatif et execution                                      #
    # -------------------------------------------------------------- #

    def _selection(self):
        envois = {k for k, v in self.send_vars.items() if v.get()}
        supprs = {k.split("@")[0] for k, v in self.delete_vars.items() if v.get()}
        return envois, supprs

    def update_summary(self):
        envois, supprs = self._selection()
        resume = packlibrary.summarise(self.rows, envois, supprs)
        self.summary_label.configure(text=packlibrary.summary_text(resume))

    def execute(self):
        envois, supprs = self._selection()
        resume = packlibrary.summarise(self.rows, envois, supprs)

        if not resume["envois"] and not resume["suppressions"]:
            self.log("rien de selectionne", TEXTE_DOUX)
            return

        # Une seule confirmation pour toute l'operation : le flux principal
        # doit rester dans une fenetre. Elle nomme les suppressions une par
        # une — une suppression ne doit jamais se cacher derriere un chiffre.
        lignes = [packlibrary.summary_text(resume), ""]

        if resume["lignes_suppression"]:
            lignes.append("Seront SUPPRIMES de l'appareil :")
            for row in resume["lignes_suppression"]:
                for remote in row.deletable_remotes:
                    lignes.append("   • %s (%s)" % (remote.name, remote.location))
            lignes.append("")

        if resume["lignes_protegees"]:
            lignes.append("Ignores car livres avec l'application :")
            for row in resume["lignes_protegees"]:
                lignes.append("   • %s" % row.title)
            lignes.append("")

        lignes.append("Continuer ?")

        if not messagebox.askyesno("Confirmer", "\n".join(lignes)):
            self.log("operation annulee", TEXTE_DOUX)
            return

        cible = self.target_var.get()
        self._work(lambda: self._run(resume, cible))

    def _run(self, resume, cible):
        import tempfile

        envois = resume["lignes_envoi"]
        supprs = resume["lignes_suppression"]
        total = len(envois) + len(supprs)
        fait = 0

        self.progress_to(0, total)

        if not packcore.device_reachable(self._core_log):
            self.status("appareil injoignable")
            return

        for row in envois:
            pack = row.local
            self.status("« %s » — preparation" % pack.title)
            self.log("", None)
            self.log("=== %s ===" % pack.title, TEXTE_VIF)

            with tempfile.TemporaryDirectory() as travail:
                if pack.kind == "zip":
                    self.status("« %s » — extraction de l'archive" % pack.title)
                    source = packcore.extract_zip(pack.source_path, travail, self._core_log)

                    if source is None:
                        fait += 1
                        self.progress_to(fait, total)
                        continue
                else:
                    source = pack.source_path

                if pack.needs_conversion:
                    self.status("« %s » — conversion de %d fichier(s)"
                                % (pack.title, len(pack.to_convert)))
                else:
                    self.status("« %s » — copie sans conversion" % pack.title)

                construit = packcore.convert_pack(source, self.build_root, self._core_log)

                if construit is None:
                    self.log("pack refuse a la validation, rien n'a ete envoye", ALERTE)
                    fait += 1
                    self.progress_to(fait, total)
                    continue

                self.status("« %s » — transfert vers l'appareil" % pack.title)

                if packcore.remote_send(construit, cible, self._core_log):
                    self._remember_cover(row.key, packlibrary.read_cover_bytes(pack))
                    marque = "converti" if pack.needs_conversion else "tel quel"
                    self.log("OK — %s (%s)" % (pack.title, marque),
                             ACCENT if pack.needs_conversion else SUCCES)

            fait += 1
            self.progress_to(fait, total)

        for row in supprs:
            for remote in row.deletable_remotes:
                self.status("suppression de « %s »" % remote.name)
                packcore.remote_delete(remote.name, remote.location, self._core_log)

            fait += 1
            self.progress_to(fait, total)

        if envois or supprs:
            packcore.remote_uicache(self._core_log)

        self.status("termine")
        rows = packcore.remote_inventory()
        self.remote_packs = packlibrary.remote_packs_from_rows(rows)
        self.call_on_main(self.rebuild_rows)


def main():
    racine = tk.Tk()
    racine.title("Bibliotheque Luny")
    racine.configure(bg=FOND)
    racine.geometry("1080x760")
    racine.minsize(900, 640)

    try:
        Application(racine)
    except Exception:
        traceback.print_exc()
        raise

    racine.mainloop()


if __name__ == "__main__":
    main()

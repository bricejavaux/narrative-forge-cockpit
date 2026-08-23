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
import packimage
import packlibrary
import packproc
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
    """
    Pillow, s'il est installe — pour les VIGNETTES uniquement.

    Le decor de l'en-tete ne passe plus par ici : il est calcule par
    `packimage`, en Python pur, precisement parce que l'absence de Pillow le
    faisait disparaitre sans un mot. Les couvertures de packs, elles, sont
    souvent des JPEG : ecrire un decodeur JPEG a la main serait deraisonnable,
    et leur repli — l'initiale du titre — est visible et deja en place.
    """
    try:
        from PIL import Image, ImageTk
    except ImportError:
        return None, None
    return Image, ImageTk


# ------------------------------------------------------------------ #
# Icones                                                              #
# ------------------------------------------------------------------ #
#
# Dessinees au trait sur le canevas, et non ecrites avec des caracteres
# Unicode : rien ne garantit qu'une police Windows donnee possede le glyphe
# voulu, et un caractere manquant s'affiche en rectangle vide — pire que pas
# d'icone du tout. Le trait, lui, est toujours rendu.
#
# Aucun relief, aucun degrade : le meme style plat que le reste.

def draw_icon(canvas, nom, cx, cy, taille=13, couleur="#FFFFFF", tags=()):
    """Pose une icone centree sur (cx, cy), inscrite dans un carre `taille`."""
    r = taille / 2.0
    e = max(1, int(round(taille / 9.0)))       # epaisseur du trait

    if nom == "dossier":
        canvas.create_line(cx - r, cy - r * 0.55, cx - r * 0.15, cy - r * 0.55,
                           cx + r * 0.05, cy - r * 0.15, fill=couleur, width=e,
                           tags=tags)
        canvas.create_rectangle(cx - r, cy - r * 0.15, cx + r, cy + r * 0.7,
                                outline=couleur, width=e, tags=tags)
    elif nom == "corbeille":
        canvas.create_line(cx - r, cy - r * 0.55, cx + r, cy - r * 0.55,
                           fill=couleur, width=e, tags=tags)
        canvas.create_line(cx - r * 0.35, cy - r * 0.55, cx - r * 0.35, cy - r,
                           cx + r * 0.35, cy - r, cx + r * 0.35, cy - r * 0.55,
                           fill=couleur, width=e, tags=tags)
        canvas.create_line(cx - r * 0.75, cy - r * 0.35, cx - r * 0.55, cy + r,
                           cx + r * 0.55, cy + r, cx + r * 0.75, cy - r * 0.35,
                           fill=couleur, width=e, tags=tags)
    elif nom == "fleche":
        canvas.create_line(cx - r, cy, cx + r * 0.3, cy, fill=couleur, width=e,
                           tags=tags)
        canvas.create_polygon(cx + r, cy, cx + r * 0.2, cy - r * 0.55,
                              cx + r * 0.2, cy + r * 0.55,
                              fill=couleur, outline=couleur, tags=tags)
    elif nom == "rafraichir":
        canvas.create_arc(cx - r, cy - r, cx + r, cy + r, start=35, extent=290,
                          style="arc", outline=couleur, width=e, tags=tags)
        canvas.create_polygon(cx + r, cy - r * 0.25, cx + r * 0.35, cy - r * 0.45,
                              cx + r * 0.95, cy + r * 0.45,
                              fill=couleur, outline=couleur, tags=tags)
    elif nom == "plus":
        canvas.create_line(cx - r * 0.6, cy, cx + r * 0.6, cy, fill=couleur,
                           width=e + 1, tags=tags)
        canvas.create_line(cx, cy - r * 0.6, cx, cy + r * 0.6, fill=couleur,
                           width=e + 1, tags=tags)
    elif nom == "moins":
        canvas.create_line(cx - r * 0.6, cy, cx + r * 0.6, cy, fill=couleur,
                           width=e + 1, tags=tags)
    elif nom == "coche":
        canvas.create_line(cx - r * 0.6, cy, cx - r * 0.1, cy + r * 0.5,
                           cx + r * 0.65, cy - r * 0.55,
                           fill=couleur, width=e + 1, tags=tags)


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
                 width=170, height=30, font=POLICE_GRAS, icon=None, **kw):
        tk.Canvas.__init__(self, master, width=width, height=height,
                           highlightthickness=0, bd=0, bg=master["bg"], **kw)
        self._command = command
        self._fill = fill
        self._fg = fg
        self._enabled = True
        self._font = font
        self._text = text
        self._icon = icon

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

        if self._icon:
            # Icone a gauche, libelle a sa suite : centrer les deux ensemble
            # demanderait de mesurer le texte, ce que Tk ne fait qu'une fois
            # le widget affiche. Un alignement a gauche est stable, et se lit
            # aussi bien.
            draw_icon(self, self._icon, 17, self._hauteur / 2, 13, couleur)
            self.create_text(31, self._hauteur / 2, text=self._text, anchor="w",
                             fill=couleur, font=self._font)
        else:
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
# Case a cocher                                                       #
# ------------------------------------------------------------------ #

class CheckBox(tk.Canvas):
    """
    Case a cocher dessinee, parce que les deux volets ne demandent pas la
    meme chose.

    A gauche, cocher AJOUTE ; a droite, cocher SUPPRIME. Une case native rend
    les deux gestes strictement identiques a l'oeil : meme carre, meme
    couleur, meme coche. Rien ne distingue alors un envoi d'une suppression
    avant la fenetre de confirmation — c'est tard.

    Ici, la case porte son signe : un `+` vert pour l'ajout, un `-` rose pour
    la suppression, dans le meme code couleur que le reste de l'application.
    Le signe est visible AVANT le clic, en creux, puis plein une fois coche —
    l'intention se lit donc case vide comme case pleine.

    Le modele reste une `BooleanVar` : les tests et le reste de l'interface la
    lisent comme avant.
    """

    COTE = 17
    GENRES = {
        # genre        : (couleur, icone)
        "ajout":        (SUCCES, "plus"),
        "suppression":  (ALERTE, "moins"),
        "filtre":       (ACCENT, "coche"),
    }

    def __init__(self, master, variable, command=None, genre="ajout",
                 bg=CARTE, taille=None):
        cote = taille or self.COTE

        tk.Canvas.__init__(self, master, width=cote + 2, height=cote + 2,
                           highlightthickness=0, bd=0, bg=bg)

        self._variable = variable
        self._command = command
        self._couleur, self._icone = self.GENRES.get(genre, self.GENRES["ajout"])
        self._cote = cote
        self._enabled = True

        self.bind("<Button-1>", self._click)
        self._draw()

    def _draw(self):
        self.delete("all")

        coche = bool(self._variable.get())
        c = self._cote
        r = 4

        if not self._enabled:
            bord, fond, signe = CARTE_SURVOL, "", TEXTE_DOUX
        elif coche:
            bord = fond = self._couleur
            signe = FOND
        else:
            bord, fond, signe = self._couleur, "", self._couleur

        # Carre a coins arrondis : quatre arcs et deux rectangles, comme le
        # bouton plat — Tk ne sait pas arrondir un rectangle.
        if fond:
            self.create_rectangle(r + 1, 1, c - r + 1, c + 1, fill=fond, outline=fond)
            self.create_rectangle(1, r + 1, c + 1, c - r + 1, fill=fond, outline=fond)
            for x, y in ((1, 1), (c - 2 * r + 1, 1), (1, c - 2 * r + 1),
                         (c - 2 * r + 1, c - 2 * r + 1)):
                self.create_oval(x, y, x + 2 * r, y + 2 * r, fill=fond, outline=fond)
        else:
            self.create_rectangle(1, 1, c + 1, c + 1, outline=bord, width=1)

        # Le signe est TOUJOURS dessine : en creux quand la case est vide, en
        # negatif quand elle est pleine. C'est lui qui dit ce que le clic fera.
        draw_icon(self, self._icone, (c + 2) / 2.0, (c + 2) / 2.0,
                  c * 0.62, signe)

    def _click(self, _event):
        if not self._enabled:
            return

        self._variable.set(not self._variable.get())
        self._draw()

        if self._command:
            self._command()

    def set_enabled(self, enabled):
        self._enabled = bool(enabled)
        self._draw()

    def refresh(self):
        """A appeler quand la variable a ete changee par le programme."""
        self._draw()


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
        self.hidden_rows = []      # lignes locales masquees par un filtre
        self.disk = None           # (libre, total) en octets, ou None

        self.send_vars = {}        # cle -> BooleanVar
        self.delete_vars = {}      # cle -> BooleanVar

        # Choix EXPLICITES de l'utilisateur, distincts de la pre-selection
        # automatique. Alimentes par le `command` des cases, qui ne se
        # declenche qu'a un vrai clic — contrairement a une trace de variable,
        # qui se declenche aussi quand le programme ecrit dedans.
        self.user_send = {}
        self.user_delete = {}
        self._images = []          # vignettes : sans ces references Tk les libere
        self._header_image = None

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

        # La commande exacte, ou les parametres exacts, des le demarrage.
        #
        # Diagnostiquer un refus de connexion a demande de reconstruire la
        # commande a la main hors de l'app et de la comparer option par
        # option. L'outil doit dire ce qu'il execute, sans qu'on ait a le
        # deviner.
        for ligne in transport.detail().splitlines():
            self.log("  %s" % ligne, TEXTE_DOUX)

        if isinstance(transport, packtransport.SystemTransport):
            cle = (self.config_values.get("key_path") or "").strip()

            if (self.config_values.get("transport") == "paramiko"
                    and not packtransport.ParamikoTransport.available()):
                self.log("  transport « paramiko » demande mais le module est "
                         "absent : repli sur ssh/scp du systeme", ALERTE)
            elif cle and not packtransport.ParamikoTransport.available():
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
        choix = (self.config_values.get("transport") or "auto").strip().lower()

        if choix not in packconfig.TRANSPORTS:
            choix = "auto"

        # Un choix explicite est honore, mais jamais jusqu'a l'absurde :
        # imposer un module absent n'aiderait personne. Le repli est annonce
        # haut et fort au demarrage (_announce), donc jamais silencieux.
        veut_paramiko = (choix == "paramiko" or (choix == "auto" and cle))

        if veut_paramiko and packtransport.ParamikoTransport.available():
            return packtransport.ParamikoTransport(
                host=self.config_values["host"],
                user=self.config_values["user"],
                key_path=cle,
                port=int(self.config_values.get("port") or 22))

        # La cle est transmise au transport systeme aussi : sous Windows il
        # n'y a pas de `~/.ssh/config` pour la designer, et c'est ce repli qui
        # sert quand paramiko manque.
        return packtransport.SystemTransport(
            host=self.config_values["host"],
            user=self.config_values["user"],
            key_path=cle or None,
            port=int(self.config_values.get("port") or 22))

    def _save_config(self):
        self.config_values["host"] = self.host_var.get().strip() or "192.168.1.98"
        self.config_values["user"] = self.user_var.get().strip() or "root"
        self.config_values["key_path"] = self.key_var.get().strip()
        self.config_values["target"] = self.target_var.get()
        self.config_values["transport"] = self.transport_var.get()

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
        self._build_version_bar()

    def _card(self, master):
        return tk.Frame(master, bg=CARTE, highlightthickness=0, bd=0)

    # ---------------------------------------------------------------- #
    # En-tete                                                          #
    # ---------------------------------------------------------------- #
    #
    # Ce qui n'allait pas, et qui a fait croire deux fois a une ressource
    # absente
    # ------------------------------------------------------------------
    #
    # L'illustration etait bien trouvee et bien decodee. Elle etait RECADREE
    # sur sa bande haute, et cette bande ne contenait rien.
    #
    # Le calcul : un bandeau de 1180x84 fait un rapport de 14,05 ; la source
    # portrait fait 772x1159 ; la bande retenue mesurait donc 772/14,05 = 54
    # lignes, soit 4,7 % de la hauteur de l'image. Ces 54 lignes sont le haut
    # du ciel, un degrade gris quasi uniforme de moyenne (175, 181, 191). Fondu
    # a 15 % vers #0B1024, ce degrade donne #24293B sur toute la largeur : un
    # aplat, impossible a distinguer d'un fond legerement plus clair. Ni fusee,
    # ni lune, ni nuage — aucun ne se trouve dans les 5 % superieurs de
    # l'image.
    #
    # Le rendu a ete reproduit hors interface et regarde avant correction :
    # une bande unie. Le chemin `sys._MEIPASS`, lui, etait deja correct
    # (packconfig.resource_dir), et un test le verifie desormais en simulant
    # un executable gele.
    #
    # La correction
    # -------------
    #
    # Un portrait 2:3 ne peut pas remplir un bandeau de rapport 14:1 : quelle
    # que soit la tranche choisie, elle ne montre qu'une lichette de la scene.
    # L'illustration est donc mise a l'echelle ENTIERE — hauteur du bandeau,
    # rapport respecte — et posee a droite, la ou aucun texte ne passe, avec un
    # fondu de 46 px sur son bord gauche pour qu'elle sorte du fond au lieu
    # d'y etre collee.
    #
    # Elle peut de ce fait etre nettement plus opaque (0,85) qu'un filigrane
    # de pleine largeur : le texte reste sur du fond PUR, donc aux contrastes
    # deja mesures pour l'app — 15,96:1 pour le titre #E7ECFA, 7,27:1 pour le
    # sous-titre #94A0C6. L'ancien plafond de 0,15 n'existait que parce que
    # l'image passait sous le texte.
    BANDEAU_HAUTEUR = 120
    BANDEAU_ALPHA = 0.85
    BANDEAU_FONDU = 46          # largeur du degrade sur le bord gauche
    BANDEAU_MARGE = 20          # entre l'illustration et le bord droit

    # En dessous, l'illustration mordrait sur le titre : mieux vaut pas de
    # decor qu'un decor qui gene la lecture.
    BANDEAU_LARGEUR_MINI = 620

    def _build_header(self):
        """
        Bandeau dessine sur un canevas, et non compose de Labels.

        Le decor et le texte doivent cohabiter sur la meme surface : un Label
        d'image ne peut pas servir de fond a un autre Label en Tkinter, faute
        de transparence entre widgets. Sur un canevas, l'image est un objet et
        le texte un autre.
        """
        self.header = tk.Canvas(self, bg=FOND, height=self.BANDEAU_HAUTEUR,
                                highlightthickness=0, bd=0)
        self.header.pack(fill="x", padx=12, pady=(10, 4))

        self._header_width = 0
        self.header.bind("<Configure>", self._redraw_header)

        self._load_artwork()

    def _redraw_header(self, event=None):
        largeur = event.width if event is not None else self.header.winfo_width()

        if largeur <= 1:
            return

        # Le redimensionnement d'une fenetre emet des dizaines d'evenements.
        # L'illustration, elle, ne depend pas de la largeur : elle est
        # calculee une fois pour toutes et seulement REPOSEE plus a droite.
        # Redessiner reste inutile tant que la largeur n'a pas bouge —
        # `_artwork_ready` remet ce cache a zero pour forcer le premier trace.
        if largeur == self._header_width:
            return

        self._header_width = largeur
        self.header.delete("all")

        if (self._header_image is not None
                and largeur >= self.BANDEAU_LARGEUR_MINI):
            x = largeur - self._header_image.width() - self.BANDEAU_MARGE
            self.header.create_image(x, 0, image=self._header_image, anchor="nw")

        self.header.create_text(16, 44, anchor="w",
                                text="Gestion de la bibliotheque LunyUI",
                                fill=TEXTE_VIF, font=POLICE_TITRE)
        self.header.create_text(16, 76, anchor="w",
                                text="poste de travail  \u2194  iPhone 3GS",
                                fill=TEXTE_DOUX, font=POLICE_SOUS)

    # -------------------------------------------------------------- #
    # Illustration de l'en-tete                                       #
    # -------------------------------------------------------------- #

    def _load_artwork(self):
        """
        Prepare l'illustration dans un FIL DE FOND, puis la remet au fil
        principal.

        Le decodage PNG en Python pur coute environ une seconde sur cette
        source de 772x1159. Une seconde sur le fil de Tk, c'est une fenetre
        qui s'affiche figee au lancement. Le fil de fond ne touche a aucun
        widget : il ne produit que des octets, et c'est `_artwork_ready`,
        appele par la file, qui construit l'objet Tk.
        """
        chemin = packconfig.artwork_path()

        if not chemin:
            # Plus jamais en silence : c'est ce silence qui a laisse partir
            # deux corrections sans que personne puisse voir ce qui manquait.
            #
            # Un simple « cherchee dans <dossier> » ne dit pas ce que ce
            # dossier CONTIENT reellement — et c'est exactement la question
            # restee sans reponse la troisieme fois : le nom de fichier
            # attendu par `packconfig.ARTWORK_NAMES` et celui embarque par
            # `luny-transfer.spec` sont desormais LA MEME valeur importee (a
            # verifier malgre tout par `tests/test_spec.py`, au cas ou l'un
            # des deux serait un jour recopie en dur). Si le decor manque
            # encore apres ca, ce journal doit suffire a dire pourquoi, sans
            # reconstruire une nouvelle fois pour le decouvrir : soit le
            # fichier n'est nulle part dans les deux dossiers listes
            # ci-dessous, soit il y est sous un autre nom.
            self.log("illustration introuvable : en-tete sans decor", TEXTE_DOUX)

            for ligne in packconfig.describe_resource_search().splitlines():
                self.log("  " + ligne, TEXTE_DOUX)

            return

        def travail():
            try:
                source = packimage.read_png(chemin)
                hauteur = self.BANDEAU_HAUTEUR
                largeur = max(1, int(round(
                    hauteur * source.width / float(source.height))))

                motif = packimage.scale(source, largeur, hauteur)
                bande = packimage.blend_into(
                    packimage.solid(largeur, hauteur, FOND), motif, 0,
                    alpha=self.BANDEAU_ALPHA, fade=self.BANDEAU_FONDU)

                donnees = packimage.to_tk_data(bande)
            except Exception as error:
                self.log("illustration illisible (%s) : en-tete sans decor"
                         % error, ALERTE)
                return

            self.call_on_main(lambda: self._artwork_ready(donnees))

        threading.Thread(target=travail, daemon=True).start()

    def _artwork_ready(self, donnees):
        """Construction de l'objet Tk : fil principal exclusivement."""
        try:
            # Reference gardee sur l'application : sans elle, Tk libere
            # l'image des la fin de la fonction et le bandeau reste vide.
            self._header_image = tk.PhotoImage(data=donnees)
        except tk.TclError as error:
            self.log("illustration refusee par Tk (%s)" % error, ALERTE)
            return

        self._header_width = 0
        self._redraw_header()

    def _build_settings(self):
        barre = self._card(self)
        barre.pack(fill="x", padx=12, pady=4)

        inner = tk.Frame(barre, bg=CARTE)
        inner.pack(fill="x", padx=10, pady=8)

        self.host_var = tk.StringVar(value=self.config_values["host"])
        self.user_var = tk.StringVar(value=self.config_values["user"])
        self.key_var = tk.StringVar(value=self.config_values["key_path"])
        self.target_var = tk.StringVar(value=self.config_values["target"])
        self.transport_var = tk.StringVar(value=self.config_values.get("transport", "auto"))

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

        # Choix du transport, a portee de main : les deux ne rencontrent pas
        # les memes murs sur ce serveur ancien, et basculer ne doit pas exiger
        # de reconstruire l'application.
        for cle_t in reversed(packconfig.TRANSPORTS):
            tk.Radiobutton(inner, text=cle_t, value=cle_t,
                           variable=self.transport_var,
                           bg=CARTE, fg=TEXTE, selectcolor=FOND,
                           activebackground=CARTE, activeforeground=ACCENT,
                           font=POLICE_SOUS, bd=0,
                           highlightthickness=0).pack(side="right")

        tk.Label(inner, text="Transport", bg=CARTE, fg=TEXTE_DOUX,
                 font=POLICE_SOUS).pack(side="right", padx=(12, 4))

    def _build_pane(self, master, titre, side):
        carte = self._card(master)
        carte.pack(side=side, fill="both", expand=True,
                   padx=(0, 6) if side == "left" else (6, 0))

        entete = tk.Frame(carte, bg=CARTE)
        entete.pack(fill="x", padx=10, pady=(8, 2))

        tk.Label(entete, text=titre, bg=CARTE, fg=TEXTE_VIF,
                 font=POLICE_GRAS).pack(side="left")

        compteur = tk.Label(entete, text="", bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS)
        compteur.pack(side="right")

        # La legende, juste sous le titre du volet.
        #
        # Une case cochee ne veut pas dire la meme chose des deux cotes, et
        # rien dans une case ne le dit. La phrase l'ecrit, le pictogramme la
        # repete, et la couleur — vert pour ce qui arrive, rose pour ce qui
        # part — la porte jusqu'au bout de la ligne.
        gauche = (side == "left")
        couleur = SUCCES if gauche else ALERTE
        icone = "plus" if gauche else "corbeille"
        phrase = ("Cocher = sera ajoute a l'appareil" if gauche
                  else "Cocher = sera supprime de l'appareil")

        legende = tk.Frame(carte, bg=CARTE)
        legende.pack(fill="x", padx=10, pady=(0, 6))

        pastille = tk.Canvas(legende, width=16, height=16, bg=CARTE,
                             highlightthickness=0, bd=0)
        pastille.pack(side="left")
        draw_icon(pastille, icone, 8, 8, 12, couleur)

        tk.Label(legende, text=phrase, bg=CARTE, fg=couleur,
                 font=POLICE_SOUS).pack(side="left", padx=(5, 0))

        actions = tk.Frame(carte, bg=CARTE)
        actions.pack(fill="x", padx=10, pady=(0, 6))

        if gauche:
            FlatButton(actions, "Choisir un dossier\u2026", self.choose_local,
                       icon="dossier", width=172, height=28).pack(side="left")
            self.local_dir_label = tk.Label(
                actions, text=self.config_values["last_local_dir"] or "aucun dossier",
                bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS, anchor="w")
            self.local_dir_label.pack(side="left", padx=8, fill="x", expand=True)
        else:
            FlatButton(actions, "Rafraichir", self.refresh_remote,
                       icon="rafraichir", fill=CARTE_SURVOL, fg=TEXTE,
                       width=124, height=28).pack(side="left")

            # Espace disque : dans l'en-tete du volet, la ou on se demande si
            # le prochain pack tiendra.
            self.disk_label = tk.Label(actions, text="espace disque : \u2026",
                                       bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS,
                                       anchor="e")
            self.disk_label.pack(side="right", padx=(8, 2))

        if gauche:
            self._build_filters(carte)

        zone = ScrollArea(carte)
        zone.pack(fill="both", expand=True, padx=6, pady=(0, 8))

        if gauche:
            self.left_count = compteur
            self.left_area = zone
        else:
            self.right_count = compteur
            self.right_area = zone

        return carte

    def _build_filters(self, carte):
        """
        Les deux filtres du volet local, combinables.

        Ils ne touchent pas au balayage : `scan_local` continue de rendre tout
        ce qu'il a vu, y compris les dossiers qui ne sont pas des packs et la
        raison pour laquelle ils n'en sont pas. Seul l'AFFICHAGE se reduit, et
        le compteur annonce combien de lignes sont masquees — une liste
        raccourcie sans le dire serait pire que la liste bruyante.
        """
        barre = tk.Frame(carte, bg=CARTE)
        barre.pack(fill="x", padx=10, pady=(0, 6))

        self.filtre_compat_var = tk.BooleanVar(
            value=bool(self.config_values.get("filtre_compatibles")))
        self.filtre_presence_var = tk.StringVar(
            value=self.config_values.get("filtre_presence") or packlibrary.PRESENCE_TOUS)

        case = CheckBox(barre, self.filtre_compat_var, self._filters_changed,
                        genre="filtre", taille=15)
        case.pack(side="left")

        etiquette = tk.Label(barre, text="Compatibles uniquement", bg=CARTE,
                             fg=TEXTE, font=POLICE_SOUS)
        etiquette.pack(side="left", padx=(5, 14))

        # Cliquer le libelle coche la case : viser un carre de 15 px n'est pas
        # une exigence raisonnable.
        etiquette.bind("<Button-1>", lambda _e: case._click(None))

        tk.Label(barre, text="Afficher", bg=CARTE, fg=TEXTE_DOUX,
                 font=POLICE_SOUS).pack(side="left", padx=(0, 4))

        for cle in packlibrary.PRESENCES:
            tk.Radiobutton(barre, text=packlibrary.PRESENCE_LIBELLES[cle],
                           value=cle, variable=self.filtre_presence_var,
                           command=self._filters_changed,
                           bg=CARTE, fg=TEXTE, selectcolor=FOND,
                           activebackground=CARTE, activeforeground=ACCENT,
                           font=POLICE_SOUS, bd=0,
                           highlightthickness=0).pack(side="left")

    def _filters_changed(self):
        self.config_values["filtre_compatibles"] = bool(self.filtre_compat_var.get())
        self.config_values["filtre_presence"] = self.filtre_presence_var.get()
        packconfig.save(self.config_values)
        self.rebuild_rows()

    def _filtres(self):
        """Etat courant des filtres, tolerant a une interface pas encore batie."""
        compat = getattr(self, "filtre_compat_var", None)
        presence = getattr(self, "filtre_presence_var", None)

        return (bool(compat.get()) if compat is not None else False,
                presence.get() if presence is not None else packlibrary.PRESENCE_TOUS)

    def _build_footer(self):
        pied = self._card(self)
        pied.pack(fill="x", padx=12, pady=(4, 10))

        haut = tk.Frame(pied, bg=CARTE)
        haut.pack(fill="x", padx=10, pady=(8, 4))

        self.summary_label = tk.Label(haut, text="rien de selectionne", bg=CARTE,
                                      fg=TEXTE, font=POLICE, anchor="w")
        self.summary_label.pack(side="left", fill="x", expand=True)

        self.go_button = FlatButton(haut, "Go — transferer la selection",
                                    self.execute, icon="fleche",
                                    width=228, height=32)
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

    def _build_version_bar(self):
        """
        Version, date de construction, auteur, et un lien vers le README.

        Discret, en bas, dans le ton le plus doux de la palette : ce n'est pas
        une information de travail. Elle sert quand un doute surgit sur ce qui
        tourne reellement — un .exe recopie sur un autre poste ne porte
        aucune trace de son origine, et « quelle version as-tu ? » est la
        premiere question de tout diagnostic.
        """
        barre = tk.Frame(self, bg=FOND)
        barre.pack(fill="x", padx=14, pady=(0, 8))

        texte = "Luny Transfer %s  \u00b7  build %s  \u00b7  %s" % (
            packconfig.VERSION, packconfig.build_date(), packconfig.AUTEUR)

        tk.Label(barre, text=texte, bg=FOND, fg=TEXTE_DOUX,
                 font=POLICE_SOUS).pack(side="left")

        readme = packconfig.readme_path()

        if readme:
            lien = tk.Label(barre, text="README", bg=FOND, fg=ACCENT,
                            font=POLICE_SOUS, cursor="hand2")
            lien.pack(side="right")
            lien.bind("<Button-1>", lambda _e: self._open_readme(readme))

            tk.Label(barre, text=readme, bg=FOND, fg=TEXTE_DOUX,
                     font=POLICE_SOUS).pack(side="right", padx=(0, 8))
        else:
            tk.Label(barre, text="README introuvable", bg=FOND, fg=TEXTE_DOUX,
                     font=POLICE_SOUS).pack(side="right")

    def _open_readme(self, chemin):
        message = packproc.open_document(chemin)

        if message:
            # Le chemin reste affiche a cote du lien : meme si rien ne s'ouvre,
            # il est recopiable a la main.
            self.log(message, ALERTE)

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
        self._header_image = None

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
            if self._inventaire():
                self.status("")

        self._work(travail)

    def _inventaire(self):
        """
        Interroge l'appareil : packs presents, puis espace disque.

        Extrait du bouton « Rafraichir » pour etre reutilise TEL QUEL a la fin
        d'un transfert. Deux chemins differents finiraient par diverger, et
        c'est le volet droit — celui qui dit ce qui existe reellement sur
        l'appareil — qui en porterait la difference.

        S'execute dans un fil de fond : aucun widget n'est touche ici, tout
        passe par la file.
        """
        self.status("inventaire de l'appareil…")

        if not packcore.device_reachable(self._core_log):
            self.remote_packs = []
            self._set_disk(None)
            self.call_on_main(self.rebuild_rows)
            self.status("appareil injoignable")
            return False

        rows = packcore.remote_inventory()
        self.remote_packs = packlibrary.remote_packs_from_rows(rows)
        self.log("appareil : %d pack(s)" % len(self.remote_packs), TEXTE_DOUX)

        self._set_disk(packcore.remote_disk(self._core_log))
        self.call_on_main(self.rebuild_rows)

        return True

    def _set_disk(self, mesure):
        """
        Affiche l'espace disque, ou dit franchement qu'il n'a pas pu etre lu.

        Ce systeme est minimal et plusieurs utilitaires courants s'y sont deja
        reveles absents. Un `df` qui echoue ne doit ni bloquer l'inventaire ni
        laisser un champ vide dont personne ne sait s'il charge encore.
        """
        self.disk = mesure

        if mesure:
            libre, total = mesure
            texte = "%s libres sur %s" % (packcore.human_disk(libre),
                                          packcore.human_disk(total))
        else:
            texte = "espace disque non disponible"

        def poser():
            if getattr(self, "disk_label", None) is not None:
                self.disk_label.configure(text=texte)

        self.call_on_main(poser)

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
        self._images = []      # vignettes seulement ; le filigrane a sa propre reference

        self.left_area.clear()
        self.right_area.clear()

        # Le filtre ne concerne QUE le volet gauche. Le volet droit montre ce
        # qui est sur l'appareil, sans exception : masquer une entree distante
        # reviendrait a cacher quelque chose qui occupe reellement la place.
        visibles, self.hidden_rows = packlibrary.filter_rows(
            self.rows, *self._filtres())

        for row in visibles:
            self._local_row(row)

        droite = 0

        for row in self.rows:
            for remote in row.remotes:
                self._remote_row(row, remote)
                droite += 1

        compte = "%d pack(s)" % len(visibles)

        if self.hidden_rows:
            compte += "  \u00b7  %d masque(s)" % len(self.hidden_rows)

        self.left_count.configure(text=compte)
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

        case = CheckBox(cadre, variable, choisi, genre="ajout")
        case.pack(side="left", padx=(2, 0))

        if not pack.valid:
            case.set_enabled(False)

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

        # Un dossier translittere doit se dire AVANT le transfert : sinon le
        # pack apparait sur l'appareil sous un nom que personne n'a choisi, et
        # l'inventaire semble parler d'autre chose. Le titre, lui, ne change
        # pas — c'est lui que l'app affiche.
        if pack.renamed:
            tk.Label(texte, text="dossier envoye : %s" % pack.transfer_name,
                     bg=CARTE, fg=TEXTE_DOUX, font=POLICE_SOUS,
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

        case = CheckBox(cadre, variable, choisi, genre="suppression")
        case.pack(side="left", padx=(2, 0))

        if remote.protected:
            case.set_enabled(False)

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

        # Un pack coche puis masque par un filtre reste selectionne. L'oublier
        # serait le pire des deux mondes : l'utilisateur a demande son envoi,
        # et un changement d'affichage l'annulerait sans un mot. Le
        # recapitulatif dit combien de lignes sont dans ce cas, et la fenetre
        # de confirmation les nomme comme les autres.
        envois |= {row.key for row in self.hidden_rows
                   if self.user_send.get(row.key)}

        return envois, supprs

    def _masques_selectionnes(self):
        return [row for row in self.hidden_rows if self.user_send.get(row.key)]

    def update_summary(self):
        envois, supprs = self._selection()
        resume = packlibrary.summarise(self.rows, envois, supprs)
        texte = packlibrary.summary_text(resume)

        caches = self._masques_selectionnes()

        if caches:
            texte += "  (dont %d masque(s) par le filtre)" % len(caches)

        self.summary_label.configure(text=texte)

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

        # Un envoi demande puis masque par un filtre n'est plus a l'ecran. Il
        # part quand meme — c'est un choix explicite — mais il doit etre
        # nomme ici, sinon il partirait sans avoir jamais ete relu.
        caches = self._masques_selectionnes()

        if caches:
            lignes.append("Selectionnes mais MASQUES par le filtre :")
            for row in caches:
                lignes.append("   \u2022 %s" % row.title)
            lignes.append("")

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

        # Inventaire distant relance automatiquement, par le meme chemin que
        # le bouton « Rafraichir » : le volet droit et l'espace disque
        # refletent le nouvel etat sans qu'on ait a le demander. Une liste qui
        # reste sur l'etat d'avant le transfert invite a renvoyer ce qui vient
        # d'arriver.
        self.log("")
        self.log("inventaire de l'appareil relance apres transfert", TEXTE_DOUX)
        self._inventaire()
        self.status("termine")


# Part de l'ecran occupee au lancement, et plancher en dessous duquel
# l'interface se serre trop pour rester lisible — deux volets, une barre de
# reglages et un journal.
PART_ECRAN = 0.80
TAILLE_MINI = (1000, 700)


def geometrie(largeur_ecran, hauteur_ecran, part=PART_ECRAN, mini=TAILLE_MINI):
    """
    Taille et position de la fenetre au lancement : (l, h, x, y).

    Une taille fixe de 1080x760 etait sous-dimensionnee sur un ecran moderne
    et DEBORDAIT d'un ecran de portable ancien — le meme nombre ne peut pas
    convenir aux deux. La regle : `part` de l'ecran, jamais moins que `mini`,
    jamais plus que l'ecran lui-meme. Cet ordre compte : sur un petit ecran,
    c'est la borne haute qui doit l'emporter, sinon la fenetre nait plus
    grande que l'affichage et sa barre de titre passe hors champ.

    Fonction pure, donc verifiable sans ouvrir de fenetre.
    """
    # 64 px reserves pour la barre des taches et le cadre de la fenetre.
    plafond_h = max(240, hauteur_ecran - 64)

    largeur = min(max(int(largeur_ecran * part), mini[0]), largeur_ecran)
    hauteur = min(max(int(hauteur_ecran * part), mini[1]), plafond_h)

    x = max(0, (largeur_ecran - largeur) // 2)
    y = max(0, (hauteur_ecran - hauteur) // 2 - 16)

    return largeur, hauteur, x, y


def main():
    racine = tk.Tk()
    racine.title("Gestion de la bibliotheque LunyUI")
    racine.configure(bg=FOND)

    largeur, hauteur, x, y = geometrie(racine.winfo_screenwidth(),
                                       racine.winfo_screenheight())
    racine.geometry("%dx%d+%d+%d" % (largeur, hauteur, x, y))

    # Redimensionnable ensuite, sans plancher plus haut que la fenetre
    # elle-meme : sur un petit ecran, un minsize superieur a la taille de
    # depart la ferait grandir toute seule.
    racine.minsize(min(TAILLE_MINI[0], largeur), min(TAILLE_MINI[1], hauteur))

    try:
        Application(racine)
    except Exception:
        traceback.print_exc()
        raise

    racine.mainloop()


if __name__ == "__main__":
    main()

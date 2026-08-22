#!/usr/bin/env python3
"""
Transfert de packs vers le 3GS — fenetre Tkinter.

Exige python3-tk, qui n'est PAS installe par defaut sur Debian/Ubuntu malgre
son statut de bibliotheque standard :

    sudo apt install python3-tk

Si la fenetre ne s'ouvre pas, packcli.py fait exactement la meme chose en
ligne de commande — les deux appellent le meme packcore.

Les operations longues (conversion, scp) tournent dans un fil separe et
poussent leurs messages dans une file que la boucle Tk vide periodiquement :
sans cela la fenetre se figerait pendant tout un transfert.
"""

import os
import queue
import sys
import tempfile
import threading

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:
    sys.exit(
        "tkinter est absent.\n"
        "  sudo apt install python3-tk\n"
        "Ou utiliser la ligne de commande equivalente :\n"
        "  python3 packcli.py --help")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import packcore  # noqa: E402

BUILD_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")


class Application(tk.Frame):
    def __init__(self, master):
        tk.Frame.__init__(self, master, padx=10, pady=10)
        self.pack(fill="both", expand=True)

        self.source = None
        self.messages = queue.Queue()
        self.busy = False

        self._build()
        self.after(120, self._drain)
        self.log("Pret. Choisir un pack, puis « Convertir et envoyer ».")
        self.refresh_inventory()

    # -------------------------------------------------- interface --
    def _build(self):
        top = tk.Frame(self)
        top.pack(fill="x")

        tk.Button(top, text="Choisir un dossier de pack",
                  command=self.pick_directory).pack(side="left")
        tk.Button(top, text="Choisir un pack ZIP",
                  command=self.pick_zip).pack(side="left", padx=6)

        self.source_label = tk.Label(self, text="aucun pack choisi", anchor="w", fg="#555")
        self.source_label.pack(fill="x", pady=(6, 10))

        options = tk.Frame(self)
        options.pack(fill="x")
        tk.Label(options, text="Destination :").pack(side="left")
        self.target = tk.StringVar(value=packcore.DEFAULT_TARGET)
        for key in sorted(packcore.TARGETS):
            tk.Radiobutton(options, text=key, value=key,
                           variable=self.target).pack(side="left")
        self.replace = tk.BooleanVar(value=False)
        tk.Checkbutton(options, text="remplacer si deja present",
                       variable=self.replace).pack(side="left", padx=12)

        self.send_button = tk.Button(self, text="Convertir et envoyer",
                                     command=self.send, state="disabled")
        self.send_button.pack(fill="x", pady=8)

        tk.Label(self, text="Sur l'appareil", anchor="w",
                 font=("TkDefaultFont", 10, "bold")).pack(fill="x")

        inventory = tk.Frame(self)
        inventory.pack(fill="x")
        self.tree = ttk.Treeview(inventory, columns=("ou", "fichiers", "taille"),
                                 show="tree headings", height=6)
        self.tree.heading("#0", text="pack")
        for col, titre, largeur in (("ou", "emplacement", 100),
                                    ("fichiers", "fichiers", 70),
                                    ("taille", "taille", 80)):
            self.tree.heading(col, text=titre)
            self.tree.column(col, width=largeur, anchor="w")
        self.tree.pack(side="left", fill="x", expand=True)

        side = tk.Frame(inventory)
        side.pack(side="left", padx=6)
        tk.Button(side, text="Rafraichir", command=self.refresh_inventory).pack(fill="x")
        tk.Button(side, text="Supprimer", command=self.delete_selected).pack(fill="x", pady=4)

        tk.Label(self, text="Journal", anchor="w",
                 font=("TkDefaultFont", 10, "bold")).pack(fill="x", pady=(10, 0))
        self.text = tk.Text(self, height=16, wrap="word")
        self.text.pack(fill="both", expand=True)
        scroll = tk.Scrollbar(self.text, command=self.text.yview)
        scroll.pack(side="right", fill="y")
        self.text.configure(yscrollcommand=scroll.set, state="disabled")

    # ------------------------------------------------------ outils --
    def log(self, message):
        self.messages.put(message)

    def _drain(self):
        while True:
            try:
                message = self.messages.get_nowait()
            except queue.Empty:
                break
            self.text.configure(state="normal")
            self.text.insert("end", message + "\n")
            self.text.see("end")
            self.text.configure(state="disabled")
        self.after(120, self._drain)

    def _run(self, work):
        """Execute dans un fil et rend les boutons pendant ce temps."""
        if self.busy:
            self.log("une operation est deja en cours")
            return

        self.busy = True
        self.send_button.configure(state="disabled")

        def wrapper():
            try:
                work()
            except Exception as error:                      # noqa: BLE001
                self.log("ERREUR inattendue : %s" % error)
            finally:
                self.busy = False
                self.after(0, self._refresh_button)

        threading.Thread(target=wrapper, daemon=True).start()

    def _refresh_button(self):
        self.send_button.configure(state="normal" if self.source else "disabled")

    # ------------------------------------------------------ actions --
    def pick_directory(self):
        chosen = filedialog.askdirectory(title="Dossier du pack (contenant story.json)")
        if chosen:
            self.source = chosen
            self.source_label.configure(text=chosen)
            self._refresh_button()
            self.log("pack choisi : %s" % chosen)

    def pick_zip(self):
        chosen = filedialog.askopenfilename(title="Archive du pack",
                                            filetypes=[("Archives ZIP", "*.zip")])
        if chosen:
            self.source = chosen
            self.source_label.configure(text=chosen)
            self._refresh_button()
            self.log("archive choisie : %s" % chosen)

    def refresh_inventory(self):
        def work():
            self.log("--- inventaire de l'appareil ---")
            if not packcore.device_reachable(self.log):
                return
            rows = packcore.remote_inventory(self.log)
            self.after(0, lambda: self._fill_tree(rows))
        self._run(work)

    def _fill_tree(self, rows):
        self.tree.delete(*self.tree.get_children())
        for name, where, count, size in rows:
            self.tree.insert("", "end", text=name,
                             values=(where, count, packcore.human(size)))

    def delete_selected(self):
        selection = self.tree.selection()
        if not selection:
            messagebox.showinfo("Suppression", "Choisir un pack dans la liste.")
            return

        item = self.tree.item(selection[0])
        name, where = item["text"], item["values"][0]

        if where == "bundle":
            messagebox.showwarning(
                "Pack integre",
                "« %s » est livre avec l'application.\n\n"
                "Le supprimer ici ne servirait a rien : la prochaine "
                "installation le remettrait, et l'application elle-meme ne "
                "peut pas l'effacer." % name)
            return

        if not messagebox.askyesno(
                "Supprimer ?",
                "Effacer « %s » de l'appareil ?\n\nCette action est definitive."
                % name):
            return

        def work():
            if packcore.remote_delete(name, where, self.log):
                packcore.remote_uicache(self.log)
                rows = packcore.remote_inventory()
                self.after(0, lambda: self._fill_tree(rows))
        self._run(work)

    def send(self):
        source = self.source
        target = self.target.get()
        replace = self.replace.get()

        def work():
            with tempfile.TemporaryDirectory() as scratch:
                pack_dir = source

                if os.path.isfile(source):
                    self.log("--- extraction de l'archive ---")
                    pack_dir = packcore.extract_zip(source, scratch, self.log)
                    if pack_dir is None:
                        return

                self.log("--- conversion ---")
                built = packcore.convert_pack(pack_dir, BUILD_ROOT, self.log)
                if built is None:
                    return

                name = os.path.basename(built)

                if not replace:
                    existants = {n for n, _w, _c, _s in packcore.remote_inventory()}
                    if name in existants:
                        self.log("--- deja present ---")
                        self.log("  « %s » existe deja sur l'appareil. Cocher "
                                 "« remplacer » pour l'ecraser." % name)
                        return

                self.log("--- transfert ---")
                if not packcore.device_reachable(self.log):
                    return
                if packcore.remote_send(built, target, self.log):
                    packcore.remote_uicache(self.log)
                    rows = packcore.remote_inventory()
                    self.after(0, lambda: self._fill_tree(rows))

        self._run(work)


def main():
    root = tk.Tk()
    root.title("Luny — transfert de packs vers le 3GS")
    root.geometry("720x640")
    Application(root)
    root.mainloop()


if __name__ == "__main__":
    main()

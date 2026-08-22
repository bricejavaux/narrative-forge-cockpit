#!/usr/bin/env python3
"""
Transfert de packs vers le 3GS — ligne de commande.

Repli equivalent a la fenetre Tkinter, et seul mode utilisable sans
python3-tk. Les deux appellent le meme packcore.

    python3 packcli.py liste
    python3 packcli.py envoyer ../../ios/LunyUI/Resources/packs/audio-demo
    python3 packcli.py envoyer mon-pack.zip --cible bundle
    python3 packcli.py supprimer mon-pack
"""

import argparse
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import packcore  # noqa: E402

BUILD_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")


def log(message):
    print(message)
    sys.stdout.flush()


def cmd_liste(args):
    if not packcore.device_reachable(log):
        return 1

    log("packs presents sur %s :" % packcore.HOST)
    packcore.remote_inventory(log)
    return 0


def cmd_envoyer(args):
    source = os.path.abspath(args.source)

    if not os.path.exists(source):
        log("ECHEC : %s introuvable" % source)
        return 1

    with tempfile.TemporaryDirectory() as work:
        pack_dir = source

        if os.path.isfile(source):
            log("--- extraction de l'archive ---")
            pack_dir = packcore.extract_zip(source, work, log)
            if pack_dir is None:
                return 1

        log("--- conversion ---")
        built = packcore.convert_pack(pack_dir, BUILD_ROOT, log)
        if built is None:
            return 1

        name = os.path.basename(built)

        if not args.force:
            existants = {n for n, _w, _c, _s in packcore.remote_inventory()}
            if name in existants:
                log("--- deja present sur l'appareil ---")
                log("  \"%s\" existe deja. Relancer avec --force pour le remplacer." % name)
                return 2

        log("--- transfert ---")
        if not packcore.device_reachable(log):
            return 1
        if not packcore.remote_send(built, args.cible, log):
            return 1

        if not args.sans_uicache:
            packcore.remote_uicache(log)

    return 0


def cmd_supprimer(args):
    if not packcore.device_reachable(log):
        return 1

    rows = packcore.remote_inventory()
    trouve = [(n, w) for n, w, _c, _s in rows if n == args.nom]

    if not trouve:
        log("ECHEC : aucun pack nomme \"%s\" sur l'appareil" % args.nom)
        return 1

    """
    Un pack du bundle n'est pas supprime par defaut, meme si root en a le
    droit : les packs livres sont le banc d'essai du projet, et un
    `make package install` les remettrait de toute facon. Il faut le demander
    explicitement.
    """
    cibles = [(n, w) for n, w in trouve if w == "documents" or args.inclure_bundle]
    ignores = [(n, w) for n, w in trouve if (n, w) not in cibles]

    for name, where in ignores:
        log("  ignore : \"%s\" est dans le bundle — --inclure-bundle pour le supprimer"
            % name)

    if not cibles:
        return 1

    ok = True
    for name, where in cibles:
        if not packcore.remote_delete(name, where, log):
            ok = False

    if ok and not args.sans_uicache:
        packcore.remote_uicache(log)

    return 0 if ok else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="commande", required=True)

    p = sub.add_parser("liste", help="inventaire des packs sur l'appareil")
    p.set_defaults(func=cmd_liste)

    p = sub.add_parser("envoyer", help="convertir puis transferer un pack")
    p.add_argument("source", help="dossier du pack, ou archive .zip")
    p.add_argument("--cible", choices=sorted(packcore.TARGETS),
                   default=packcore.DEFAULT_TARGET,
                   help="emplacement sur l'appareil (defaut : %(default)s)")
    p.add_argument("--force", action="store_true",
                   help="remplacer un pack de meme nom deja present")
    p.add_argument("--sans-uicache", action="store_true", dest="sans_uicache")
    p.set_defaults(func=cmd_envoyer)

    p = sub.add_parser("supprimer", help="effacer un pack de l'appareil")
    p.add_argument("nom")
    p.add_argument("--inclure-bundle", action="store_true", dest="inclure_bundle",
                   help="autoriser aussi la suppression d'un pack livre avec l'app")
    p.add_argument("--sans-uicache", action="store_true", dest="sans_uicache")
    p.set_defaults(func=cmd_supprimer)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

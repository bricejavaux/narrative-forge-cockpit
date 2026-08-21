# Makefile.snippet.mk — a fusionner avec le Makefile existant du projet
# LunyUI, PAS un Makefile autonome. Cette session n'a pas acces au Makefile
# reel (deja fonctionnel pour le projet de test precedent) : ce fichier
# documente les deux ajouts a y reporter a la main.

# --- 1. Fichiers sources de cette session --------------------------------
#
# Hypothese a verifier en 10 secondes : le gabarit Theos application_modern
# place generalement ses sources a la racine du projet (pas de sous-dossier
# Classes/), et la variable Makefile associee est APPLICATION_NAME suivi de
# _FILES. Confirmez avec :
#
#     grep _FILES Makefile
#
# Si votre Makefile utilise deja un sous-dossier (Classes/, Sources/...),
# deplacez les .h/.m de ce dossier ios/LunyUI/ au meme endroit avant de
# fusionner la ligne ci-dessous.

LunyUI_FILES += RootViewController.m \
                DetailViewController.m \
                LunyLibraryItem.m \
                LunyLibraryCell.m

# --- 2. Piege de deploiement #2 : uicache echoue en root -----------------
#
# "cannot open cache file. incorrect user?" si uicache tourne en root.
# Automatise ici plutot que redecouvert a chaque deploiement. Si un hook
# after-install:: existe deja dans le Makefile, fusionnez son contenu avec
# celui-ci plutot que d'avoir deux blocs after-install:: (make ne les
# fusionne pas silencieusement — seul le dernier survit selon la version de
# make ; ne pas laisser les deux coexister sans verifier).

after-install::
	install.exec "su mobile -c 'uicache -a'"

# --- Piege de deploiement #1 (rappel, deja connu) -------------------------
#
# Les AppIcon*.png generes par le gabarit Theos font 0 octet ; SpringBoard
# ignore alors l'app silencieusement (pas d'erreur, juste absence sur
# l'ecran d'accueil). Ce dossier fournit un jeu d'icones de secours valides
# (non-vides) dans Resources/ — voir Resources/README.md avant de les
# utiliser : NE remplacez PAS des icones deja fonctionnelles par celles-ci.

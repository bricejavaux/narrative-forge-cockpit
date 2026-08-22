ARCHS = armv7
TARGET := iphone:clang:10.3:6.0
INSTALL_TARGET_PROCESSES = LunyUI

include $(THEOS)/makefiles/common.mk

APPLICATION_NAME = LunyUI

LUNY_ENGINE_DIR = ../../luny-engine

# Telemetrie de mise au point : 0 par defaut, cf. LunyDebug.h.
#   make LUNY_DEBUG=1 package install
LUNY_DEBUG ?= 0

# Palette : 0 = sombre (defaut), 1 = claire chaleureuse. Voir LunyTheme.h.
LUNY_THEME_LIGHT ?= 0
LUNY_THEME_PASTEL ?= 0

LunyUI_FILES = main.m \
               XXAppDelegate.m \
               RootViewController.m \
               DetailViewController.m \
               LunyLibraryItem.m \
               LunyLibraryCell.m \
               LunyTheme.m \
               LunySimulatedAudio.m \
               LunyAudioTrack.m \
               LunyARMSupport.c \
               $(LUNY_ENGINE_DIR)/luny_engine.c \
               $(LUNY_ENGINE_DIR)/cjson/cJSON.c
LunyUI_FRAMEWORKS = UIKit CoreGraphics QuartzCore AVFoundation

# CFLAGS s'applique aussi aux sources C (Theos les compile avec -x c et sans
# OBJCFLAGS) : -fobjc-arc doit donc rester dans OBJCFLAGS, sinon clang le
# recoit sur du C pur.
LunyUI_CFLAGS = -I$(LUNY_ENGINE_DIR) -DLUNY_DEBUG=$(LUNY_DEBUG) -DLUNY_THEME_LIGHT=$(LUNY_THEME_LIGHT) -DLUNY_THEME_PASTEL=$(LUNY_THEME_PASTEL)
LunyUI_OBJCFLAGS = -fobjc-arc

include $(THEOS_MAKE_PATH)/application.mk

# uicache echoue en root ("cannot open cache file. incorrect user?") : il
# doit tourner en mobile. Automatise ici plutot que redecouvert a chaque
# deploiement.
# La source de reference reste dans Resources/ pour etre versionnee a cote des
# icones qu'elle produit, mais elle n'a rien a faire dans le bundle : 1,5 Mo
# d'image morte embarquee sur l'appareil. On la retire au moment de la mise en
# scene, apres que les icones ont ete generees a partir d'elle.
before-package::
	find "$(THEOS_STAGING_DIR)" -name 'luny_*_source*.png' -delete

after-install::
	install.exec "su mobile -c 'uicache -a'"

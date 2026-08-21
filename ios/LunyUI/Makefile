ARCHS = armv7
TARGET := iphone:clang:10.3:6.0
INSTALL_TARGET_PROCESSES = LunyUI

include $(THEOS)/makefiles/common.mk

APPLICATION_NAME = LunyUI

LUNY_ENGINE_DIR = ../../luny-engine

LunyUI_FILES = main.m \
               XXAppDelegate.m \
               RootViewController.m \
               DetailViewController.m \
               LunyLibraryItem.m \
               LunyLibraryCell.m \
               LunyTheme.m \
               LunyARMSupport.c \
               $(LUNY_ENGINE_DIR)/luny_engine.c \
               $(LUNY_ENGINE_DIR)/cjson/cJSON.c
LunyUI_FRAMEWORKS = UIKit CoreGraphics QuartzCore

# CFLAGS s'applique aussi aux sources C (Theos les compile avec -x c et sans
# OBJCFLAGS) : -fobjc-arc doit donc rester dans OBJCFLAGS, sinon clang le
# recoit sur du C pur.
LunyUI_CFLAGS = -I$(LUNY_ENGINE_DIR)
LunyUI_OBJCFLAGS = -fobjc-arc

include $(THEOS_MAKE_PATH)/application.mk

# uicache echoue en root ("cannot open cache file. incorrect user?") : il
# doit tourner en mobile. Automatise ici plutot que redecouvert a chaque
# deploiement.
after-install::
	install.exec "su mobile -c 'uicache -a'"

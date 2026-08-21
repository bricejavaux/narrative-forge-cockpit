ARCHS = armv7
TARGET := iphone:clang:10.3:6.0
INSTALL_TARGET_PROCESSES = LunyUI

include $(THEOS)/makefiles/common.mk

APPLICATION_NAME = LunyUI

LunyUI_FILES = main.m \
               XXAppDelegate.m \
               RootViewController.m \
               DetailViewController.m \
               LunyLibraryItem.m \
               LunyLibraryCell.m \
               LunyTheme.m
LunyUI_FRAMEWORKS = UIKit CoreGraphics QuartzCore
LunyUI_CFLAGS = -fobjc-arc

include $(THEOS_MAKE_PATH)/application.mk

# uicache echoue en root ("cannot open cache file. incorrect user?") : il
# doit tourner en mobile. Automatise ici plutot que redecouvert a chaque
# deploiement.
after-install::
	install.exec "su mobile -c 'uicache -a'"

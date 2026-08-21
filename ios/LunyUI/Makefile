ARCHS = armv7
TARGET := iphone:clang:10.3:6.0
INSTALL_TARGET_PROCESSES = LunyUI

include $(THEOS)/makefiles/common.mk

APPLICATION_NAME = LunyUI

LunyUI_FILES = main.m XXAppDelegate.m XXRootViewController.m XXCoverCell.m XXStoryDetailViewController.m
LunyUI_FRAMEWORKS = UIKit CoreGraphics QuartzCore
LunyUI_CFLAGS = -fobjc-arc

include $(THEOS_MAKE_PATH)/application.mk

# Moteur Luny -- C99 pur, aucune dependance externe hors cJSON (vendorise).

CC      ?= gcc
CSTD    ?= -std=c99
WARN    ?= -Wall -Wextra
OPT     ?= -O2
CFLAGS  ?= $(CSTD) $(WARN) $(OPT)
LDFLAGS ?=

ENGINE_OBJS := luny_engine.o cjson/cJSON.o
CLI_OBJS    := luny_cli.o $(ENGINE_OBJS)

.PHONY: all clean test strict

all: luny_cli

luny_cli: $(CLI_OBJS)
	$(CC) $(CFLAGS) -o $@ $(CLI_OBJS) $(LDFLAGS)

luny_engine.o: luny_engine.c luny_engine.h cjson/cJSON.h
	$(CC) $(CFLAGS) -c -o $@ luny_engine.c

luny_cli.o: luny_cli.c luny_engine.h
	$(CC) $(CFLAGS) -c -o $@ luny_cli.c

cjson/cJSON.o: cjson/cJSON.c cjson/cJSON.h
	$(CC) $(CFLAGS) -c -o $@ cjson/cJSON.c

# Compilation avec les avertissements pousses, utile en integration.
strict:
	$(MAKE) clean
	$(MAKE) CFLAGS="$(CSTD) $(WARN) -pedantic -Wshadow -Wconversion -O2" all

test: luny_cli
	./tests/run_tests.sh

clean:
	rm -f luny_cli $(CLI_OBJS)

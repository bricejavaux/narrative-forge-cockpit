#!/bin/sh
#
# Jeu de tests du moteur Luny.
#
# Chaque scenario est rejoue et compare a une sortie de reference figee dans
# tests/expected/. stdout et stderr sont captures ensemble : les avertissements
# du parseur font partie du comportement teste.
#
# Regenerer les references apres un changement volontaire :
#     LUNY_BLESS=1 ./tests/run_tests.sh
#
set -u

cd "$(dirname "$0")/.." || exit 1

CLI=./luny_cli
EXPECTED=tests/expected
BLESS="${LUNY_BLESS:-0}"

[ -x "$CLI" ] || { echo "luny_cli absent : lancer make d'abord"; exit 1; }
mkdir -p "$EXPECTED"

pass=0
fail=0

# run <nom> <pack> [evenements...]
run() {
    name=$1
    shift
    pack=$1
    shift

    actual=$("$CLI" --seed 3 "tests/packs/$pack" "$@" 2>&1)
    rc=$?
    actual="$actual
exit=$rc"

    ref="$EXPECTED/$name.txt"
    if [ "$BLESS" = "1" ]; then
        printf '%s\n' "$actual" > "$ref"
        echo "bless  $name"
        return
    fi

    if [ ! -f "$ref" ]; then
        echo "MANQUE $name (reference absente, lancer LUNY_BLESS=1)"
        fail=$((fail + 1))
        return
    fi

    if printf '%s\n' "$actual" | diff -u "$ref" - > /tmp/luny_diff.$$ 2>&1; then
        echo "ok     $name"
        pass=$((pass + 1))
    else
        echo "ECHEC  $name"
        cat /tmp/luny_diff.$$
        fail=$((fail + 1))
    fi
    rm -f /tmp/luny_diff.$$
}

# --- nominal -----------------------------------------------------------
run nominal_deux_branches    two-branches ok right ok
run molette_circulaire       two-branches ok left left home
run gating_drapeaux          two-branches ok ok ok left home home
run home_vers_entree         two-branches ok home

# --- option aleatoire --------------------------------------------------
run tirage_graine_3          random ok
run tirage_puis_molette      random ok right right right

# --- cas degrades ------------------------------------------------------
run degrade_complet          degraded ok home ok
run cycle_et_autoplay        cycle ended ended ended
run autoplay_sans_ok         autoplay-no-ok ok ended ended
run version_absente          no-version ok

# --- determinisme du tirage -------------------------------------------
a=$("$CLI" --quiet --seed 42 tests/packs/random ok)
b=$("$CLI" --quiet --seed 42 tests/packs/random ok)
if [ "$a" = "$b" ]; then
    echo "ok     tirage_reproductible"
    pass=$((pass + 1))
else
    echo "ECHEC  tirage_reproductible"
    fail=$((fail + 1))
fi

if [ "$BLESS" = "1" ]; then
    echo "references regenerees"
    exit 0
fi

echo "---"
echo "$pass reussis, $fail echoues"
[ "$fail" -eq 0 ] || exit 1

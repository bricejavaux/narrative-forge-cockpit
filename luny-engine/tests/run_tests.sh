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
# Deux contrats sont couverts :
#   - le mode JSON par defaut (une ligne par evenement, contrat de conformite) ;
#   - le mode texte --verbose (references *.txt).
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

# run <nom> <pack> <ev1,ev2,...>   -- mode texte lisible
run() {
    name=$1
    shift
    pack=$1
    shift

    actual=$("$CLI" --verbose --seed 3 "tests/packs/$pack" "$@" 2>&1)
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
run nominal_deux_branches    two-branches ok,wheel_right,ok
run molette_circulaire       two-branches ok,wheel_left,wheel_left,home
run gating_drapeaux          two-branches ok,ok,ok,wheel_left,home,home
run home_vers_entree         two-branches ok,home

# --- option aleatoire --------------------------------------------------
run tirage_graine_3          random ok
run tirage_puis_molette      random ok,wheel_right,wheel_right,wheel_right

# --- cas degrades ------------------------------------------------------
run degrade_complet          degraded ok,home,ok
run cycle_et_autoplay        cycle audio_ended,audio_ended,audio_ended
run autoplay_sans_ok         autoplay-no-ok ok,audio_ended,audio_ended
run version_absente          no-version ok
run cibles_non_resolues      unresolved ok,ok,home,wheel_right,ok,home

# --- contrat JSON par defaut ------------------------------------------
run_json() {
    name=$1
    shift
    pack=$1
    shift

    actual=$("$CLI" --quiet --seed 3 "tests/packs/$pack" "$@" 2>/dev/null)
    rc=$?
    actual="$actual
exit=$rc"

    ref="$EXPECTED/$name.json.txt"
    if [ "$BLESS" = "1" ]; then
        printf '%s\n' "$actual" > "$ref"
        echo "bless  $name"
        return
    fi
    if [ ! -f "$ref" ]; then
        echo "MANQUE $name"
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

run_json json_nominal          two-branches ok,wheel_right,ok
run_json json_cibles_non_resolues unresolved ok,ok,home,wheel_right,ok,home
run_json json_degrade          degraded ok,home,ok
run_json json_asset_manquant   degraded ok

# --- stdout ne doit jamais porter de log ------------------------------
pollution=$("$CLI" tests/packs/degraded ok,home 2>/dev/null | grep -c "warn")
if [ "$pollution" -eq 0 ]; then
    echo "ok     stdout_sans_log"
    pass=$((pass + 1))
else
    echo "ECHEC  stdout_sans_log ($pollution lignes de log sur stdout)"
    fail=$((fail + 1))
fi

# --- codes de sortie --------------------------------------------------
"$CLI" --quiet tests/packs/no-version ok >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ok     exit_non_nul_si_chargement_echoue"
    pass=$((pass + 1))
else
    echo "ECHEC  exit_non_nul_si_chargement_echoue"
    fail=$((fail + 1))
fi

# --- graine par variable d'environnement ------------------------------
e1=$(LUNY_RANDOM_SEED=12 "$CLI" --quiet tests/packs/random ok)
e2=$(LUNY_RANDOM_SEED=12 "$CLI" --quiet tests/packs/random ok)
if [ "$e1" = "$e2" ]; then
    echo "ok     graine_env_reproductible"
    pass=$((pass + 1))
else
    echo "ECHEC  graine_env_reproductible"
    fail=$((fail + 1))
fi

# La graine doit reellement influer. Comparer deux graines au hasard serait
# fragile : sur trois options, deux graines coincident une fois sur trois.
# On verifie donc qu'au moins deux issues distinctes apparaissent sur 12 graines.
distinctes=$(for s in 1 2 3 4 5 6 7 8 9 10 11 12; do
    LUNY_RANDOM_SEED=$s "$CLI" --quiet tests/packs/random ok
done | sort -u | wc -l)
if [ "$distinctes" -ge 2 ]; then
    echo "ok     graine_env_effective ($distinctes issues distinctes sur 12 graines)"
    pass=$((pass + 1))
else
    echo "ECHEC  graine_env_effective (la graine n'a aucun effet)"
    fail=$((fail + 1))
fi

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

/*
 * LunyDebug.h -- interrupteur de la telemetrie de mise au point.
 *
 * Les libelles techniques (uuid de noeud, nom d'evenement, statut brut
 * renvoye par le moteur, index d'option chiffre) servent a verifier le
 * branchement du moteur. Ils n'ont rien a faire devant un enfant : ils sont
 * donc compiles hors du binaire par defaut.
 *
 * Pour les reactiver le temps d'une mise au point :
 *
 *     make LUNY_DEBUG=1 package install
 *
 * Le Makefile transmet la valeur en -DLUNY_DEBUG. Ne pas livrer un paquet
 * construit avec cette option.
 */

#ifndef LUNY_DEBUG_H
#define LUNY_DEBUG_H

#ifndef LUNY_DEBUG
#define LUNY_DEBUG 0
#endif

#endif /* LUNY_DEBUG_H */

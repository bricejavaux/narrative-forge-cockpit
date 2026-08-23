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

#if LUNY_DEBUG

#import <Foundation/Foundation.h>

/*
 * AUDIT DE DISPOSITION
 *
 * Aucune session de developpement de cette app n'a jamais vu l'ecran : ni
 * capture, ni debogueur, ni cycript sur l'appareil (verifie). Un defaut
 * purement visuel — un bouton absent, une barre vide — ne se constate donc
 * que par photo, apres coup, et c'est ainsi que la disparition du bouton
 * retour est passee inapercue pendant tout un lot.
 *
 * Ces fonctions y repondent : elles relevent la geometrie REELLE des vues,
 * une fois la disposition faite, et l'ecrivent sur disque. La trace survit a
 * la mise en veille — ce qui compte ici, le Wi-Fi de ce 3GS tombant avec
 * l'ecran, donc le SSH avec.
 *
 *     make LUNY_DEBUG=1 package install
 *     touch /tmp/LunyUI-audit      # arme le parcours automatique
 *     ... lancer l'app ...
 *     cat /tmp/LunyUI-layout.txt
 *
 * Le fichier /tmp/LunyUI-audit est un ARMEMENT, pas un reglage : sans lui un
 * build de mise au point se comporte normalement. Il faut cette distinction,
 * le parcours automatique prenant la main sur la navigation.
 */
void LunyDebugTrace(NSString *format, ...) NS_FORMAT_FUNCTION(1, 2);

/* Remet le fichier d'audit a zero, pour ne pas relire la trace precedente. */
void LunyDebugTraceReset(void);

/* Vrai si /tmp/LunyUI-audit existe : parcours automatique demande. */
BOOL LunyDebugAuditArmed(void);

/*
 * Releve d'une vue : cadre rapporte a la FENETRE, et non a son parent — c'est
 * la seule mesure qui dise si la vue tombe reellement a l'ecran. Rend aussi
 * la chaine d'opacite et de masquage : une vue peut avoir un cadre correct et
 * rester invisible parce qu'un de ses parents est masque.
 */
NSString *LunyDebugDescribeView(UIView *view, NSString *label);

#endif /* LUNY_DEBUG */

#endif /* LUNY_DEBUG_H */

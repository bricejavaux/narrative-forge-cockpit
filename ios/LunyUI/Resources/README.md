# Icônes de secours

Quatre PNG valides et non vides (`Icon.png` 57×57, `Icon@2x.png` 114×114,
`Icon-Small.png` 29×29, `Icon-Small@2x.png` 58×58), générés à la main en
Python pur (aucun outil d'édition d'image disponible dans cette session).
Fond nuit `#0E1020`, carré ambre `#F0B357` — palette du mockup, rien de plus.

**Ne vous en servez que si vous démarrez `Resources/` de zéro.** Le projet
`LunyUI` de test précédent a déjà résolu le piège des icônes à 0 octet
(`s'installe, se lance, affiche son écran par défaut` implique des icônes
déjà valides). Remplacer ces fichiers par les vôtres sans vérifier le nom
attendu par `Info.plist` (`CFBundleIconFiles`) referait exactement l'erreur
que ce dossier existe pour éviter.

Note technique pour cet appareil précis : l'iPhone 3GS n'est **pas** Retina
— son écran 320×480 est à l'échelle 1×, aussi bien en points qu'en pixels
physiques (le doublement d'échelle date de l'iPhone 4). C'est donc
`Icon.png` (57×57) qui est réellement chargé sur ce 3GS ; `Icon@2x.png` est
fourni par complétude / portabilité, pas parce que ce device en a besoin.

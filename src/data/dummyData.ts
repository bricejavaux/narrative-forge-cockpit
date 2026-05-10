// ── Connectors ──
export type ConnectorStatus = 'connected' | 'not_connected' | 'simulated' | 'warning' | 'critical';

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  description: string;
  lastCheck?: string;
  note?: string;
}

export const connectors: Connector[] = [
  { id: 'openai', name: 'OpenAI API', status: 'not_connected', description: 'Couche d\'intelligence — orchestration, transcription Whisper, audit, réécriture', note: 'Connecteur critique — à brancher en priorité' },
  { id: 'supabase-db', name: 'Supabase DB', status: 'not_connected', description: 'Couche narrative active — objets, runs, scores, journal', note: 'Connecteur critique — colonne vertébrale' },
  { id: 'supabase-auth', name: 'Supabase Auth', status: 'not_connected', description: 'Authentification et gouvernance des accès', note: 'Lié à Supabase DB' },
  { id: 'supabase-storage', name: 'Supabase Storage', status: 'not_connected', description: 'Stockage actif — fichiers de travail, audio brut, exports', note: 'Lié à Supabase DB' },
  { id: 'onedrive', name: 'OneDrive', status: 'not_connected', description: 'Référentiel documentaire long terme — corpus monde, archives Chroma, bibliothèques', note: 'Repository unique long terme' },
  { id: 'chroma-archive', name: 'Archives Chroma (OneDrive)', status: 'not_connected', description: 'follett · science_portals · sf_portals_fiction — archives techniques héritées', note: 'Migration / re-vectorisation à arbitrer' },
  { id: 'export-engine', name: 'Export Engine', status: 'simulated', description: 'Texte, Markdown, JSON structuré — formats prioritaires', note: 'DOCX / PDF / EPUB secondaires' },
  { id: 'audio-transcription', name: 'Whisper / Transcription', status: 'simulated', description: 'Transcription des notes vocales — via OpenAI', note: 'Active dès branchement OpenAI' },
  { id: 'vector-index', name: 'Pipeline d\'indexation', status: 'simulated', description: 'Indexes vectoriels par finalité — alimentés par OneDrive + Supabase', note: 'Pipeline simulé' },
];

// ── Project ──
export const project = {
  name: 'Cycle — Les Portes du Monde',
  currentTome: 'Tome I — Les Arches de Brice',
  totalTomes: 3,
  globalScore: 71,
  totalChapters: 15,
  criticalAlerts: 6,
  narrativeDebt: 11,
  untreatedAudioComments: 8,
  lastImport: '2026-05-08 17:42',
  lastExport: '2026-05-05 10:20',
  simulatedCost: '~$5.10',
  simulatedLatency: '~21min',
  status: 'Prototype non connecté',
  pitch: 'Science-fiction technologique réaliste, thriller systémique. Rythme macro/micro. Le monde des Arches transforme économie, souveraineté et culture. Toute civilisation doit choisir sa vitesse — la friction protège la résilience, la maturité c\'est ne pas ouvrir toutes les portes.',
};

// ── Chapters ──
export interface Chapter {
  id: string;
  number: number;
  title: string;
  status: 'draft' | 'reviewed' | 'rewritten' | 'validated' | 'exported';
  score: number;
  tension: number;
  sciDensity: number;
  emotion: number;
  mainAlert?: string;
  agentsPassed: string[];
  version: number;
  hasAudio: boolean;
  arcIds: string[];
  scale?: 'macro' | 'micro' | 'mixte';
  mainArc?: string;
  audioReviewStatus?: 'pending' | 'in_progress' | 'done' | 'none';
  costType?: string;
  technicalDetail?: string;
  phraseCouteau?: 'present' | 'missing' | 'na' | 'todo';
  linkedCharacterIds?: string[];
}

export const chapters: Chapter[] = [
  { id: 'ch01', number: 1, title: '04:17, Lagrange-4', status: 'validated', score: 86, tension: 78, sciDensity: 72, emotion: 55, agentsPassed: ['audit-canon', 'audit-timeline', 'style-pass'], version: 4, hasAudio: true, arcIds: ['arc-a', 'arc-f'], scale: 'micro', mainArc: 'Arc A — Naissance du monde des Arches', audioReviewStatus: 'done', costType: 'Coût cognitif — voir sans nommer', technicalDetail: 'ΔS non-noisy, comportement régulé', phraseCouteau: 'present', linkedCharacterIds: ['char-01', 'char-06'] },
  { id: 'ch02', number: 2, title: 'Elena Kovač', status: 'reviewed', score: 79, tension: 60, sciDensity: 40, emotion: 74, agentsPassed: ['audit-characters'], version: 3, hasAudio: true, arcIds: ['arc-b'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'in_progress', costType: 'Coût humain — secret porté', technicalDetail: 'Note manuscrite — cahier Kovač', phraseCouteau: 'present', linkedCharacterIds: ['char-01', 'char-02'] },
  { id: 'ch03', number: 3, title: 'Traces', status: 'reviewed', score: 74, tension: 65, sciDensity: 68, emotion: 50, mainAlert: 'B+ : Trace à ne pas humaniser', agentsPassed: ['audit-canon'], version: 2, hasAudio: false, arcIds: ['arc-a', 'arc-f'], scale: 'micro', mainArc: 'Arc F — Promesse cosmique B+', audioReviewStatus: 'pending', costType: 'Coût épistémique — silence choisi', technicalDetail: 'Signature spectrale résiduelle', phraseCouteau: 'todo', linkedCharacterIds: ['char-01'] },
  { id: 'ch04', number: 4, title: 'Doctrine', status: 'reviewed', score: 77, tension: 58, sciDensity: 75, emotion: 42, agentsPassed: ['audit-canon'], version: 2, hasAudio: true, arcIds: ['arc-c'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'done', costType: 'Coût politique — formule pesée', technicalDetail: 'Texte fondateur Trust — extrait', phraseCouteau: 'present', linkedCharacterIds: ['char-05', 'char-04'] },
  { id: 'ch05', number: 5, title: 'Walvis Bay : « Nous avons ouvert. »', status: 'validated', score: 90, tension: 88, sciDensity: 62, emotion: 80, agentsPassed: ['audit-canon', 'audit-timeline', 'style-pass'], version: 5, hasAudio: true, arcIds: ['arc-a', 'arc-e'], scale: 'micro', mainArc: 'Arc A — Naissance du monde des Arches', audioReviewStatus: 'done', costType: 'Coût symbolique — bascule publique', technicalDetail: 'R en montée, ΔS limite haute', phraseCouteau: 'present', linkedCharacterIds: ['char-01', 'char-03', 'char-05'] },
  { id: 'ch06', number: 6, title: 'Anvers, les docks', status: 'rewritten', score: 72, tension: 70, sciDensity: 48, emotion: 65, mainAlert: 'Hiérarchie Lagrange-4 / Walvis Bay à reposer', agentsPassed: ['audit-characters'], version: 3, hasAudio: true, arcIds: ['arc-b', 'arc-d'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'in_progress', costType: 'Coût social — corps qui travaillent', technicalDetail: 'Quota Q vs flux dockers', phraseCouteau: 'present', linkedCharacterIds: ['char-01', 'char-07'] },
  { id: 'ch07', number: 7, title: 'Le conseil', status: 'reviewed', score: 75, tension: 72, sciDensity: 55, emotion: 60, agentsPassed: ['audit-canon'], version: 2, hasAudio: false, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'pending', costType: 'Coût géopolitique — vote serré', technicalDetail: 'Mécanique du veto croisé', phraseCouteau: 'todo', linkedCharacterIds: ['char-04', 'char-05', 'char-01'] },
  { id: 'ch08', number: 8, title: 'Prix du passage', status: 'reviewed', score: 68, tension: 75, sciDensity: 50, emotion: 78, mainAlert: 'Coût par activation à matérialiser scène par scène', agentsPassed: [], version: 2, hasAudio: true, arcIds: ['arc-d', 'arc-e'], scale: 'mixte', mainArc: 'Arc D — Coût physique et humain', audioReviewStatus: 'in_progress', costType: 'Coût financier — péages automatisés', technicalDetail: 'Term sheet · barème SAS', phraseCouteau: 'present', linkedCharacterIds: ['char-05', 'char-01'] },
  { id: 'ch09', number: 9, title: 'Corridor humanitaire', status: 'draft', score: 61, tension: 80, sciDensity: 45, emotion: 82, mainAlert: 'Charge émotionnelle vs détail technique — équilibre fragile', agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-d', 'arc-b'], scale: 'micro', mainArc: 'Arc D — Coût physique et humain', audioReviewStatus: 'pending', costType: 'Coût humain — passages forcés', technicalDetail: 'Fenêtre L sous tension', phraseCouteau: 'todo', linkedCharacterIds: ['char-01', 'char-03', 'char-08'] },
  { id: 'ch10', number: 10, title: 'Ombre du renseignement', status: 'draft', score: 58, tension: 82, sciDensity: 58, emotion: 55, mainAlert: 'Escalade trop rapide — relire respiration', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'none', costType: 'Coût stratégique — fuite contrôlée', technicalDetail: 'Cartographie des pressions d\'État', phraseCouteau: 'todo', linkedCharacterIds: ['char-04', 'char-01'] },
  { id: 'ch11', number: 11, title: 'Faille biologique', status: 'draft', score: 64, tension: 84, sciDensity: 80, emotion: 60, mainAlert: 'Densité scientifique élevée — un détail par scène', agentsPassed: ['audit-scidensity'], version: 1, hasAudio: false, arcIds: ['arc-d', 'arc-e'], scale: 'micro', mainArc: 'Arc D — Coût physique et humain', audioReviewStatus: 'pending', costType: 'Coût biologique — B hors fenêtre', technicalDetail: 'Cas SAS — un détail clinique', phraseCouteau: 'todo', linkedCharacterIds: ['char-03', 'char-08'] },
  { id: 'ch12', number: 12, title: 'Chantage d\'un État', status: 'draft', score: 60, tension: 86, sciDensity: 52, emotion: 70, mainAlert: 'Payoff Arc C planifié ici — à confirmer', agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'in_progress', costType: 'Coût souverain — clé partagée', technicalDetail: 'Air-gap Lune — geste matériel', phraseCouteau: 'todo', linkedCharacterIds: ['char-04', 'char-05'] },
  { id: 'ch13', number: 13, title: 'Le Trust', status: 'draft', score: 57, tension: 88, sciDensity: 60, emotion: 68, mainAlert: 'Score critique — réécriture profonde envisagée', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-c', 'arc-e'], scale: 'micro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'none', costType: 'Coût personnel — porter la doctrine', technicalDetail: 'Procédure de veto croisé en action', phraseCouteau: 'todo', linkedCharacterIds: ['char-01', 'char-04', 'char-05'] },
  { id: 'ch14', number: 14, title: 'Réponse', status: 'draft', score: 70, tension: 92, sciDensity: 55, emotion: 85, agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-a', 'arc-b', 'arc-e', 'arc-f'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'pending', costType: 'Coût total — choix tranquille', technicalDetail: 'Geste technique simple, irrévocable', phraseCouteau: 'todo', linkedCharacterIds: ['char-01', 'char-02'] },
  { id: 'ch15', number: 15, title: 'Épilogue — Famille', status: 'draft', score: 73, tension: 45, sciDensity: 25, emotion: 90, agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-b', 'arc-f'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'pending', costType: 'Coût intime — porter en silence', technicalDetail: 'Cuisine, table, lumière domestique', phraseCouteau: 'na', linkedCharacterIds: ['char-01', 'char-02', 'char-09'] },
];

// ── Characters ──
export interface Character {
  id: string;
  name: string;
  role: string;
  function: string;
  apparentGoal: string;
  realGoal: string;
  flaw: string;
  secret: string;
  forbidden: string;
  emotionalTrajectory: string;
  breakingPoint: string;
  dramaticDebt: number;
  narrativeWeight: number;
  exposureLevel: number;
  futureIndex: string;
  audioNotes: number;
  recentComments: number;
  linkedChapterIds?: string[];
  linkedArcIds?: string[];
}

export const characters: Character[] = [
  { id: 'char-01', name: 'Brice Javaux', role: 'Fondateur de Movery — celui qui comprend trop tôt', function: 'Ingénieur rationnel → stratège → gardien inquiet. Incarne la doctrine de la friction.', apparentGoal: 'Stabiliser les Arches et faire son métier de fondateur', realGoal: 'Protéger un seuil — refuser d\'ouvrir toutes les portes', flaw: 'Croire qu\'il peut tout porter seul, en silence', secret: 'Était présent à Lagrange-4 à 04:17 — a vu un ΔS non-noisy et un comportement de régulation. Soupçonne très tôt une structure consciente résiduelle, choisit de ne pas le révéler. Pour lui, Walvis Bay n\'est pas le commencement, c\'est l\'acte public de quelque chose déjà commencé.', forbidden: 'Ne doit jamais utiliser son accès pour un intérêt privé', emotionalTrajectory: 'Compétence muette → doute → choix → autorité tranquille', breakingPoint: 'Walvis Bay — quand un État franchit le seuil sans lui', dramaticDebt: 9, narrativeWeight: 98, exposureLevel: 92, futureIndex: 'character_index', audioNotes: 5, recentComments: 4, linkedChapterIds: ['ch01', 'ch02', 'ch03', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09', 'ch10', 'ch13', 'ch14', 'ch15'], linkedArcIds: ['arc-a', 'arc-b', 'arc-c', 'arc-f'] },
  { id: 'char-02', name: 'Sabrina Javaux', role: 'POV secondaire — ancrage familial', function: 'Voix domestique, contrepoint à la doctrine — mesure le coût humain', apparentGoal: 'Tenir la famille pendant que Brice porte le réseau', realGoal: 'Forcer Brice à nommer ce qu\'il refuse de dire', flaw: 'Sait lire Brice mieux qu\'elle ne se laisse lire', secret: 'A déjà préparé un plan de retrait si l\'Arche échoue', forbidden: 'Ne doit jamais devenir un objet narratif passif', emotionalTrajectory: 'Patience → inquiétude → exigence → partenariat', breakingPoint: 'Corridor humanitaire — quand le métier de Brice entre chez eux', dramaticDebt: 5, narrativeWeight: 78, exposureLevel: 64, futureIndex: 'character_index', audioNotes: 3, recentComments: 3, linkedChapterIds: ['ch02', 'ch14', 'ch15'], linkedArcIds: ['arc-b'] },
  { id: 'char-03', name: 'Amina N\'Kosi', role: 'Science et dignité — contrepoint non-eurocentré', function: 'Partenaire scientifique enthousiaste → gardienne des usages justes → opposante si dérive', apparentGoal: 'Accompagner la mise en service des Arches africaines', realGoal: 'Garantir que la science des Arches ne devienne pas un instrument de capture', flaw: 'Idéalisme tenace — refuse d\'admettre l\'inéluctable', secret: 'A déjà refusé une chaire prestigieuse pour rester sur le terrain', forbidden: 'Ne doit jamais être réduite à la fonction de médecin du SAS', emotionalTrajectory: 'Enthousiasme → vigilance → opposition lucide', breakingPoint: 'Faille biologique — quand la dérive devient politique', dramaticDebt: 7, narrativeWeight: 82, exposureLevel: 70, futureIndex: 'character_index', audioNotes: 2, recentComments: 4, linkedChapterIds: ['ch05', 'ch09', 'ch11'], linkedArcIds: ['arc-a', 'arc-d'] },
  { id: 'char-04', name: 'Karim Solano', role: 'Tisseur de traités ONU', function: 'Montre la géopolitique, les deals et la pression. Observateur lucide → négociateur → architecte du futur Compact.', apparentGoal: 'Cartographier les positions des États autour des Arches', realGoal: 'Préparer un Compact multilatéral solide — préserver la latence protectrice contre les pressions d\'État', flaw: 'Patience excessive, parfois confondue avec passivité', secret: 'Rédige en sous-main les premiers articles du futur Compact', forbidden: 'Ne doit jamais devenir l\'instrument d\'un seul État', emotionalTrajectory: 'Observation froide → engagement → architecture politique', breakingPoint: 'Chantage d\'un État', dramaticDebt: 8, narrativeWeight: 75, exposureLevel: 58, futureIndex: 'character_index', audioNotes: 2, recentComments: 2, linkedChapterIds: ['ch04', 'ch07', 'ch10', 'ch12', 'ch13'], linkedArcIds: ['arc-c', 'arc-e'] },
  { id: 'char-05', name: 'Mila Varga', role: 'Finance / fonds d\'infrastructure — optimisation de marché', function: 'Alliée → pression → antagoniste systémique. Croit que la stabilité vient du prix, de l\'automatisation et de la rente.', apparentGoal: 'Faire monter en charge la liquidité des Arches', realGoal: 'Capturer la rente d\'infrastructure et imposer un péage automatique sur chaque passage', flaw: 'Confond optimisation et bien commun', secret: 'Détient un term sheet structurant les Arches en actif financier — péages automatisés, capture de valeur', forbidden: 'Ne doit jamais être caricaturée — sa logique est rationnelle, pas cynique', emotionalTrajectory: 'Alliance pragmatique → pression → antagonisme systémique', breakingPoint: 'Le Trust — confrontation finale sur le modèle', dramaticDebt: 6, narrativeWeight: 72, exposureLevel: 55, futureIndex: 'character_index', audioNotes: 2, recentComments: 3, linkedChapterIds: ['ch04', 'ch05', 'ch07', 'ch08', 'ch12', 'ch13'], linkedArcIds: ['arc-c', 'arc-e'] },
  { id: 'char-06', name: 'Jonas Rieck', role: 'Chef sécurité Movery — paranoïa utile', function: 'Construit les verrous, anticipe les fuites. Compagnon technique de Brice, voix de la prudence opérationnelle.', apparentGoal: 'Tenir la sécurité des installations Movery', realGoal: 'Construire les verrous que Brice n\'ose pas demander', flaw: 'Voit des menaces partout — parfois à raison', secret: 'A déjà fait disparaître un incident interne pour protéger Movery', forbidden: 'Ne doit jamais devenir martyr', emotionalTrajectory: 'Vigilance → loyauté → durcissement', breakingPoint: '04:17, Lagrange-4 — alerte initiale', dramaticDebt: 3, narrativeWeight: 50, exposureLevel: 42, futureIndex: 'character_index', audioNotes: 1, recentComments: 1, linkedChapterIds: ['ch01'], linkedArcIds: ['arc-a', 'arc-b'] },
  { id: 'char-07', name: 'Leader syndical portuaire (Anvers)', role: 'Secondaire récurrent — visage des perdants', function: 'Voix sociale du basculement — les corps qui travaillent, ceux que les Arches déclassent', apparentGoal: 'Protéger les dockers', realGoal: 'Obliger les Arches à payer leur coût social', flaw: 'Confond négociation et théâtre', secret: 'Tient un canal informel avec Karim', forbidden: 'Ne doit jamais devenir un cliché syndical', emotionalTrajectory: 'Méfiance → confrontation → respect', breakingPoint: 'Anvers, les docks', dramaticDebt: 2, narrativeWeight: 40, exposureLevel: 30, futureIndex: 'character_index', audioNotes: 1, recentComments: 1, linkedChapterIds: ['ch06'], linkedArcIds: ['arc-d'] },
  { id: 'char-08', name: 'Opératrice SAS / médecin de terrain', role: 'Secondaire récurrent — incarnation de la biosécurité', function: 'Personnage distinct d\'Amina. Voix clinique du SAS — témoin direct du B-risk.', apparentGoal: 'Faire tourner le SAS sans casse', realGoal: 'Imposer la transparence sur les cas limites', flaw: 'Saturée par l\'urgence', secret: 'Garde un cas non déclaré', forbidden: 'Ne doit jamais devenir personnage sacrifice', emotionalTrajectory: 'Endurance → colère froide → alliance prudente avec Amina', breakingPoint: 'Faille biologique', dramaticDebt: 3, narrativeWeight: 42, exposureLevel: 32, futureIndex: 'character_index', audioNotes: 1, recentComments: 2, linkedChapterIds: ['ch09', 'ch11'], linkedArcIds: ['arc-d'] },
  { id: 'char-09', name: 'Éléa & Alice', role: 'Enfants Javaux — fascination et fardeau', function: 'Présence intime à la fin du Tome I. Coût personnel mesuré, jamais instrumentalisé.', apparentGoal: 'Vivre une vie d\'enfants', realGoal: 'Rappeler que le monde se mesure aussi à hauteur de cuisine', flaw: 'Aucune — règle : ne jamais les charger', secret: '—', forbidden: 'Ne jamais devenir prétexte dramatique', emotionalTrajectory: 'Quotidien → questions → présence', breakingPoint: 'Épilogue — Famille', dramaticDebt: 1, narrativeWeight: 35, exposureLevel: 22, futureIndex: 'character_index', audioNotes: 0, recentComments: 1, linkedChapterIds: ['ch15'], linkedArcIds: ['arc-b'] },
];

// ── Arcs ──
export interface Arc {
  id: string;
  name: string;
  type: 'principal' | 'secondaire' | 'sous-jacent';
  status: 'active' | 'stale' | 'warning' | 'critical';
  progress: number;
  chapters: number[];
  tension: number;
  riskLevel: string;
  unresolvedQuestions?: string[];
  payoffStatus?: string;
  audioReviewStatus?: 'pending' | 'in_progress' | 'done' | 'none';
  futureIndex?: string;
  linkedCharacterIds?: string[];
}

export const arcs: Arc[] = [
  { id: 'arc-a', name: 'Arc A — Naissance du monde des Arches', type: 'principal', status: 'active', progress: 70, chapters: [1, 3, 5, 14], tension: 80, riskLevel: 'Modéré — hiérarchie Lagrange-4 > Walvis Bay à tenir', unresolvedQuestions: ['Lagrange-4 reste-t-il clairement antérieur à Walvis Bay ?', 'Walvis Bay tient-il comme acte public, pas comme commencement ?'], payoffStatus: 'Partiel — Ch.5 ; final Ch.14', audioReviewStatus: 'in_progress', futureIndex: 'arc_index', linkedCharacterIds: ['char-01', 'char-03', 'char-05', 'char-06'] },
  { id: 'arc-b', name: 'Arc B — Brice : du technicien au gardien', type: 'principal', status: 'active', progress: 60, chapters: [2, 6, 9, 14, 15], tension: 72, riskLevel: 'Acceptable — progression ingénieur → stratège → gardien', unresolvedQuestions: ['Le basculement d\'autorité est-il assez progressif ?', 'Le silence de Brice sur Lagrange-4 reste-t-il un secret porté, pas annoncé ?'], payoffStatus: 'Progression nominale — culminance Ch.14-15', audioReviewStatus: 'in_progress', futureIndex: 'arc_index', linkedCharacterIds: ['char-01', 'char-02', 'char-09'] },
  { id: 'arc-c', name: 'Arc C — La doctrine silencieuse', type: 'principal', status: 'warning', progress: 45, chapters: [4, 7, 10, 12, 13], tension: 68, riskLevel: 'Élevé — doctrine doit rester non-didactique', unresolvedQuestions: ['Comment montrer la doctrine sans la nommer trop tôt ?', 'Friction = résilience reste-t-il un thème ou devient-il une thèse ?'], payoffStatus: 'Planifié Ch.12-13 — à confirmer', audioReviewStatus: 'pending', futureIndex: 'arc_index', linkedCharacterIds: ['char-04', 'char-05', 'char-01'] },
  { id: 'arc-d', name: 'Arc D — Coût physique et humain', type: 'principal', status: 'warning', progress: 50, chapters: [6, 8, 9, 11], tension: 76, riskLevel: 'Élevé — risque pathos / risque caricature financière', unresolvedQuestions: ['Un détail technique par scène respecté ?', 'B+ jamais humanisé ?', 'Mila reste-t-elle rationnelle et non cynique ?'], payoffStatus: 'Partiel — culmination Ch.11', audioReviewStatus: 'pending', futureIndex: 'arc_index', linkedCharacterIds: ['char-03', 'char-07', 'char-08'] },
  { id: 'arc-e', name: 'Arc E — La vitesse', type: 'sous-jacent', status: 'critical', progress: 38, chapters: [5, 7, 8, 10, 11, 12, 13, 14], tension: 85, riskLevel: 'Critique — thème central, peu matérialisé', unresolvedQuestions: ['Chaque civilisation choisit-elle vraiment sa vitesse à l\'écran ?', 'La latence protectrice est-elle dramatisée ?', 'Le coût de la vitesse est-il payé visuellement ?'], payoffStatus: 'Diffus — à condenser Ch.13-14', audioReviewStatus: 'pending', futureIndex: 'arc_index', linkedCharacterIds: ['char-05', 'char-04'] },
  { id: 'arc-f', name: 'Arc F — Promesse cosmique B+', type: 'sous-jacent', status: 'active', progress: 30, chapters: [1, 3, 14, 15], tension: 55, riskLevel: 'Modéré — règle absolue : ne jamais humaniser la Trace', unresolvedQuestions: ['La Trace reste-t-elle un horizon, pas un personnage ?', 'Brice peut-il porter le soupçon sans le nommer ?'], payoffStatus: 'Ouvert — pont vers Tome II', audioReviewStatus: 'pending', futureIndex: 'arc_index', linkedCharacterIds: ['char-01'] },
];

// ── Canon Rules ──
export interface CanonRule {
  id: string;
  title: string;
  category: 'Monde' | 'Contrainte' | 'Panne' | 'Organisation' | 'Technologie' | 'Lieu' | 'Glossaire' | 'Source';
  criticality: 'haute' | 'moyenne' | 'basse';
  status: 'active' | 'archived' | 'draft';
  version: number;
  indexAssociated: string;
  source: string;
  lastUpdate: string;
  summary: string;
  description: string;
  exceptions: string;
  rigidity: 'absolue' | 'flexible' | 'contextuelle';
  linkedChapterIds?: string[];
  linkedCharacterIds?: string[];
  linkedArcIds?: string[];
  linkedAssetIds?: string[];
  linkedAudioNoteIds?: string[];
}

export const canonRules: CanonRule[] = [
  // Monde
  { id: 'CAN-001', title: 'Loi Couplage', category: 'Monde', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Toute ouverture est un couplage de phases, jamais un simple « tunnel »', description: 'Une Arche relie deux points en couplant leurs phases via stabilisateurs. La dérive ΔS mesure l\'écart résiduel. Une rupture de couplage produit un Pinch-off.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch01', 'ch05', 'ch11'], linkedArcIds: ['arc-a'], linkedAssetIds: ['asset-07'] },
  { id: 'CAN-002', title: 'Loi Seuil de phase', category: 'Monde', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Une Arche n\'ouvre que sous Q, ΔS, L, R, B simultanément dans la fenêtre', description: 'Si l\'un des cinq paramètres sort de la fenêtre, l\'ouverture est interdite. Aucun arbitrage local ne peut autoriser un dépassement.', exceptions: 'Aucune — y compris en urgence humanitaire', rigidity: 'absolue', linkedChapterIds: ['ch05', 'ch07', 'ch09'], linkedCharacterIds: ['char-05'], linkedArcIds: ['arc-c'] },
  { id: 'CAN-003', title: 'Loi Friction = résilience', category: 'Monde', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Doctrine silencieuse', lastUpdate: '2026-04-28', summary: 'La friction (lenteur procédurale) protège la résilience du réseau', description: 'Toute accélération non absorbée par latence et redondance dégrade la résilience. Thème central du Tome I.', exceptions: 'Aucune — règle d\'écriture : ne jamais l\'énoncer comme thèse', rigidity: 'absolue', linkedChapterIds: ['ch04', 'ch07', 'ch13'], linkedCharacterIds: ['char-05', 'char-04'], linkedArcIds: ['arc-c', 'arc-e'] },
  { id: 'CAN-004', title: 'Loi Latence protectrice', category: 'Monde', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Doctrine silencieuse', lastUpdate: '2026-04-28', summary: 'La latence n\'est pas un défaut, c\'est une garantie de stabilité', description: 'Les délais entre détection, validation et activation absorbent les chocs. Réduire la latence revient à fragiliser le réseau.', exceptions: 'Cas limites documentés au Trust', rigidity: 'flexible', linkedChapterIds: ['ch07', 'ch09', 'ch13'], linkedArcIds: ['arc-c', 'arc-e'] },
  // Contraintes d'écriture
  { id: 'CAN-010', title: 'B+ — Non-humanisation de la Trace', category: 'Contrainte', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Règles d\'écriture Tome I', lastUpdate: '2026-04-30', summary: 'La Trace cosmique B+ ne doit jamais être traitée comme un personnage', description: 'Pas d\'intention, pas de dialogue, pas de psychologie. La Trace est un horizon, pas un acteur. Règle de style critique.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch01', 'ch03', 'ch14', 'ch15'], linkedCharacterIds: ['char-01'], linkedArcIds: ['arc-f'], linkedAudioNoteIds: ['audio-05'] },
  { id: 'CAN-011', title: 'Un détail technique par scène', category: 'Contrainte', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'style_index', source: 'Règles d\'écriture Tome I', lastUpdate: '2026-04-30', summary: 'Une scène = un détail technique précis, jamais une cascade', description: 'La densité scientifique est portée par un détail incarné par scène, pas par un empilage. Évite l\'effet documentaire.', exceptions: 'Chapitres macro de référence', rigidity: 'flexible', linkedChapterIds: ['ch04', 'ch07', 'ch10', 'ch11', 'ch12'], linkedAudioNoteIds: ['audio-06'] },
  { id: 'CAN-012', title: 'Phrase-couteau de fin', category: 'Contrainte', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'style_index', source: 'Règles d\'écriture Tome I', lastUpdate: '2026-04-30', summary: 'Chaque chapitre se termine par une phrase brève et tranchante', description: 'Pas de fondu, pas de récapitulatif. Une phrase qui coupe et ouvre.', exceptions: 'Épilogue Ch.15', rigidity: 'flexible', linkedChapterIds: ['ch01', 'ch05', 'ch06', 'ch08', 'ch14'] },
  { id: 'CAN-013', title: 'Alternance macro / micro', category: 'Contrainte', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'arc_index', source: 'Architecture Tome I', lastUpdate: '2026-04-30', summary: 'Le rythme du tome alterne chapitres macro (systémiques) et micro (humains)', description: 'Macro = doctrine, État, réseau. Micro = Brice, famille, terrain. Toute déviation doit être justifiée.', exceptions: 'Ch.8 — mixte assumé', rigidity: 'flexible', linkedChapterIds: ['ch04', 'ch07', 'ch08', 'ch10', 'ch12'], linkedArcIds: ['arc-c'] },
  // Modes de panne
  { id: 'CAN-020', title: 'Pinch-off', category: 'Panne', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Rupture violente du couplage de phases — destruction locale du SAS', description: 'Mode de panne le plus redouté. Cascade depuis perte de stabilisateur ou dérive ΔS hors fenêtre.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch11'], linkedArcIds: ['arc-d'] },
  { id: 'CAN-021', title: 'Dérive de point B', category: 'Panne', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Le point B sort de sa fenêtre d\'ancrage — désynchronisation', description: 'Souvent sous-jacente à une oscillation couplée. Détectée par variation de R.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch11'] },
  { id: 'CAN-022', title: 'Saturation', category: 'Panne', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Dépassement de Q — quota d\'activations sur fenêtre', description: 'Dégradation cumulative. Pousse à augmenter la latence ou à fermer.', exceptions: 'Cas Trust : dérogation contrôlée', rigidity: 'flexible', linkedChapterIds: ['ch06', 'ch08'] },
  { id: 'CAN-023', title: 'Oscillation couplée', category: 'Panne', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Boucle de résonance R qui s\'auto-amplifie entre points A et B', description: 'Si non amortie, conduit à Pinch-off. Détection précoce critique.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch05', 'ch11'] },
  { id: 'CAN-024', title: 'Contamination protocole', category: 'Panne', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Franchissement non déclaré du SAS — bio-risk B hors fenêtre', description: 'Cascade biologique et politique. Cœur du chapitre Faille biologique.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch11'], linkedCharacterIds: ['char-03', 'char-08'], linkedArcIds: ['arc-d'] },
  // Organisations
  { id: 'CAN-030', title: 'Le Trust', category: 'Organisation', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Politique — Portes', lastUpdate: '2026-04-25', summary: 'Gouvernance multilatérale des Arches — clé partagée, jamais un seul État', description: 'Conseil restreint, mandats limités, droits de véto croisés. Incarne la friction = résilience à l\'échelle politique.', exceptions: 'Aucune — pas de gardien unique', rigidity: 'absolue', linkedChapterIds: ['ch07', 'ch13'], linkedCharacterIds: ['char-01', 'char-04', 'char-05'], linkedArcIds: ['arc-c'] },
  { id: 'CAN-031', title: 'Réseau', category: 'Organisation', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Politique — Portes', lastUpdate: '2026-04-25', summary: 'Ensemble des Arches opérationnelles, des SAS et des stabilisateurs', description: 'Vu comme un organisme : redondance, latence, quotas. Géré conjointement par le Trust.', exceptions: '—', rigidity: 'flexible', linkedChapterIds: ['ch05', 'ch07'], linkedArcIds: ['arc-a'] },
  { id: 'CAN-032', title: 'Movery', category: 'Organisation', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Politique — Portes', lastUpdate: '2026-05-08', summary: 'Entreprise fondée par Brice — opérateur technique pionnier des Arches', description: 'Acteur technique central, gardien des stabilisateurs. Doit composer avec États, Trust, fonds (Mila) et opinion.', exceptions: '—', rigidity: 'flexible', linkedChapterIds: ['ch01', 'ch06', 'ch08', 'ch13'], linkedCharacterIds: ['char-01', 'char-06'], linkedArcIds: ['arc-b'] },
  // Technologies
  { id: 'CAN-040', title: 'Arche', category: 'Technologie', criticality: 'haute', status: 'active', version: 3, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Dispositif de couplage de phases entre deux points ancrés', description: 'Composée d\'un ancrage, de stabilisateurs, d\'un SAS et d\'une fenêtre d\'ouverture. Toute Arche est passagère et gouvernée.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch01', 'ch05'], linkedArcIds: ['arc-a'] },
  { id: 'CAN-041', title: 'Ancrage', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Point physique tenu en phase — fondation d\'une Arche', description: 'Sans ancrage, pas de couplage. Les ancrages mobiles existent mais coûteux.', exceptions: '—', rigidity: 'absolue', linkedChapterIds: ['ch01'] },
  { id: 'CAN-042', title: 'Stabilisateur', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Compense les dérives ΔS en temps quasi-réel', description: 'Composant le plus stressé. Sa défaillance précède la plupart des Pinch-off.', exceptions: '—', rigidity: 'absolue', linkedChapterIds: ['ch01', 'ch11'] },
  { id: 'CAN-043', title: 'Fenêtre d\'ouverture', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Intervalle durant lequel Q, ΔS, L, R, B sont simultanément valides', description: 'Une ouverture hors fenêtre est interdite, indépendamment de la pression politique.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch05', 'ch09'] },
  { id: 'CAN-044', title: 'SAS', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Chambre de transition contrôlée — bio, douane, latence', description: 'Lieu où s\'incarne le coût biologique B. Toute Arche a son SAS.', exceptions: '—', rigidity: 'absolue', linkedChapterIds: ['ch11'], linkedCharacterIds: ['char-03', 'char-08'], linkedArcIds: ['arc-d'] },
  // Lieux
  { id: 'CAN-050', title: 'Lagrange-4', category: 'Lieu', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Lieux — Portes', lastUpdate: '2026-04-20', summary: 'Plateforme orbitale — origine du soupçon Brice', description: 'Référence pré-publique du Tome I. 04:17 — ΔS non-noisy observé, comportement régulé. Antérieur à Walvis Bay.', exceptions: '—', rigidity: 'flexible', linkedChapterIds: ['ch01', 'ch03', 'ch14'], linkedCharacterIds: ['char-01', 'char-06'], linkedArcIds: ['arc-a', 'arc-f'] },
  { id: 'CAN-051', title: 'Walvis Bay', category: 'Lieu', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Lieux — Portes', lastUpdate: '2026-04-20', summary: 'Première Arche au sol ouverte publiquement — acte public, pas commencement', description: 'Pour Brice, Walvis Bay n\'est pas le début : c\'est la version publique de quelque chose déjà commencé. Choc fondateur de l\'arc A.', exceptions: '—', rigidity: 'flexible', linkedChapterIds: ['ch05', 'ch06', 'ch07'], linkedCharacterIds: ['char-01', 'char-03', 'char-05'], linkedArcIds: ['arc-a', 'arc-e'] },
  { id: 'CAN-052', title: 'Air-gap Lune', category: 'Lieu', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Lieux — Portes', lastUpdate: '2026-04-20', summary: 'Site lunaire isolé — sauvegarde doctrinale et clé physique du Trust', description: 'Concept d\'isolation matérielle. Garantit qu\'aucun État seul n\'opère le réseau.', exceptions: '—', rigidity: 'flexible', linkedChapterIds: ['ch12'], linkedCharacterIds: ['char-04'], linkedArcIds: ['arc-c'] },
  // Glossaire
  { id: 'CAN-060', title: 'Q — Quota', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Nombre d\'activations autorisées par fenêtre', description: 'Paramètre dur. Dépasser Q = saturation.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-061', title: 'ΔS — Dérive spectrale', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Écart résiduel de phase entre points A et B', description: 'Mesuré en temps réel par les stabilisateurs. Brice observe un ΔS « non-noisy » à Lagrange-4 — signature inattendue.', exceptions: '—', rigidity: 'absolue', linkedChapterIds: ['ch01', 'ch03'], linkedCharacterIds: ['char-01'] },
  { id: 'CAN-062', title: 'L — Latence effective', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Délai protecteur entre déclenchement et activation', description: 'Coeur de la doctrine — la latence est une garantie, pas un défaut.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-063', title: 'R — Résonance réseau', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Niveau d\'interaction couplée entre Arches actives', description: 'Trop haut = risque d\'oscillation couplée.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-064', title: 'B — Bio-risk', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Charge biologique attendue au SAS', description: 'Conditionne durée et procédure du SAS.', exceptions: '—', rigidity: 'absolue', linkedChapterIds: ['ch11'] },
  { id: 'CAN-065', title: 'Trace', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Signature cosmique B+ — horizon, jamais personnage', description: 'Voir CAN-010 — règle absolue de non-humanisation. Brice soupçonne une structure consciente résiduelle, choisit de ne pas le révéler.', exceptions: 'Aucune', rigidity: 'absolue', linkedChapterIds: ['ch01', 'ch03', 'ch14', 'ch15'], linkedCharacterIds: ['char-01'], linkedArcIds: ['arc-f'] },
  // Sources & index
  { id: 'CAN-090', title: 'OneDrive — Articulation.txt', category: 'Source', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'long_memory_index', source: 'OneDrive / Portes du Monde', lastUpdate: '2026-05-08', summary: 'Note d\'articulation Tome I — structure macro/micro', description: 'Document source de référence — articulation des chapitres et des arcs.', exceptions: '—', rigidity: 'flexible', linkedAssetIds: ['asset-01'] },
  { id: 'CAN-091', title: 'OneDrive — Personnages.txt', category: 'Source', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'character_index', source: 'OneDrive / Portes du Monde', lastUpdate: '2026-05-08', summary: 'Note source des personnages POV et récurrents', description: 'Brouillon long des fiches personnages, à migrer vers Supabase.', exceptions: '—', rigidity: 'flexible', linkedAssetIds: ['asset-02'] },
  { id: 'CAN-092', title: 'Archives Chroma — follett', category: 'Source', criticality: 'moyenne', status: 'archived', version: 1, indexAssociated: 'long_memory_index', source: 'OneDrive / follett/chroma.sqlite3', lastUpdate: '2026-03-15', summary: 'Archive technique de style — registre Follett', description: 'Archive Chroma héritée sur OneDrive. Pas un index Supabase actif. Migration ou re-vectorisation à arbitrer.', exceptions: '—', rigidity: 'contextuelle', linkedAssetIds: ['asset-04'] },
  { id: 'CAN-093', title: 'Archives Chroma — science_portals', category: 'Source', criticality: 'moyenne', status: 'archived', version: 1, indexAssociated: 'science_index', source: 'OneDrive / science_portals/chroma.sqlite3', lastUpdate: '2026-03-15', summary: 'Archive technique scientifique — physique des Portes', description: 'Archive Chroma héritée sur OneDrive. Pas un index Supabase actif. Décision technique en attente.', exceptions: '—', rigidity: 'contextuelle', linkedAssetIds: ['asset-05'] },
  { id: 'CAN-094', title: 'Archives Chroma — sf_portals_fiction', category: 'Source', criticality: 'moyenne', status: 'archived', version: 1, indexAssociated: 'long_memory_index', source: 'OneDrive / sf_portals_fiction/chroma.sqlite3', lastUpdate: '2026-03-15', summary: 'Archive Chroma — corpus SF de référence', description: 'Archive héritée sur OneDrive. Pas un index Supabase actif. Re-vectorisation à arbitrer.', exceptions: '—', rigidity: 'contextuelle', linkedAssetIds: ['asset-06'] },
];

// ── Agents ──
export interface Agent {
  id: string;
  name: string;
  category: 'génération' | 'audit' | 'diagnostic' | 'réécriture' | 'style' | 'export';
  objective: string;
  simulatedCost: string;
  criticality: 'haute' | 'moyenne' | 'basse';
  status: 'ready' | 'simulated' | 'disabled';
  rewriteRights: boolean;
  futureIndexes: string[];
  lastRun?: string;
}

export const agents: Agent[] = [
  { id: 'ag-gen-beats', name: 'Génération Beats', category: 'génération', objective: 'Générer les beats d\'une scène — macro ou micro — depuis le contexte Portes', simulatedCost: '$0.12', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index', 'character_index'], lastRun: '2026-05-07' },
  { id: 'ag-gen-chapter', name: 'Génération Chapitre', category: 'génération', objective: 'Assembler un chapitre Tome I — respect alternance macro/micro', simulatedCost: '$0.85', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index', 'character_index', 'arc_index', 'style_index'] },
  { id: 'ag-audit-canon', name: 'Audit Canon', category: 'audit', objective: 'Vérifier conformité aux lois Couplage / Seuil / Friction / Latence', simulatedCost: '$0.08', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index'], lastRun: '2026-05-08' },
  { id: 'ag-audit-timeline', name: 'Audit Timeline', category: 'audit', objective: 'Hiérarchie Lagrange-4 → Walvis Bay → Anvers et chronologie', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'], lastRun: '2026-05-07' },
  { id: 'ag-audit-chars', name: 'Audit Personnages', category: 'audit', objective: 'Cohérence Brice / Sabrina / Amina / Karim / Mila / Jonas / SAS', simulatedCost: '$0.10', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['character_index'], lastRun: '2026-05-06' },
  { id: 'ag-audit-respiration', name: 'Audit Rythme & Respiration', category: 'audit', objective: 'Alternance macro/micro et respirations entre chapitres', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index', 'style_index'] },
  { id: 'ag-audit-cognitive', name: 'Audit Charge Cognitive', category: 'diagnostic', objective: 'Charge cognitive par scène — un détail technique par scène', simulatedCost: '$0.05', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index'] },
  { id: 'ag-audit-balance', name: 'Audit Équilibrage Intrigue', category: 'audit', objective: 'Équilibre des 6 arcs — A, B, C, D, E, F', simulatedCost: '$0.09', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-coherence', name: 'Audit Cohérence Tome', category: 'audit', objective: 'Cohérence cross-chapitres et hiérarchie Lagrange-4 / Walvis Bay', simulatedCost: '$0.15', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index', 'character_index', 'arc_index'] },
  { id: 'ag-audit-escalade', name: 'Audit Escalade', category: 'audit', objective: 'Progression de tension chapitre par chapitre', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-revelations', name: 'Audit Révélations', category: 'audit', objective: 'Distribution B+ et payoffs — doctrine silencieuse', simulatedCost: '$0.07', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-repetitions', name: 'Audit Répétitions Structurelles', category: 'audit', objective: 'Détection des motifs et phrases-couteaux répétés', simulatedCost: '$0.05', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index', 'style_index'], lastRun: '2026-05-08' },
  { id: 'ag-audit-scidensity', name: 'Audit Densité Scientifique', category: 'audit', objective: 'Vérifier « un détail technique par scène »', simulatedCost: '$0.04', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['science_index'] },
  { id: 'ag-audio-check', name: 'Vérification Notes Audio', category: 'audit', objective: 'Contrôler la prise en compte des notes audio dans la version courante', simulatedCost: '$0.08', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['audio_memory_index', 'draft_index'] },
  { id: 'ag-rewrite-targeted', name: 'Réécriture Ciblée', category: 'réécriture', objective: 'Réécrire des passages ciblés — beats, fins de chapitre', simulatedCost: '$0.20', criticality: 'haute', status: 'simulated', rewriteRights: true, futureIndexes: ['draft_index', 'style_index'] },
  { id: 'ag-rewrite-deep', name: 'Réécriture Profonde', category: 'réécriture', objective: 'Restructurer un chapitre — approbation auteur requise', simulatedCost: '$0.60', criticality: 'haute', status: 'simulated', rewriteRights: true, futureIndexes: ['draft_index', 'style_index', 'arc_index'] },
  { id: 'ag-style-follett', name: 'Style Pass — Follett', category: 'style', objective: 'Harmoniser le style — registre Follett, phrase-couteau de fin', simulatedCost: '$0.15', criticality: 'moyenne', status: 'simulated', rewriteRights: true, futureIndexes: ['style_index'] },
  { id: 'ag-export-text', name: 'Export Texte', category: 'export', objective: 'Préparer texte / markdown / JSON structuré', simulatedCost: '$0.02', criticality: 'basse', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index'] },
];

// ── Indexes ──
export interface VectorIndex {
  id: string;
  name: string;
  purpose: string;
  docTypes: string;
  status: 'simulated' | 'empty' | 'absent' | 'stale';
  simulatedSize: string;
  simulatedFreshness: string;
  lastUpdate: string;
  owner: string;
  futureAgents: string[];
  warning?: string;
  linkedAssetIds?: string[];
  migrationStrategy?: 're-vectorize-source' | 'extract-chroma' | 'native-supabase' | 'pending-decision';
}

export const indexes: VectorIndex[] = [
  { id: 'world_index', name: 'world_index', purpose: 'Lois Couplage / Seuil / Friction / Latence — règles du monde des Arches', docTypes: 'Bibles, doctrine, glossaire', status: 'simulated', simulatedSize: '~2.6k chunks', simulatedFreshness: '36h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Canon', 'Audit Cohérence Tome', 'Génération Chapitre'], linkedAssetIds: ['asset-07', 'asset-08'], migrationStrategy: 'native-supabase' },
  { id: 'character_index', name: 'character_index', purpose: 'Brice, Sabrina, Amina, Karim, Mila + récurrents', docTypes: 'Fiches, dialogues, notes', status: 'simulated', simulatedSize: '~1.6k chunks', simulatedFreshness: '24h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Personnages', 'Génération Beats'], linkedAssetIds: ['asset-02'], migrationStrategy: 'native-supabase' },
  { id: 'arc_index', name: 'arc_index', purpose: 'Arcs A-F, beats, révélations, alternance macro/micro', docTypes: 'Architecture, timelines, payoffs', status: 'simulated', simulatedSize: '~1.4k chunks', simulatedFreshness: '24h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Timeline', 'Audit Révélations', 'Audit Escalade', 'Audit Équilibrage'], linkedAssetIds: ['asset-01'], migrationStrategy: 'native-supabase' },
  { id: 'science_index', name: 'science_index', purpose: 'Physique des Portes — Q, ΔS, L, R, B, Pinch-off, oscillation couplée', docTypes: 'Bibles science, références techniques', status: 'simulated', simulatedSize: '~2.8k chunks', simulatedFreshness: '120h', lastUpdate: '2026-05-02', owner: 'Système (futur Supabase)', futureAgents: ['Audit Densité Scientifique'], warning: 'Source = archive Chroma OneDrive — migration à arbitrer', linkedAssetIds: ['asset-05'], migrationStrategy: 'pending-decision' },
  { id: 'style_index', name: 'style_index', purpose: 'Phrase-couteau, registre Follett, sobriété, un détail par scène', docTypes: 'Guides de style, exemples', status: 'simulated', simulatedSize: '~900 chunks', simulatedFreshness: '96h', lastUpdate: '2026-05-04', owner: 'Système (futur Supabase)', futureAgents: ['Style Pass — Follett', 'Réécriture Ciblée'], warning: 'Source = archive Chroma OneDrive — migration à arbitrer', linkedAssetIds: ['asset-04'], migrationStrategy: 'pending-decision' },
  { id: 'long_memory_index', name: 'long_memory_index', purpose: 'Corpus monde étendu — sources OneDrive, articulation, personnages', docTypes: 'EPUB, PDF, .txt sources', status: 'absent', simulatedSize: '—', simulatedFreshness: '—', lastUpdate: '—', owner: 'OneDrive', futureAgents: ['Génération Chapitre'], warning: 'OneDrive non branché — archive sf_portals_fiction en attente', linkedAssetIds: ['asset-06', 'asset-11'], migrationStrategy: 'pending-decision' },
  { id: 'draft_index', name: 'draft_index', purpose: 'Brouillons actifs des 14 chapitres + épilogue', docTypes: 'Brouillons Markdown', status: 'simulated', simulatedSize: '~1.1k chunks', simulatedFreshness: '8h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Répétitions Structurelles', 'Réécriture Ciblée'], linkedAssetIds: ['asset-09'], migrationStrategy: 'native-supabase' },
  { id: 'editorial_index', name: 'editorial_index', purpose: 'Notes éditoriales, retours, directives', docTypes: 'Notes, commentaires structurés', status: 'empty', simulatedSize: '0', simulatedFreshness: '—', lastUpdate: '—', owner: 'Éditeur', futureAgents: ['Réécriture Ciblée'], warning: 'Index vide — phase éditoriale future', migrationStrategy: 'native-supabase' },
  { id: 'audio_memory_index', name: 'audio_memory_index', purpose: 'Transcriptions audio structurées — relectures, notes', docTypes: 'Transcriptions, notes vocales', status: 'simulated', simulatedSize: '~380 chunks', simulatedFreshness: '24h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Vérification Notes Audio'], linkedAssetIds: ['asset-10'], migrationStrategy: 'native-supabase' },
  { id: 'review_index', name: 'review_index', purpose: 'Résultats d\'audits, diagnostics, recommandations', docTypes: 'Rapports d\'audit, scores', status: 'simulated', simulatedSize: '~620 chunks', simulatedFreshness: '12h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Cohérence Tome'], migrationStrategy: 'native-supabase' },
];

// ── Audio Notes ──
export interface AudioNote {
  id: string;
  target: string;
  targetType: 'personnage' | 'canon' | 'arc' | 'chapitre' | 'beat' | 'brouillon' | 'run' | 'audit' | 'diagnostic' | 'asset';
  date: string;
  author: string;
  transcriptionStatus: 'pending' | 'transcribed' | 'structured' | 'integrated';
  proposedAction: string;
  treatmentStatus: 'open' | 'in_progress' | 'done' | 'rejected';
  duration: string;
  impact: 'high' | 'medium' | 'low';
  linkedChapterIds?: string[];
  linkedCharacterIds?: string[];
  linkedCanonIds?: string[];
}

export const audioNotes: AudioNote[] = [
  { id: 'audio-01', target: 'Brice Javaux', targetType: 'personnage', date: '2026-05-08 09:15', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Renforcer la sobriété de Brice au Ch.6 — pas de monologue', treatmentStatus: 'open', duration: '2:34', impact: 'high', linkedChapterIds: ['ch06'], linkedCharacterIds: ['char-01'] },
  { id: 'audio-02', target: 'Ch.9 — Corridor humanitaire', targetType: 'chapitre', date: '2026-05-07 16:40', author: 'Auteur', transcriptionStatus: 'structured', proposedAction: 'Tenir le coût humain sans tomber dans le pathos', treatmentStatus: 'in_progress', duration: '4:12', impact: 'high', linkedChapterIds: ['ch09'], linkedCharacterIds: ['char-01', 'char-03'] },
  { id: 'audio-03', target: 'Arc C — Doctrine silencieuse', targetType: 'arc', date: '2026-05-06 11:20', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Différer la nomination explicite de la doctrine', treatmentStatus: 'open', duration: '1:58', impact: 'medium', linkedCanonIds: ['CAN-003', 'CAN-013'] },
  { id: 'audio-04', target: 'Beat — Vote au Trust (Ch.7)', targetType: 'beat', date: '2026-05-05 14:05', author: 'Auteur', transcriptionStatus: 'pending', proposedAction: '—', treatmentStatus: 'open', duration: '3:22', impact: 'medium', linkedChapterIds: ['ch07'], linkedCanonIds: ['CAN-030'] },
  { id: 'audio-05', target: 'CAN-010 B+ Non-humanisation', targetType: 'canon', date: '2026-05-04 08:30', author: 'Auteur', transcriptionStatus: 'integrated', proposedAction: 'Renforcer la règle dans le style_index', treatmentStatus: 'done', duration: '1:15', impact: 'low', linkedCanonIds: ['CAN-010'] },
  { id: 'audio-06', target: 'Ch.11 — Faille biologique', targetType: 'chapitre', date: '2026-05-03 20:10', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Un seul détail biologique précis par scène', treatmentStatus: 'open', duration: '5:45', impact: 'high', linkedChapterIds: ['ch11'], linkedCanonIds: ['CAN-011', 'CAN-024'] },
  { id: 'audio-07', target: 'Amina N\'Kosi', targetType: 'personnage', date: '2026-05-02 10:00', author: 'Auteur', transcriptionStatus: 'structured', proposedAction: 'Bien distinguer Amina de l\'Opératrice SAS — pas de fusion', treatmentStatus: 'in_progress', duration: '2:10', impact: 'medium', linkedCharacterIds: ['char-03', 'char-08'] },
  { id: 'audio-08', target: 'Run Audit Cohérence Tome', targetType: 'run', date: '2026-05-01 15:30', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Revoir hiérarchie Lagrange-4 / Walvis Bay sur Ch.6-7', treatmentStatus: 'open', duration: '3:50', impact: 'high', linkedChapterIds: ['ch06', 'ch07'], linkedCanonIds: ['CAN-050', 'CAN-051'] },
  { id: 'audio-09', target: 'Ch.13 — Le Trust', targetType: 'chapitre', date: '2026-04-30 12:00', author: 'Auteur', transcriptionStatus: 'pending', proposedAction: '—', treatmentStatus: 'open', duration: '6:20', impact: 'high', linkedChapterIds: ['ch13'], linkedCanonIds: ['CAN-030'] },
];

// ── Runs ──
export interface Run {
  id: string;
  name: string;
  mode: string;
  status: 'completed' | 'simulated' | 'failed' | 'pending';
  date: string;
  agents: string[];
  findings: number;
  cost: string;
  duration: string;
}

export const runs: Run[] = [
  { id: 'run-01', name: 'Audit Canon — lois des Portes', mode: 'Audit complet', status: 'simulated', date: '2026-05-08', agents: ['Audit Canon', 'Audit Timeline'], findings: 11, cost: '$0.14', duration: '~3min' },
  { id: 'run-02', name: 'SAFE_BATCH Ch.1-7', mode: 'SAFE_BATCH', status: 'simulated', date: '2026-05-07', agents: ['Audit Canon', 'Audit Personnages', 'Audit Répétitions Structurelles'], findings: 9, cost: '$0.26', duration: '~6min' },
  { id: 'run-03', name: 'Brouillon Ch.12 — Chantage d\'un État', mode: 'Génération chapitre', status: 'simulated', date: '2026-05-06', agents: ['Génération Chapitre'], findings: 0, cost: '$0.85', duration: '~9min' },
  { id: 'run-04', name: 'Style Pass — Follett Ch.5-8', mode: 'Style', status: 'simulated', date: '2026-05-05', agents: ['Style Pass — Follett'], findings: 18, cost: '$1.10', duration: '~10min' },
  { id: 'run-05', name: 'Vérification Notes Audio', mode: 'Vérification audio', status: 'simulated', date: '2026-05-04', agents: ['Vérification Notes Audio'], findings: 4, cost: '$0.08', duration: '~2min' },
];

// ── Assets ──
export interface Asset {
  id: string;
  name: string;
  type: 'PDF' | 'EPUB' | 'DOCX' | 'Markdown' | 'JSON' | 'Image' | 'Audio' | 'Text' | 'SQLite';
  source: 'local' | 'OneDrive' | 'generated';
  size: string;
  integrationStatus: 'integrated' | 'pending' | 'failed' | 'simulated';
  indexationStatus: 'indexed' | 'not_indexed' | 'partial' | 'simulated';
  targetIndex: string;
  version: number;
  importDate: string;
  notes?: string;
}

export const assets: Asset[] = [
  { id: 'asset-01', name: 'articulation.txt', type: 'Text', source: 'OneDrive', size: '38 KB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'long_memory_index', version: 1, importDate: '2026-05-08', notes: 'Source — structure macro/micro Tome I' },
  { id: 'asset-02', name: 'personnages.txt', type: 'Text', source: 'OneDrive', size: '54 KB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'character_index', version: 1, importDate: '2026-05-08', notes: 'Source — fiches personnages POV' },
  { id: 'asset-03', name: 'cover.jpg — Les Portes du Monde', type: 'Image', source: 'OneDrive', size: '3.2 MB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: '—', version: 1, importDate: '2026-05-08', notes: 'Visuel — non indexé' },
  { id: 'asset-04', name: 'follett/chroma.sqlite3', type: 'SQLite', source: 'OneDrive', size: '128 MB', integrationStatus: 'simulated', indexationStatus: 'partial', targetIndex: 'style_index', version: 1, importDate: '2026-03-15', notes: 'Archive technique OneDrive — pas un index Supabase actif. Re-vectorisation ou extraction chunks à arbitrer.' },
  { id: 'asset-05', name: 'science_portals/chroma.sqlite3', type: 'SQLite', source: 'OneDrive', size: '212 MB', integrationStatus: 'simulated', indexationStatus: 'partial', targetIndex: 'science_index', version: 1, importDate: '2026-03-15', notes: 'Archive technique OneDrive — pas un index Supabase actif. Décision technique en attente.' },
  { id: 'asset-06', name: 'sf_portals_fiction/chroma.sqlite3', type: 'SQLite', source: 'OneDrive', size: '340 MB', integrationStatus: 'simulated', indexationStatus: 'partial', targetIndex: 'long_memory_index', version: 1, importDate: '2026-03-15', notes: 'Archive technique OneDrive — pas un index Supabase actif. Re-vectorisation à arbitrer.' },
  { id: 'asset-07', name: 'Bible Monde — Portes v2.pdf', type: 'PDF', source: 'OneDrive', size: '2.4 MB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'world_index', version: 2, importDate: '2026-04-30' },
  { id: 'asset-08', name: 'Bible Politique — Trust v1.docx', type: 'DOCX', source: 'OneDrive', size: '980 KB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'world_index', version: 1, importDate: '2026-04-25' },
  { id: 'asset-09', name: 'Tome I — Ch.5 Walvis Bay draft v5.md', type: 'Markdown', source: 'local', size: '52 KB', integrationStatus: 'integrated', indexationStatus: 'simulated', targetIndex: 'draft_index', version: 5, importDate: '2026-05-08' },
  { id: 'asset-10', name: 'Relecture orale Ch.6 Anvers.wav', type: 'Audio', source: 'local', size: '14 MB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'audio_memory_index', version: 1, importDate: '2026-05-07' },
  { id: 'asset-11', name: 'EPUB — Références SF longues.epub', type: 'EPUB', source: 'OneDrive', size: '6.1 MB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'long_memory_index', version: 1, importDate: '2026-04-15' },
];

// ── Exports ──
export interface ExportConfig {
  id: string;
  name: string;
  format: string;
  category: 'travail' | 'éditorial' | 'audit' | 'publication' | 'visuel';
  engineStatus: 'simulated' | 'not_connected';
  dependencies: string[];
  lastGeneration?: string;
  destination: string;
}

export const exports_: ExportConfig[] = [
  { id: 'exp-01', name: 'Export Markdown — Tome I', format: 'Markdown', category: 'travail', engineStatus: 'simulated', dependencies: ['Draft Index'], lastGeneration: '2026-05-08', destination: 'Local' },
  { id: 'exp-02', name: 'Export Texte brut — Tome I', format: 'Text', category: 'travail', engineStatus: 'simulated', dependencies: ['Draft Index'], lastGeneration: '2026-05-08', destination: 'Local' },
  { id: 'exp-03', name: 'Export JSON structuré', format: 'JSON', category: 'travail', engineStatus: 'simulated', dependencies: ['Supabase DB'], lastGeneration: '2026-05-07', destination: 'Local / API' },
  { id: 'exp-04', name: 'Bundle Audit Complet', format: 'JSON + MD', category: 'audit', engineStatus: 'simulated', dependencies: ['Review Index'], lastGeneration: '2026-05-08', destination: 'Interne' },
  { id: 'exp-05', name: 'Export DOCX Éditeur', format: 'DOCX', category: 'éditorial', engineStatus: 'simulated', dependencies: ['Export Engine'], destination: 'Éditeur / OneDrive — secondaire' },
  { id: 'exp-06', name: 'Export PDF Publication', format: 'PDF', category: 'publication', engineStatus: 'not_connected', dependencies: ['Export Engine'], destination: 'Imprimeur — futur' },
  { id: 'exp-07', name: 'Export EPUB', format: 'EPUB', category: 'publication', engineStatus: 'not_connected', dependencies: ['Export Engine', 'Style Index'], destination: 'Distributeur — futur' },
  { id: 'exp-08', name: 'Bundle Couverture — Les Portes du Monde', format: 'PNG + PSD', category: 'visuel', engineStatus: 'not_connected', dependencies: ['Cover source OneDrive'], destination: 'Graphiste — futur' },
];

// ── Activity ──
export interface Activity {
  id: string;
  action: string;
  target: string;
  date: string;
  type: 'run' | 'edit' | 'audio' | 'import' | 'export' | 'alert';
}

export const recentActivity: Activity[] = [
  { id: 'act-01', action: 'Run Audit Canon — lois des Portes', target: 'Tome I', date: '2026-05-08 10:30', type: 'run' },
  { id: 'act-02', action: 'Note audio ajoutée', target: 'Brice Javaux', date: '2026-05-08 09:15', type: 'audio' },
  { id: 'act-03', action: 'Ch.5 Walvis Bay validé', target: '« Nous avons ouvert. »', date: '2026-05-07 18:00', type: 'edit' },
  { id: 'act-04', action: 'SAFE_BATCH terminé', target: 'Ch.1-7', date: '2026-05-07 14:20', type: 'run' },
  { id: 'act-05', action: 'Import asset OneDrive', target: 'articulation.txt', date: '2026-05-08 08:00', type: 'import' },
  { id: 'act-06', action: 'Alerte critique', target: 'Ch.13 — Le Trust score < 60', date: '2026-05-07 11:00', type: 'alert' },
  { id: 'act-07', action: 'Export Markdown', target: 'Tome I — Ch.1-7', date: '2026-05-05 10:20', type: 'export' },
  { id: 'act-08', action: 'Note audio en attente', target: 'Ch.13 — Le Trust', date: '2026-04-30 12:00', type: 'audio' },
];

// ── Architecture: Beats, Payoffs, Consequences ──
export interface Beat {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  scale: 'macro' | 'micro';
  detail: string;
}

export const beats: Beat[] = [
  // Ch.1 — 04:17, Lagrange-4
  { id: 'beat-01-1', chapterId: 'ch01', order: 1, title: 'Veille technique', scale: 'micro', detail: 'Brice scrute ΔS — bruit attendu' },
  { id: 'beat-01-2', chapterId: 'ch01', order: 2, title: 'Anomalie', scale: 'micro', detail: 'ΔS non-noisy — signature inattendue' },
  { id: 'beat-01-3', chapterId: 'ch01', order: 3, title: 'Comportement régulé', scale: 'micro', detail: 'Pattern qui ressemble à une régulation' },
  { id: 'beat-01-4', chapterId: 'ch01', order: 4, title: 'Choix du silence', scale: 'micro', detail: 'Brice ne consigne pas l\'observation' },
  // Ch.5 — Walvis Bay
  { id: 'beat-05-1', chapterId: 'ch05', order: 1, title: 'Annonce latérale', scale: 'micro', detail: 'Jonas transmet la nouvelle, voix neutre' },
  { id: 'beat-05-2', chapterId: 'ch05', order: 2, title: 'Lecture des paramètres', scale: 'micro', detail: 'R en montée, ΔS limite haute' },
  { id: 'beat-05-3', chapterId: 'ch05', order: 3, title: 'Réplique d\'Amina', scale: 'micro', detail: '« Nous avons ouvert. »' },
  { id: 'beat-05-4', chapterId: 'ch05', order: 4, title: 'Phrase-couteau', scale: 'micro', detail: 'Cuisine, tasse reposée — le monde bascule' },
  // Ch.7 — Le conseil
  { id: 'beat-07-1', chapterId: 'ch07', order: 1, title: 'Arrivée des délégations', scale: 'macro', detail: 'Karim ouvre, ton mesuré' },
  { id: 'beat-07-2', chapterId: 'ch07', order: 2, title: 'Veto croisé évoqué', scale: 'macro', detail: 'Procédure rappelée sans pédagogie' },
  { id: 'beat-07-3', chapterId: 'ch07', order: 3, title: 'Position Mila', scale: 'macro', detail: 'Term sheet posé sur la table' },
  { id: 'beat-07-4', chapterId: 'ch07', order: 4, title: 'Vote serré', scale: 'macro', detail: 'Une voix d\'écart — la friction tient' },
  // Ch.13 — Le Trust
  { id: 'beat-13-1', chapterId: 'ch13', order: 1, title: 'Pression d\'État', scale: 'micro', detail: 'Demande informelle de gardien unique' },
  { id: 'beat-13-2', chapterId: 'ch13', order: 2, title: 'Karim refuse', scale: 'micro', detail: 'Compact posé — clé partagée' },
  { id: 'beat-13-3', chapterId: 'ch13', order: 3, title: 'Mila pose son levier', scale: 'micro', detail: 'Péages automatisés — capture annoncée' },
  { id: 'beat-13-4', chapterId: 'ch13', order: 4, title: 'Brice tranche', scale: 'micro', detail: 'Geste technique simple, irrévocable' },
];

export interface Payoff {
  id: string;
  label: string;
  setupChapter: number;
  payoffChapter: string;
  delay: string;
  risk: string;
  status: 'active' | 'pending' | 'warning' | 'critical';
  arcId: string;
}

export const payoffs: Payoff[] = [
  { id: 'po-01', label: 'Walvis Bay — acte public d\'une bascule déjà commencée', setupChapter: 1, payoffChapter: 'Ch.5 (posé) → Ch.14', delay: '4-13 chapitres', risk: 'Hiérarchie Lagrange-4 > Walvis Bay à tenir', status: 'active', arcId: 'arc-a' },
  { id: 'po-02', label: 'Le Trust — clé partagée, pas de gardien unique', setupChapter: 4, payoffChapter: 'Ch.13', delay: '9 chapitres', risk: 'Risque didactisme', status: 'pending', arcId: 'arc-c' },
  { id: 'po-03', label: 'Trace cosmique B+ — horizon, jamais personnage', setupChapter: 1, payoffChapter: 'Ch.14 → Tome II', delay: 'Diffus', risk: 'Règle absolue de non-humanisation', status: 'warning', arcId: 'arc-f' },
  { id: 'po-04', label: 'Doctrine silencieuse — friction = résilience', setupChapter: 4, payoffChapter: 'Ch.12-13', delay: '8-9 chapitres', risk: 'Risque thèse — à condenser', status: 'critical', arcId: 'arc-c' },
  { id: 'po-05', label: 'Brice : technicien → gardien', setupChapter: 2, payoffChapter: 'Ch.14-15', delay: '12-13 chapitres', risk: 'Le silence sur Lagrange-4 doit rester porté, jamais annoncé', status: 'active', arcId: 'arc-b' },
  { id: 'po-06', label: 'Term sheet Mila — péages automatisés', setupChapter: 7, payoffChapter: 'Ch.13', delay: '6 chapitres', risk: 'Mila reste rationnelle, jamais caricaturale', status: 'pending', arcId: 'arc-c' },
];

export interface ChapterConsequence {
  chapterId: string;
  political: string;
  social: string;
  physical: string;
  biosecurity: string;
  family: string;
}

export const consequences: ChapterConsequence[] = [
  { chapterId: 'ch05', political: 'Le Trust convoqué en urgence', social: 'Opinion fracturée', physical: 'R réseau monte', biosecurity: 'SAS Walvis Bay sous tension', family: 'Brice ne rentre pas le soir' },
  { chapterId: 'ch06', political: 'Pression syndicale', social: 'Dockers déclassés', physical: 'Saturation Q locale', biosecurity: 'B sous surveillance', family: 'Sabrina commence à interroger' },
  { chapterId: 'ch08', political: 'Term sheet introduit', social: 'Modèle péage automatisé annoncé', physical: '—', biosecurity: '—', family: 'Coût financier discuté à la maison' },
  { chapterId: 'ch09', political: 'Mandat humanitaire contesté', social: 'Passages forcés', physical: 'L sous fenêtre', biosecurity: 'SAS sous urgence', family: 'Le métier entre chez les Javaux' },
  { chapterId: 'ch11', political: 'Cellule de crise', social: 'Doute généralisé', physical: 'Pinch-off évité de justesse', biosecurity: 'B hors fenêtre — cas SAS', family: '—' },
  { chapterId: 'ch12', political: 'Chantage d\'État ouvert', social: '—', physical: 'Air-gap Lune activé', biosecurity: '—', family: '—' },
  { chapterId: 'ch13', political: 'Compact final voté', social: '—', physical: 'Veto croisé exécuté', biosecurity: '—', family: '—' },
];

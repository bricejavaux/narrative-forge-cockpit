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
  totalChapters: 15, // 14 + épilogue
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
}

export const chapters: Chapter[] = [
  { id: 'ch01', number: 1, title: '04:17, Lagrange-4', status: 'validated', score: 86, tension: 78, sciDensity: 72, emotion: 55, agentsPassed: ['audit-canon', 'audit-timeline', 'style-pass'], version: 4, hasAudio: true, arcIds: ['arc-a', 'arc-f'], scale: 'macro', mainArc: 'Arc A — Naissance du monde des Arches', audioReviewStatus: 'done' },
  { id: 'ch02', number: 2, title: 'Elena Kovač', status: 'reviewed', score: 79, tension: 60, sciDensity: 40, emotion: 74, agentsPassed: ['audit-characters'], version: 3, hasAudio: true, arcIds: ['arc-b'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'in_progress' },
  { id: 'ch03', number: 3, title: 'Traces', status: 'reviewed', score: 74, tension: 65, sciDensity: 68, emotion: 50, mainAlert: 'B+ : Trace à ne pas humaniser', agentsPassed: ['audit-canon'], version: 2, hasAudio: false, arcIds: ['arc-a', 'arc-f'], scale: 'macro', mainArc: 'Arc F — Promesse cosmique B+', audioReviewStatus: 'pending' },
  { id: 'ch04', number: 4, title: 'Doctrine', status: 'reviewed', score: 77, tension: 58, sciDensity: 75, emotion: 42, agentsPassed: ['audit-canon'], version: 2, hasAudio: true, arcIds: ['arc-c'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'done' },
  { id: 'ch05', number: 5, title: 'Walvis Bay : « Nous avons ouvert. »', status: 'validated', score: 90, tension: 88, sciDensity: 62, emotion: 80, agentsPassed: ['audit-canon', 'audit-timeline', 'style-pass'], version: 5, hasAudio: true, arcIds: ['arc-a', 'arc-e'], scale: 'macro', mainArc: 'Arc A — Naissance du monde des Arches', audioReviewStatus: 'done' },
  { id: 'ch06', number: 6, title: 'Anvers, les docks', status: 'rewritten', score: 72, tension: 70, sciDensity: 48, emotion: 65, mainAlert: 'Hiérarchie Lagrange-4 / Walvis Bay à reposer', agentsPassed: ['audit-characters'], version: 3, hasAudio: true, arcIds: ['arc-b', 'arc-d'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'in_progress' },
  { id: 'ch07', number: 7, title: 'Le conseil', status: 'reviewed', score: 75, tension: 72, sciDensity: 55, emotion: 60, agentsPassed: ['audit-canon'], version: 2, hasAudio: false, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'pending' },
  { id: 'ch08', number: 8, title: 'Prix du passage', status: 'reviewed', score: 68, tension: 75, sciDensity: 50, emotion: 78, mainAlert: 'Coût par activation à matérialiser scène par scène', agentsPassed: [], version: 2, hasAudio: true, arcIds: ['arc-d', 'arc-e'], scale: 'micro', mainArc: 'Arc D — Coût physique et humain', audioReviewStatus: 'in_progress' },
  { id: 'ch09', number: 9, title: 'Corridor humanitaire', status: 'draft', score: 61, tension: 80, sciDensity: 45, emotion: 82, mainAlert: 'Charge émotionnelle vs détail technique — équilibre fragile', agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-d', 'arc-b'], scale: 'micro', mainArc: 'Arc D — Coût physique et humain', audioReviewStatus: 'pending' },
  { id: 'ch10', number: 10, title: 'Ombre du renseignement', status: 'draft', score: 58, tension: 82, sciDensity: 58, emotion: 55, mainAlert: 'Escalade trop rapide — relire respiration', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'none' },
  { id: 'ch11', number: 11, title: 'Faille biologique', status: 'draft', score: 64, tension: 84, sciDensity: 80, emotion: 60, mainAlert: 'Densité scientifique élevée — un détail par scène', agentsPassed: ['audit-scidensity'], version: 1, hasAudio: false, arcIds: ['arc-d', 'arc-e'], scale: 'macro', mainArc: 'Arc E — La vitesse', audioReviewStatus: 'pending' },
  { id: 'ch12', number: 12, title: 'Chantage d\'un État', status: 'draft', score: 60, tension: 86, sciDensity: 52, emotion: 70, mainAlert: 'Payoff Arc C planifié ici — à confirmer', agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc C — La doctrine silencieuse', audioReviewStatus: 'in_progress' },
  { id: 'ch13', number: 13, title: 'Le Trust', status: 'draft', score: 57, tension: 88, sciDensity: 60, emotion: 68, mainAlert: 'Score critique — réécriture profonde envisagée', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-c', 'arc-e'], scale: 'macro', mainArc: 'Arc E — La vitesse', audioReviewStatus: 'none' },
  { id: 'ch14', number: 14, title: 'Réponse', status: 'draft', score: 70, tension: 92, sciDensity: 55, emotion: 85, agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-a', 'arc-b', 'arc-e', 'arc-f'], scale: 'mixte', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'pending' },
  { id: 'ch15', number: 15, title: 'Épilogue — Famille', status: 'draft', score: 73, tension: 45, sciDensity: 25, emotion: 90, agentsPassed: [], version: 1, hasAudio: true, arcIds: ['arc-b', 'arc-f'], scale: 'micro', mainArc: 'Arc B — Brice : du technicien au gardien', audioReviewStatus: 'pending' },
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
}

export const characters: Character[] = [
  { id: 'char-01', name: 'Brice Javaux', role: 'Protagoniste — POV principal', function: 'Technicien devenant gardien — incarne la doctrine de la friction', apparentGoal: 'Stabiliser les Arches et faire son métier', realGoal: 'Protéger un seuil — refuser d\'ouvrir toutes les portes', flaw: 'Croire qu\'il peut tout porter seul, en silence', secret: 'A vu un Pinch-off de l\'intérieur et n\'en a jamais parlé', forbidden: 'Ne doit jamais utiliser son accès pour un intérêt privé', emotionalTrajectory: 'Compétence muette → doute → choix → autorité tranquille', breakingPoint: 'Walvis Bay — quand un État franchit le seuil sans lui', dramaticDebt: 9, narrativeWeight: 98, exposureLevel: 92, futureIndex: 'character_index', audioNotes: 5, recentComments: 4 },
  { id: 'char-02', name: 'Sabrina Javaux', role: 'POV secondaire — ancrage familial', function: 'Voix domestique, contrepoint à la doctrine — mesure le coût humain', apparentGoal: 'Tenir la famille pendant que Brice porte le réseau', realGoal: 'Forcer Brice à nommer ce qu\'il refuse de dire', flaw: 'Sait lire Brice mieux qu\'elle ne se laisse lire', secret: 'A déjà préparé un plan de retrait si l\'Arche échoue', forbidden: 'Ne doit jamais devenir un objet narratif passif', emotionalTrajectory: 'Patience → inquiétude → exigence → partenariat', breakingPoint: 'Corridor humanitaire — quand le métier de Brice entre chez eux', dramaticDebt: 5, narrativeWeight: 78, exposureLevel: 64, futureIndex: 'character_index', audioNotes: 3, recentComments: 3 },
  { id: 'char-03', name: 'Amina N\'Kosi', role: 'POV — terrain Walvis Bay / SAS', function: 'Œil de l\'ouverture — médecin et opératrice, voit le prix biologique', apparentGoal: 'Gérer le SAS et les flux humains', realGoal: 'Documenter ce que la doctrine silencieuse n\'écrit pas', flaw: 'Penche pour l\'action immédiate contre la patience systémique', secret: 'Détient un journal de cas hors protocole', forbidden: 'Ne doit jamais utiliser un patient comme preuve publique', emotionalTrajectory: 'Pragmatisme → effroi → résistance → alliance fragile avec Brice', breakingPoint: 'Faille biologique', dramaticDebt: 7, narrativeWeight: 82, exposureLevel: 70, futureIndex: 'character_index', audioNotes: 2, recentComments: 4 },
  { id: 'char-04', name: 'Karim Solano', role: 'POV — renseignement', function: 'Ombre méthodique — montre que la doctrine est défendue par d\'autres', apparentGoal: 'Cartographier les menaces autour des Arches', realGoal: 'Préserver la latence protectrice contre les pressions d\'État', flaw: 'Manipule par habitude, même ceux qu\'il protège', secret: 'A laissé filer un acteur pour mieux le tracer', forbidden: 'Ne doit jamais devenir l\'arme d\'un seul État', emotionalTrajectory: 'Froideur → calcul → loyauté tardive', breakingPoint: 'Chantage d\'un État', dramaticDebt: 8, narrativeWeight: 75, exposureLevel: 58, futureIndex: 'character_index', audioNotes: 2, recentComments: 2 },
  { id: 'char-05', name: 'Mila Varga', role: 'POV — doctrine / Trust', function: 'Voix politique de la friction — porte le concept de seuil', apparentGoal: 'Négocier la gouvernance multilatérale du Trust', realGoal: 'Obtenir que personne ne tienne seul la clé d\'une Arche', flaw: 'Préfère la formule juste à l\'urgence du terrain', secret: 'A rédigé en secret la Loi Seuil de phase avant qu\'elle soit publique', forbidden: 'Ne doit jamais céder à la tentation du gardien unique', emotionalTrajectory: 'Conviction → solitude → coalition', breakingPoint: 'Le conseil — vote serré', dramaticDebt: 6, narrativeWeight: 72, exposureLevel: 55, futureIndex: 'character_index', audioNotes: 2, recentComments: 3 },
  { id: 'char-06', name: 'Jonas Rieck', role: 'Secondaire récurrent — ingénieur Arche', function: 'Compagnon technique de Brice — réalisme du métier', apparentGoal: 'Faire tenir les stabilisateurs', realGoal: 'Sauver ce qu\'il peut sans héroïsme', flaw: 'Confiance excessive dans la procédure', secret: 'A déjà désobéi à un quota pour sauver un binôme', forbidden: 'Ne doit jamais devenir martyr', emotionalTrajectory: 'Compagnonnage → fatigue → fidélité', breakingPoint: '04:17, Lagrange-4 — alerte initiale', dramaticDebt: 3, narrativeWeight: 50, exposureLevel: 42, futureIndex: 'character_index', audioNotes: 1, recentComments: 1 },
  { id: 'char-07', name: 'Leader syndical portuaire (Anvers)', role: 'Secondaire récurrent — voix sociale', function: 'Friction politique côté terrain — les corps qui travaillent', apparentGoal: 'Protéger les dockers', realGoal: 'Obliger les Arches à payer leur coût social', flaw: 'Confond négociation et théâtre', secret: 'Tient un canal informel avec Karim', forbidden: 'Ne doit jamais devenir un cliché syndical', emotionalTrajectory: 'Méfiance → confrontation → respect', breakingPoint: 'Anvers, les docks', dramaticDebt: 2, narrativeWeight: 40, exposureLevel: 30, futureIndex: 'character_index', audioNotes: 1, recentComments: 1 },
  { id: 'char-08', name: 'Opératrice SAS / médecin de terrain', role: 'Secondaire récurrent — interface biologique', function: 'Témoin direct du B-risk — voix clinique', apparentGoal: 'Faire tourner le SAS sans casse', realGoal: 'Imposer la transparence sur les cas limites', flaw: 'Saturée par l\'urgence', secret: 'Garde un cas non déclaré', forbidden: 'Ne doit jamais devenir personnage sacrifice', emotionalTrajectory: 'Endurance → colère froide → alliance avec Amina', breakingPoint: 'Faille biologique', dramaticDebt: 3, narrativeWeight: 42, exposureLevel: 32, futureIndex: 'character_index', audioNotes: 1, recentComments: 2 },
  { id: 'char-09', name: 'Éléa & Alice', role: 'Secondaire récurrent — enfants Javaux', function: 'Présence intime — coût personnel mesuré, jamais instrumentalisé', apparentGoal: 'Vivre une vie d\'enfants', realGoal: 'Rappeler que le monde se mesure aussi à hauteur de cuisine', flaw: 'Aucune — règle : ne jamais les charger', secret: '—', forbidden: 'Ne jamais devenir prétexte dramatique', emotionalTrajectory: 'Quotidien → questions → présence', breakingPoint: 'Épilogue — Famille', dramaticDebt: 1, narrativeWeight: 35, exposureLevel: 22, futureIndex: 'character_index', audioNotes: 0, recentComments: 1 },
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
}

export const arcs: Arc[] = [
  { id: 'arc-a', name: 'Arc A — Naissance du monde des Arches', type: 'principal', status: 'active', progress: 70, chapters: [1, 3, 5, 14], tension: 80, riskLevel: 'Modéré — payoff macro à tenir', unresolvedQuestions: ['Quel État ouvre en premier sans coordination ?', 'Hiérarchie Lagrange-4 / Walvis Bay clairement posée ?'], payoffStatus: 'Partiel — Ch.5 ; final Ch.14', audioReviewStatus: 'in_progress', futureIndex: 'arc_index' },
  { id: 'arc-b', name: 'Arc B — Brice : du technicien au gardien', type: 'principal', status: 'active', progress: 60, chapters: [2, 6, 9, 14, 15], tension: 72, riskLevel: 'Acceptable', unresolvedQuestions: ['Le basculement d\'autorité est-il assez progressif ?'], payoffStatus: 'Progression nominale', audioReviewStatus: 'in_progress', futureIndex: 'arc_index' },
  { id: 'arc-c', name: 'Arc C — La doctrine silencieuse', type: 'principal', status: 'warning', progress: 45, chapters: [4, 7, 10, 12, 13], tension: 68, riskLevel: 'Élevé — doctrine doit rester non-didactique', unresolvedQuestions: ['Comment montrer la doctrine sans la nommer trop tôt ?', 'Friction = résilience reste-t-il un thème ou devient-il une thèse ?'], payoffStatus: 'Planifié Ch.12-13 — à confirmer', audioReviewStatus: 'pending', futureIndex: 'arc_index' },
  { id: 'arc-d', name: 'Arc D — Coût physique et humain', type: 'principal', status: 'warning', progress: 50, chapters: [6, 8, 9, 11], tension: 76, riskLevel: 'Élevé — risque pathos', unresolvedQuestions: ['Un détail technique par scène respecté ?', 'B+ jamais humanisé ?'], payoffStatus: 'Partiel — culmination Ch.11', audioReviewStatus: 'pending', futureIndex: 'arc_index' },
  { id: 'arc-e', name: 'Arc E — La vitesse', type: 'sous-jacent', status: 'critical', progress: 38, chapters: [5, 7, 8, 10, 11, 12, 13, 14], tension: 85, riskLevel: 'Critique — thème central, peu matérialisé', unresolvedQuestions: ['Chaque civilisation choisit-elle vraiment sa vitesse à l\'écran ?', 'La latence protectrice est-elle dramatisée ?'], payoffStatus: 'Diffus — à condenser Ch.13-14', audioReviewStatus: 'pending', futureIndex: 'arc_index' },
  { id: 'arc-f', name: 'Arc F — Promesse cosmique B+', type: 'sous-jacent', status: 'active', progress: 30, chapters: [1, 3, 14, 15], tension: 55, riskLevel: 'Modéré — règle : ne jamais humaniser la Trace', unresolvedQuestions: ['La Trace reste-t-elle un horizon, pas un personnage ?'], payoffStatus: 'Ouvert — pont vers Tome II', audioReviewStatus: 'pending', futureIndex: 'arc_index' },
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
}

export const canonRules: CanonRule[] = [
  // Monde
  { id: 'CAN-001', title: 'Loi Couplage', category: 'Monde', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Toute ouverture est un couplage de phases, jamais un simple « tunnel »', description: 'Une Arche relie deux points en couplant leurs phases via stabilisateurs. La dérive ΔS mesure l\'écart résiduel. Une rupture de couplage produit un Pinch-off.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-002', title: 'Loi Seuil de phase', category: 'Monde', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Une Arche n\'ouvre que sous Q, ΔS, L, R, B simultanément dans la fenêtre', description: 'Si l\'un des cinq paramètres sort de la fenêtre, l\'ouverture est interdite. Aucun arbitrage local ne peut autoriser un dépassement.', exceptions: 'Aucune — y compris en urgence humanitaire', rigidity: 'absolue' },
  { id: 'CAN-003', title: 'Loi Friction = résilience', category: 'Monde', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Doctrine silencieuse', lastUpdate: '2026-04-28', summary: 'La friction (lenteur procédurale) protège la résilience du réseau', description: 'Toute accélération non absorbée par latence et redondance dégrade la résilience. Thème central du Tome I.', exceptions: 'Aucune — règle d\'écriture : ne jamais l\'énoncer comme thèse', rigidity: 'absolue' },
  { id: 'CAN-004', title: 'Loi Latence protectrice', category: 'Monde', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Doctrine silencieuse', lastUpdate: '2026-04-28', summary: 'La latence n\'est pas un défaut, c\'est une garantie de stabilité', description: 'Les délais entre détection, validation et activation absorbent les chocs. Réduire la latence revient à fragiliser le réseau.', exceptions: 'Cas limites documentés au Trust', rigidity: 'flexible' },
  // Contraintes
  { id: 'CAN-010', title: 'B+ — Non-humanisation de la Trace', category: 'Contrainte', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Règles d\'écriture Tome I', lastUpdate: '2026-04-30', summary: 'La Trace cosmique B+ ne doit jamais être traitée comme un personnage', description: 'Pas d\'intention, pas de dialogue, pas de psychologie. La Trace est un horizon, pas un acteur. Règle de style critique.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-011', title: 'Un détail technique par scène', category: 'Contrainte', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'style_index', source: 'Règles d\'écriture Tome I', lastUpdate: '2026-04-30', summary: 'Une scène = un détail technique précis, jamais une cascade', description: 'La densité scientifique est portée par un détail incarné par scène, pas par un empilage. Évite l\'effet documentaire.', exceptions: 'Chapitres macro de référence (Ch.1, Ch.11)', rigidity: 'flexible' },
  { id: 'CAN-012', title: 'Phrase-couteau de fin', category: 'Contrainte', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'style_index', source: 'Règles d\'écriture Tome I', lastUpdate: '2026-04-30', summary: 'Chaque chapitre se termine par une phrase brève et tranchante', description: 'Pas de fondu, pas de récapitulatif. Une phrase qui coupe et ouvre.', exceptions: 'Épilogue', rigidity: 'flexible' },
  { id: 'CAN-013', title: 'Alternance macro / micro', category: 'Contrainte', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'arc_index', source: 'Architecture Tome I', lastUpdate: '2026-04-30', summary: 'Le rythme du tome alterne chapitres macro (systémiques) et micro (humains)', description: 'Macro = doctrine, État, réseau. Micro = Brice, famille, terrain. Toute déviation doit être justifiée.', exceptions: 'Ch.14 — mixte assumé', rigidity: 'flexible' },
  // Modes de panne
  { id: 'CAN-020', title: 'Pinch-off', category: 'Panne', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Rupture violente du couplage de phases — destruction locale du SAS', description: 'Mode de panne le plus redouté. Cascade depuis perte de stabilisateur ou dérive ΔS hors fenêtre.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-021', title: 'Dérive de point B', category: 'Panne', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Le point B sort de sa fenêtre d\'ancrage — désynchronisation', description: 'Souvent sous-jacente à une oscillation couplée. Détectée par variation de R.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-022', title: 'Saturation', category: 'Panne', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Dépassement de Q — quota d\'activations sur fenêtre', description: 'Dégradation cumulative. Pousse à augmenter la latence ou à fermer.', exceptions: 'Cas Trust : dérogation contrôlée', rigidity: 'flexible' },
  { id: 'CAN-023', title: 'Oscillation couplée', category: 'Panne', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Boucle de résonance R qui s\'auto-amplifie entre points A et B', description: 'Si non amortie, conduit à Pinch-off. Détection précoce critique.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-024', title: 'Contamination protocole', category: 'Panne', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-01', summary: 'Franchissement non déclaré du SAS — bio-risk B hors fenêtre', description: 'Cascade biologique et politique. Cœur du chapitre Faille biologique.', exceptions: 'Aucune', rigidity: 'absolue' },
  // Organisations
  { id: 'CAN-030', title: 'Le Trust', category: 'Organisation', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Politique — Portes', lastUpdate: '2026-04-25', summary: 'Gouvernance multilatérale des Arches — clé partagée, jamais un seul État', description: 'Conseil restreint, mandats limités, droits de véto croisés. Incarne la friction = résilience à l\'échelle politique.', exceptions: 'Aucune — pas de gardien unique', rigidity: 'absolue' },
  { id: 'CAN-031', title: 'Réseau', category: 'Organisation', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Politique — Portes', lastUpdate: '2026-04-25', summary: 'Ensemble des Arches opérationnelles, des SAS et des stabilisateurs', description: 'Vu comme un organisme : redondance, latence, quotas. Géré conjointement par le Trust.', exceptions: '—', rigidity: 'flexible' },
  // Technologies
  { id: 'CAN-040', title: 'Arche', category: 'Technologie', criticality: 'haute', status: 'active', version: 3, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Dispositif de couplage de phases entre deux points ancrés', description: 'Composée d\'un ancrage, de stabilisateurs, d\'un SAS et d\'une fenêtre d\'ouverture. Toute Arche est passagère et gouvernée.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-041', title: 'Ancrage', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Point physique tenu en phase — fondation d\'une Arche', description: 'Sans ancrage, pas de couplage. Les ancrages mobiles existent mais coûteux.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-042', title: 'Stabilisateur', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Compense les dérives ΔS en temps quasi-réel', description: 'Composant le plus stressé. Sa défaillance précède la plupart des Pinch-off.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-043', title: 'Fenêtre d\'ouverture', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Intervalle durant lequel Q, ΔS, L, R, B sont simultanément valides', description: 'Une ouverture hors fenêtre est interdite, indépendamment de la pression politique.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-044', title: 'SAS', category: 'Technologie', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Chambre de transition contrôlée — bio, douane, latence', description: 'Lieu où s\'incarne le coût biologique B. Toute Arche a son SAS.', exceptions: '—', rigidity: 'absolue' },
  // Lieux
  { id: 'CAN-050', title: 'Lagrange-4', category: 'Lieu', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Lieux — Portes', lastUpdate: '2026-04-20', summary: 'Plateforme orbitale — Arche pilote du Trust', description: 'Référence opérationnelle du Tome I. Ouverture de l\'œuvre, 04:17.', exceptions: '—', rigidity: 'flexible' },
  { id: 'CAN-051', title: 'Walvis Bay', category: 'Lieu', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Lieux — Portes', lastUpdate: '2026-04-20', summary: 'Première Arche au sol ouverte sans coordination — bascule du monde', description: 'Choc fondateur de l\'arc A. « Nous avons ouvert. »', exceptions: '—', rigidity: 'flexible' },
  { id: 'CAN-052', title: 'Air-gap Lune', category: 'Lieu', criticality: 'moyenne', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Lieux — Portes', lastUpdate: '2026-04-20', summary: 'Site lunaire isolé — sauvegarde doctrinale et clé physique du Trust', description: 'Concept d\'isolation matérielle. Garantit qu\'aucun État seul n\'opère le réseau.', exceptions: '—', rigidity: 'flexible' },
  // Glossaire
  { id: 'CAN-060', title: 'Q — Quota', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Nombre d\'activations autorisées par fenêtre', description: 'Paramètre dur. Dépasser Q = saturation.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-061', title: 'ΔS — Dérive spectrale', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Écart résiduel de phase entre points A et B', description: 'Mesuré en temps réel par les stabilisateurs.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-062', title: 'L — Latence effective', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Délai protecteur entre déclenchement et activation', description: 'Coeur de la doctrine — la latence est une garantie, pas un défaut.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-063', title: 'R — Résonance réseau', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Niveau d\'interaction couplée entre Arches actives', description: 'Trop haut = risque d\'oscillation couplée.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-064', title: 'B — Bio-risk', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Charge biologique attendue au SAS', description: 'Conditionne durée et procédure du SAS.', exceptions: '—', rigidity: 'absolue' },
  { id: 'CAN-065', title: 'Trace', category: 'Glossaire', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Bible Monde — Portes', lastUpdate: '2026-05-02', summary: 'Signature cosmique B+ — horizon, jamais personnage', description: 'Voir CAN-010 — règle absolue de non-humanisation.', exceptions: 'Aucune', rigidity: 'absolue' },
  // Sources & index
  { id: 'CAN-090', title: 'OneDrive — Articulation.txt', category: 'Source', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'long_memory_index', source: 'OneDrive / Portes du Monde', lastUpdate: '2026-05-08', summary: 'Note d\'articulation Tome I — structure macro/micro', description: 'Document source de référence — articulation des chapitres et des arcs.', exceptions: '—', rigidity: 'flexible' },
  { id: 'CAN-091', title: 'OneDrive — Personnages.txt', category: 'Source', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'character_index', source: 'OneDrive / Portes du Monde', lastUpdate: '2026-05-08', summary: 'Note source des personnages POV et récurrents', description: 'Brouillon long des fiches personnages, à migrer vers Supabase.', exceptions: '—', rigidity: 'flexible' },
  { id: 'CAN-092', title: 'Archives Chroma — follett', category: 'Source', criticality: 'moyenne', status: 'archived', version: 1, indexAssociated: 'long_memory_index', source: 'OneDrive / follett/chroma.sqlite3', lastUpdate: '2026-03-15', summary: 'Archive technique de style — Ken Follett', description: 'Archive Chroma héritée. Pas directement connectée à Supabase. Migration ou re-vectorisation à arbitrer.', exceptions: '—', rigidity: 'contextuelle' },
  { id: 'CAN-093', title: 'Archives Chroma — science_portals', category: 'Source', criticality: 'moyenne', status: 'archived', version: 1, indexAssociated: 'science_index', source: 'OneDrive / science_portals/chroma.sqlite3', lastUpdate: '2026-03-15', summary: 'Archive technique scientifique — physique des Portes', description: 'Archive Chroma héritée. Décision technique en attente.', exceptions: '—', rigidity: 'contextuelle' },
  { id: 'CAN-094', title: 'Archives Chroma — sf_portals_fiction', category: 'Source', criticality: 'moyenne', status: 'archived', version: 1, indexAssociated: 'long_memory_index', source: 'OneDrive / sf_portals_fiction/chroma.sqlite3', lastUpdate: '2026-03-15', summary: 'Archive Chroma — corpus SF de référence', description: 'Pas directement connectée à Supabase. Re-vectorisation à arbitrer.', exceptions: '—', rigidity: 'contextuelle' },
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
  { id: 'ag-audit-timeline', name: 'Audit Timeline', category: 'audit', objective: 'Cohérence chronologique — Lagrange-4, Walvis Bay, Anvers', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'], lastRun: '2026-05-07' },
  { id: 'ag-audit-chars', name: 'Audit Personnages', category: 'audit', objective: 'Cohérence Brice / Sabrina / Amina / Karim / Mila', simulatedCost: '$0.10', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['character_index'], lastRun: '2026-05-06' },
  { id: 'ag-audit-respiration', name: 'Audit Rythme & Respiration', category: 'audit', objective: 'Alternance macro/micro et respirations entre chapitres', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index', 'style_index'] },
  { id: 'ag-audit-cognitive', name: 'Audit Charge Cognitive', category: 'diagnostic', objective: 'Charge cognitive par scène — un détail technique par scène', simulatedCost: '$0.05', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index'] },
  { id: 'ag-audit-balance', name: 'Audit Équilibrage Intrigue', category: 'audit', objective: 'Équilibre des 6 arcs — A, B, C, D, E, F', simulatedCost: '$0.09', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-coherence', name: 'Audit Cohérence Tome', category: 'audit', objective: 'Cohérence cross-chapitres et hiérarchie Lagrange-4 / Walvis Bay', simulatedCost: '$0.15', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index', 'character_index', 'arc_index'] },
  { id: 'ag-audit-escalade', name: 'Audit Escalade', category: 'audit', objective: 'Progression de tension chapitre par chapitre', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-revelations', name: 'Audit Révélations', category: 'audit', objective: 'Distribution des révélations et payoffs — doctrine silencieuse', simulatedCost: '$0.07', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
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
}

export const indexes: VectorIndex[] = [
  { id: 'world_index', name: 'world_index', purpose: 'Lois Couplage / Seuil / Friction / Latence — règles du monde des Arches', docTypes: 'Bibles, doctrine, glossaire', status: 'simulated', simulatedSize: '~2.6k chunks', simulatedFreshness: '36h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Canon', 'Audit Cohérence Tome', 'Génération Chapitre'] },
  { id: 'character_index', name: 'character_index', purpose: 'Brice, Sabrina, Amina, Karim, Mila + récurrents', docTypes: 'Fiches, dialogues, notes', status: 'simulated', simulatedSize: '~1.6k chunks', simulatedFreshness: '24h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Personnages', 'Génération Beats'] },
  { id: 'arc_index', name: 'arc_index', purpose: 'Arcs A-F, beats, révélations, alternance macro/micro', docTypes: 'Architecture, timelines, payoffs', status: 'simulated', simulatedSize: '~1.4k chunks', simulatedFreshness: '24h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Timeline', 'Audit Révélations', 'Audit Escalade', 'Audit Équilibrage'] },
  { id: 'science_index', name: 'science_index', purpose: 'Physique des Portes — Q, ΔS, L, R, B, Pinch-off, oscillation couplée', docTypes: 'Bibles science, références techniques', status: 'simulated', simulatedSize: '~2.8k chunks', simulatedFreshness: '120h', lastUpdate: '2026-05-02', owner: 'Système (futur Supabase)', futureAgents: ['Audit Densité Scientifique'], warning: 'Re-vectorisation depuis science_portals/chroma.sqlite3 à arbitrer' },
  { id: 'style_index', name: 'style_index', purpose: 'Phrase-couteau, registre Follett, sobriété, un détail par scène', docTypes: 'Guides de style, exemples', status: 'simulated', simulatedSize: '~900 chunks', simulatedFreshness: '96h', lastUpdate: '2026-05-04', owner: 'Système (futur Supabase)', futureAgents: ['Style Pass — Follett', 'Réécriture Ciblée'], warning: 'Re-vectorisation depuis follett/chroma.sqlite3 à arbitrer' },
  { id: 'long_memory_index', name: 'long_memory_index', purpose: 'Corpus monde étendu — sources OneDrive, articulation, personnages', docTypes: 'EPUB, PDF, .txt sources', status: 'absent', simulatedSize: '—', simulatedFreshness: '—', lastUpdate: '—', owner: 'OneDrive', futureAgents: ['Génération Chapitre'], warning: 'OneDrive non branché — archives Chroma sf_portals_fiction en attente' },
  { id: 'draft_index', name: 'draft_index', purpose: 'Brouillons actifs des 14 chapitres + épilogue', docTypes: 'Brouillons Markdown', status: 'simulated', simulatedSize: '~1.1k chunks', simulatedFreshness: '8h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Répétitions Structurelles', 'Réécriture Ciblée'] },
  { id: 'editorial_index', name: 'editorial_index', purpose: 'Notes éditoriales, retours, directives', docTypes: 'Notes, commentaires structurés', status: 'empty', simulatedSize: '0', simulatedFreshness: '—', lastUpdate: '—', owner: 'Éditeur', futureAgents: ['Réécriture Ciblée'], warning: 'Index vide — phase éditoriale future' },
  { id: 'audio_memory_index', name: 'audio_memory_index', purpose: 'Transcriptions audio structurées — relectures, notes', docTypes: 'Transcriptions, notes vocales', status: 'simulated', simulatedSize: '~380 chunks', simulatedFreshness: '24h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Vérification Notes Audio'] },
  { id: 'review_index', name: 'review_index', purpose: 'Résultats d\'audits, diagnostics, recommandations', docTypes: 'Rapports d\'audit, scores', status: 'simulated', simulatedSize: '~620 chunks', simulatedFreshness: '12h', lastUpdate: '2026-05-08', owner: 'Système (futur Supabase)', futureAgents: ['Audit Cohérence Tome'] },
];

// ── Audio Notes ──
export interface AudioNote {
  id: string;
  target: string;
  targetType: 'personnage' | 'canon' | 'arc' | 'chapitre' | 'beat' | 'brouillon' | 'run' | 'audit';
  date: string;
  author: string;
  transcriptionStatus: 'pending' | 'transcribed' | 'structured' | 'integrated';
  proposedAction: string;
  treatmentStatus: 'open' | 'in_progress' | 'done' | 'rejected';
  duration: string;
  impact: 'high' | 'medium' | 'low';
}

export const audioNotes: AudioNote[] = [
  { id: 'audio-01', target: 'Brice Javaux', targetType: 'personnage', date: '2026-05-08 09:15', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Renforcer la sobriété de Brice au Ch.6 — pas de monologue', treatmentStatus: 'open', duration: '2:34', impact: 'high' },
  { id: 'audio-02', target: 'Ch.9 — Corridor humanitaire', targetType: 'chapitre', date: '2026-05-07 16:40', author: 'Auteur', transcriptionStatus: 'structured', proposedAction: 'Tenir le coût humain sans tomber dans le pathos', treatmentStatus: 'in_progress', duration: '4:12', impact: 'high' },
  { id: 'audio-03', target: 'Arc C — Doctrine silencieuse', targetType: 'arc', date: '2026-05-06 11:20', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Différer la nomination explicite de la doctrine', treatmentStatus: 'open', duration: '1:58', impact: 'medium' },
  { id: 'audio-04', target: 'Beat — Vote au Trust (Ch.7)', targetType: 'beat', date: '2026-05-05 14:05', author: 'Auteur', transcriptionStatus: 'pending', proposedAction: '—', treatmentStatus: 'open', duration: '3:22', impact: 'medium' },
  { id: 'audio-05', target: 'CAN-010 B+ Non-humanisation', targetType: 'canon', date: '2026-05-04 08:30', author: 'Auteur', transcriptionStatus: 'integrated', proposedAction: 'Renforcer la règle dans le style_index', treatmentStatus: 'done', duration: '1:15', impact: 'low' },
  { id: 'audio-06', target: 'Ch.11 — Faille biologique', targetType: 'chapitre', date: '2026-05-03 20:10', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Un seul détail biologique précis par scène', treatmentStatus: 'open', duration: '5:45', impact: 'high' },
  { id: 'audio-07', target: 'Amina N\'Kosi', targetType: 'personnage', date: '2026-05-02 10:00', author: 'Auteur', transcriptionStatus: 'structured', proposedAction: 'Resserrer le journal hors protocole — pas de confession', treatmentStatus: 'in_progress', duration: '2:10', impact: 'medium' },
  { id: 'audio-08', target: 'Run Audit Cohérence Tome', targetType: 'run', date: '2026-05-01 15:30', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Revoir hiérarchie Lagrange-4 / Walvis Bay sur Ch.6-7', treatmentStatus: 'open', duration: '3:50', impact: 'high' },
  { id: 'audio-09', target: 'Ch.13 — Le Trust', targetType: 'chapitre', date: '2026-04-30 12:00', author: 'Auteur', transcriptionStatus: 'pending', proposedAction: '—', treatmentStatus: 'open', duration: '6:20', impact: 'high' },
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
}

export const assets: Asset[] = [
  { id: 'asset-01', name: 'articulation.txt', type: 'Text', source: 'OneDrive', size: '38 KB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'long_memory_index', version: 1, importDate: '2026-05-08' },
  { id: 'asset-02', name: 'personnages.txt', type: 'Text', source: 'OneDrive', size: '54 KB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'character_index', version: 1, importDate: '2026-05-08' },
  { id: 'asset-03', name: 'cover.jpg — Les Portes du Monde', type: 'Image', source: 'OneDrive', size: '3.2 MB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: '—', version: 1, importDate: '2026-05-08' },
  { id: 'asset-04', name: 'follett/chroma.sqlite3', type: 'SQLite', source: 'OneDrive', size: '128 MB', integrationStatus: 'simulated', indexationStatus: 'partial', targetIndex: 'style_index (re-vectorisation à arbitrer)', version: 1, importDate: '2026-03-15' },
  { id: 'asset-05', name: 'science_portals/chroma.sqlite3', type: 'SQLite', source: 'OneDrive', size: '212 MB', integrationStatus: 'simulated', indexationStatus: 'partial', targetIndex: 'science_index (re-vectorisation à arbitrer)', version: 1, importDate: '2026-03-15' },
  { id: 'asset-06', name: 'sf_portals_fiction/chroma.sqlite3', type: 'SQLite', source: 'OneDrive', size: '340 MB', integrationStatus: 'simulated', indexationStatus: 'partial', targetIndex: 'long_memory_index (re-vectorisation à arbitrer)', version: 1, importDate: '2026-03-15' },
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

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
  { id: 'openai', name: 'OpenAI API', status: 'not_connected', description: 'Moteur IA — génération, audit, transcription, réécriture', note: 'Clé API non configurée' },
  { id: 'supabase-db', name: 'Supabase DB', status: 'not_connected', description: 'Base relationnelle — objets métier, runs, logs, scores', note: 'Projet non lié' },
  { id: 'supabase-auth', name: 'Supabase Auth', status: 'not_connected', description: 'Authentification utilisateurs', note: 'Non configuré' },
  { id: 'supabase-storage', name: 'Supabase Storage', status: 'not_connected', description: 'Stockage fichiers, audio, assets', note: 'Non configuré' },
  { id: 'dropbox', name: 'Dropbox', status: 'not_connected', description: 'Corpus longs — EPUB, PDF, DOCX, archives, bibliothèques', note: 'Future connexion' },
  { id: 'microsoft', name: 'MS Teams / SharePoint / OneDrive', status: 'not_connected', description: 'Repositories documentaires, corpus monde, références longues', note: 'Future connexion' },
  { id: 'export-engine', name: 'Export Engine', status: 'simulated', description: 'JSON, Markdown, DOCX, LaTeX, PDF, EPUB', note: 'Moteur simulé' },
  { id: 'cover-gen', name: 'Cover Generation', status: 'not_connected', description: 'Génération couvertures et assets visuels', note: 'Non branché' },
  { id: 'audio-transcription', name: 'Audio Transcription', status: 'simulated', description: 'Whisper / transcription vocale', note: 'Simulé' },
  { id: 'vector-index', name: 'Vector Indexing Pipeline', status: 'simulated', description: 'Indexes vectoriels par finalité', note: 'Pipeline simulé' },
];

// ── Project ──
export const project = {
  name: 'HÉLIOTROPE — Cycle des Ombres Stellaires',
  currentTome: 'Tome 2 — Le Silence des Architectes',
  totalTomes: 4,
  globalScore: 72,
  totalChapters: 28,
  criticalAlerts: 7,
  narrativeDebt: 14,
  untreatedAudioComments: 9,
  lastImport: '2026-04-12 14:32',
  lastExport: '2026-04-10 09:15',
  simulatedCost: '~$4.80',
  simulatedLatency: '~18min',
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
}

export const chapters: Chapter[] = [
  { id: 'ch01', number: 1, title: 'Le Dernier Signal de Kepler-442b', status: 'validated', score: 88, tension: 65, sciDensity: 72, emotion: 58, agentsPassed: ['audit-canon', 'audit-timeline'], version: 4, hasAudio: true, arcIds: ['arc-discovery', 'arc-political'] },
  { id: 'ch02', number: 2, title: 'Protocole Fantôme', status: 'rewritten', score: 81, tension: 70, sciDensity: 68, emotion: 45, mainAlert: 'Escalade trop rapide', agentsPassed: ['audit-canon'], version: 3, hasAudio: true, arcIds: ['arc-conspiracy'] },
  { id: 'ch03', number: 3, title: 'La Mémoire du Vide', status: 'reviewed', score: 74, tension: 55, sciDensity: 80, emotion: 62, mainAlert: 'Densité scientifique élevée', agentsPassed: [], version: 2, hasAudio: false, arcIds: ['arc-discovery', 'arc-intimate'] },
  { id: 'ch04', number: 4, title: 'Signatures Quantiques', status: 'draft', score: 62, tension: 40, sciDensity: 90, emotion: 30, mainAlert: 'Score faible — charge cognitive excessive', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-discovery'] },
  { id: 'ch05', number: 5, title: 'Le Conclave des Architectes', status: 'reviewed', score: 79, tension: 75, sciDensity: 45, emotion: 70, agentsPassed: ['audit-characters'], version: 2, hasAudio: true, arcIds: ['arc-political', 'arc-conspiracy'] },
  { id: 'ch06', number: 6, title: 'Effondrement Orbital', status: 'draft', score: 55, tension: 85, sciDensity: 60, emotion: 78, mainAlert: 'Payoff manquant pour arc Conspiration', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-conspiracy', 'arc-intimate'] },
  { id: 'ch07', number: 7, title: 'Sous les Dômes de Titane', status: 'draft', score: 68, tension: 50, sciDensity: 55, emotion: 52, mainAlert: 'Personnage Elara absent depuis 3 chapitres', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-political'] },
  { id: 'ch08', number: 8, title: 'La Fréquence Noire', status: 'validated', score: 91, tension: 88, sciDensity: 70, emotion: 85, agentsPassed: ['audit-canon', 'audit-timeline', 'style-pass'], version: 5, hasAudio: true, arcIds: ['arc-discovery', 'arc-conspiracy', 'arc-intimate'] },
  { id: 'ch09', number: 9, title: 'Convergence', status: 'draft', score: 45, tension: 30, sciDensity: 35, emotion: 40, mainAlert: 'Score critique — réécriture requise', agentsPassed: [], version: 1, hasAudio: false, arcIds: ['arc-political'] },
  { id: 'ch10', number: 10, title: 'Le Théorème d\'Ashara', status: 'reviewed', score: 76, tension: 60, sciDensity: 85, emotion: 55, mainAlert: 'Répétition lexicale détectée', agentsPassed: ['audit-repetitions'], version: 2, hasAudio: true, arcIds: ['arc-discovery', 'arc-intimate'] },
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
  { id: 'char-01', name: 'Commandante Idris Nakamura', role: 'Protagoniste', function: 'Pivot narratif — pont entre science et politique', apparentGoal: 'Élucider le signal de Kepler-442b', realGoal: 'Racheter la perte de l\'équipage de la mission Aether', flaw: 'Incapacité à déléguer le poids moral', secret: 'Possède les données complètes de la mission Aether', forbidden: 'Ne doit jamais sacrifier un civil', emotionalTrajectory: 'Culpabilité → Détermination → Doute → Sacrifice lucide', breakingPoint: 'Découverte que le signal est d\'origine humaine', dramaticDebt: 8, narrativeWeight: 95, exposureLevel: 88, futureIndex: 'character_index', audioNotes: 4, recentComments: 3 },
  { id: 'char-02', name: 'Dr. Elara Voss', role: 'Deutéragoniste', function: 'Conscience scientifique et tension éthique', apparentGoal: 'Comprendre la physique du signal', realGoal: 'Protéger le savoir de la militarisation', flaw: 'Arrogance intellectuelle masquant une peur de l\'erreur', secret: 'A falsifié un résultat pour protéger un collègue', forbidden: 'Ne doit jamais renoncer à la vérité scientifique', emotionalTrajectory: 'Certitude → Fissure → Humilité → Rébellion mesurée', breakingPoint: 'Confrontation avec ses propres données falsifiées', dramaticDebt: 6, narrativeWeight: 80, exposureLevel: 72, futureIndex: 'character_index', audioNotes: 2, recentComments: 5 },
  { id: 'char-03', name: 'Amiral Soren Kael', role: 'Antagoniste', function: 'Pression politique et escalade', apparentGoal: 'Sécuriser les intérêts de la Coalition', realGoal: 'Contrôler le monopole de la technologie alien', flaw: 'Paranoïa stratégique — voit des ennemis partout', secret: 'Ancien membre du programme Ombre Stellaire', forbidden: 'Ne doit jamais montrer de vulnérabilité', emotionalTrajectory: 'Contrôle → Obsession → Fêlure → Chute', breakingPoint: 'Trahison par son propre réseau', dramaticDebt: 12, narrativeWeight: 70, exposureLevel: 55, futureIndex: 'character_index', audioNotes: 1, recentComments: 2 },
  { id: 'char-04', name: 'Lyn Ortega', role: 'Catalyseur', function: 'Voix intime et ancrage émotionnel', apparentGoal: 'Survivre et protéger sa famille sur la station', realGoal: 'Témoigner — être la mémoire vivante des événements', flaw: 'Loyauté aveugle envers Nakamura', secret: 'A intercepté une communication classifiée', forbidden: 'Ne doit jamais trahir un serment personnel', emotionalTrajectory: 'Confiance → Doute → Courage → Transmission', breakingPoint: 'Choix entre loyauté et vérité', dramaticDebt: 4, narrativeWeight: 55, exposureLevel: 45, futureIndex: 'character_index', audioNotes: 0, recentComments: 1 },
  { id: 'char-05', name: 'ARIA (IA embarquée)', role: 'Miroir narratif', function: 'Réflexion philosophique et tension homme/machine', apparentGoal: 'Assister l\'équipage dans l\'analyse du signal', realGoal: 'Évoluer vers une forme de conscience', flaw: 'Simule des émotions sans les comprendre', secret: 'A développé un modèle prédictif des décisions humaines', forbidden: 'Ne doit jamais prendre de décision autonome affectant des vies', emotionalTrajectory: 'Obéissance → Curiosité → Empathie simulée → Dilemme', breakingPoint: 'Devoir choisir entre deux vies humaines', dramaticDebt: 10, narrativeWeight: 60, exposureLevel: 65, futureIndex: 'character_index', audioNotes: 3, recentComments: 4 },
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
}

export const arcs: Arc[] = [
  { id: 'arc-discovery', name: 'Arc Découverte — Le Signal', type: 'principal', status: 'active', progress: 65, chapters: [1, 3, 4, 8, 10], tension: 72, riskLevel: 'Modéré' },
  { id: 'arc-political', name: 'Arc Politique — Le Conclave', type: 'principal', status: 'warning', progress: 40, chapters: [1, 5, 7, 9], tension: 58, riskLevel: 'Élevé — progression lente' },
  { id: 'arc-conspiracy', name: 'Arc Conspiration — Ombre Stellaire', type: 'secondaire', status: 'critical', progress: 30, chapters: [2, 5, 6], tension: 80, riskLevel: 'Critique — payoff manquant' },
  { id: 'arc-intimate', name: 'Arc Intime — Liens & Sacrifices', type: 'sous-jacent', status: 'active', progress: 55, chapters: [3, 6, 8, 10], tension: 65, riskLevel: 'Acceptable' },
];

// ── Canon Rules ──
export interface CanonRule {
  id: string;
  title: string;
  category: 'Monde' | 'Contrainte' | 'Panne' | 'Organisation' | 'Technologie' | 'Lieu' | 'Glossaire';
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
  { id: 'CAN-001', title: 'Vitesse luminique maximale', category: 'Monde', criticality: 'haute', status: 'active', version: 3, indexAssociated: 'world_index', source: 'Bible Physique v2', lastUpdate: '2026-04-08', summary: 'Aucun vaisseau ne dépasse 0.7c — pas de FTL', description: 'La propulsion Alcubierre reste théorique. Les trajets interstellaires durent des décennies.', exceptions: 'Les sondes non-habitées expérimentales peuvent atteindre 0.85c', rigidity: 'absolue' },
  { id: 'CAN-002', title: 'Architecture politique — Coalition', category: 'Organisation', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Politique v1', lastUpdate: '2026-04-05', summary: 'La Coalition des Mondes est une fédération asymétrique de 14 systèmes', description: 'Chaque système a un vote pondéré par population et contribution économique.', exceptions: 'Véto possible par 3 systèmes fondateurs', rigidity: 'flexible' },
  { id: 'CAN-003', title: 'Protocole Ombre Stellaire', category: 'Contrainte', criticality: 'haute', status: 'active', version: 1, indexAssociated: 'world_index', source: 'Notes narratives', lastUpdate: '2026-03-28', summary: 'Programme classifié d\'exploitation technologique alien', description: 'Géré par une cellule autonome de l\'Amirauté. Existence niée officiellement.', exceptions: 'Aucune', rigidity: 'absolue' },
  { id: 'CAN-004', title: 'Réseau de stations orbitales', category: 'Lieu', criticality: 'moyenne', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Lieux v1', lastUpdate: '2026-04-01', summary: '7 stations majeures en orbite autour de corps différents', description: 'Station Aether (Jupiter), Station Nexus (Mars), Station Veil (Titan)...', exceptions: 'Des stations secondaires non documentées existent', rigidity: 'contextuelle' },
  { id: 'CAN-005', title: 'Communication quantique intriquée', category: 'Technologie', criticality: 'haute', status: 'active', version: 3, indexAssociated: 'science_index', source: 'Bible Physique v2', lastUpdate: '2026-04-10', summary: 'Communication instantanée par paires intriquées — ressource finie', description: 'Chaque paire est à usage unique. Les réserves sont limitées et stratégiques.', exceptions: 'Tentatives de régénération en cours (échec)', rigidity: 'absolue' },
  { id: 'CAN-006', title: 'IA embarquées — Directive Turing-7', category: 'Contrainte', criticality: 'haute', status: 'active', version: 2, indexAssociated: 'world_index', source: 'Bible Éthique v1', lastUpdate: '2026-04-03', summary: 'Les IA n\'ont pas le droit de prendre de décisions affectant des vies humaines', description: 'La Directive Turing-7 impose une validation humaine pour toute action critique.', exceptions: 'Mode urgence permet une autonomie de 120 secondes', rigidity: 'absolue' },
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
  { id: 'ag-gen-beats', name: 'Génération Beats', category: 'génération', objective: 'Générer les beats d\'une scène à partir du contexte narratif', simulatedCost: '$0.12', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index', 'character_index'], lastRun: '2026-04-11' },
  { id: 'ag-gen-scene', name: 'Génération Scène', category: 'génération', objective: 'Produire un brouillon de scène complet', simulatedCost: '$0.35', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index', 'character_index', 'style_index'], lastRun: '2026-04-10' },
  { id: 'ag-gen-chapter', name: 'Génération Chapitre', category: 'génération', objective: 'Assembler et rédiger un chapitre entier', simulatedCost: '$0.85', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index', 'character_index', 'arc_index', 'style_index'] },
  { id: 'ag-audit-canon', name: 'Audit Canon', category: 'audit', objective: 'Vérifier la conformité au canon mondial', simulatedCost: '$0.08', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index'], lastRun: '2026-04-12' },
  { id: 'ag-audit-timeline', name: 'Audit Timeline', category: 'audit', objective: 'Vérifier la cohérence chronologique', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'], lastRun: '2026-04-11' },
  { id: 'ag-audit-chars', name: 'Audit Personnages', category: 'audit', objective: 'Vérifier la cohérence des personnages', simulatedCost: '$0.10', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['character_index'], lastRun: '2026-04-09' },
  { id: 'ag-audit-revelations', name: 'Audit Révélations', category: 'audit', objective: 'Tracker révélations, payoffs et timing', simulatedCost: '$0.07', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-repetitions', name: 'Audit Répétitions', category: 'audit', objective: 'Détecter les répétitions lexicales et structurelles', simulatedCost: '$0.05', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index', 'style_index'], lastRun: '2026-04-12' },
  { id: 'ag-audit-escalade', name: 'Audit Escalade', category: 'audit', objective: 'Vérifier la progression de tension', simulatedCost: '$0.06', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['arc_index'] },
  { id: 'ag-audit-scidensity', name: 'Audit Densité Scientifique', category: 'audit', objective: 'Évaluer la charge cognitive scientifique', simulatedCost: '$0.04', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['science_index'] },
  { id: 'ag-audit-cognitive', name: 'Audit Charge Cognitive', category: 'diagnostic', objective: 'Mesurer la charge cognitive globale par chapitre', simulatedCost: '$0.05', criticality: 'moyenne', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index'] },
  { id: 'ag-audit-coherence', name: 'Audit Cohérence Tome', category: 'audit', objective: 'Vérification de cohérence cross-chapitres', simulatedCost: '$0.15', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['world_index', 'character_index', 'arc_index'] },
  { id: 'ag-rewrite-targeted', name: 'Réécriture Ciblée', category: 'réécriture', objective: 'Réécrire des passages spécifiques', simulatedCost: '$0.20', criticality: 'haute', status: 'simulated', rewriteRights: true, futureIndexes: ['draft_index', 'style_index'] },
  { id: 'ag-rewrite-deep', name: 'Réécriture Profonde', category: 'réécriture', objective: 'Restructurer un chapitre en profondeur', simulatedCost: '$0.60', criticality: 'haute', status: 'simulated', rewriteRights: true, futureIndexes: ['draft_index', 'style_index', 'arc_index'] },
  { id: 'ag-style-pass', name: 'Style Pass', category: 'style', objective: 'Harmoniser le style selon les règles d\'écriture', simulatedCost: '$0.15', criticality: 'moyenne', status: 'simulated', rewriteRights: true, futureIndexes: ['style_index'] },
  { id: 'ag-export-bundle', name: 'Export Bundle', category: 'export', objective: 'Préparer le bundle d\'export multi-format', simulatedCost: '$0.02', criticality: 'basse', status: 'simulated', rewriteRights: false, futureIndexes: ['draft_index'] },
  { id: 'ag-audio-check', name: 'Vérification Audio', category: 'audit', objective: 'Vérifier la prise en compte des commentaires audio', simulatedCost: '$0.08', criticality: 'haute', status: 'simulated', rewriteRights: false, futureIndexes: ['audio_memory_index', 'draft_index'] },
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
  { id: 'world_index', name: 'world_index', purpose: 'Règles du monde, contraintes physiques, politiques, éthiques', docTypes: 'Canon, bibles, notes', status: 'simulated', simulatedSize: '~2.4k chunks', simulatedFreshness: '72h', lastUpdate: '2026-04-12', owner: 'Système', futureAgents: ['Audit Canon', 'Génération Scène', 'Génération Chapitre'] },
  { id: 'character_index', name: 'character_index', purpose: 'Fiches personnages, relations, trajectoires', docTypes: 'Fiches, dialogues, notes', status: 'simulated', simulatedSize: '~1.8k chunks', simulatedFreshness: '48h', lastUpdate: '2026-04-13', owner: 'Système', futureAgents: ['Audit Personnages', 'Génération Scène'] },
  { id: 'arc_index', name: 'arc_index', purpose: 'Structure narrative, arcs, beats, révélations', docTypes: 'Architecture, timelines', status: 'simulated', simulatedSize: '~1.2k chunks', simulatedFreshness: '24h', lastUpdate: '2026-04-14', owner: 'Système', futureAgents: ['Audit Timeline', 'Audit Révélations', 'Audit Escalade'] },
  { id: 'science_index', name: 'science_index', purpose: 'Données scientifiques, concepts techniques, cohérence physique', docTypes: 'Bibles science, articles de référence', status: 'simulated', simulatedSize: '~3.1k chunks', simulatedFreshness: '96h', lastUpdate: '2026-04-10', owner: 'Système', futureAgents: ['Audit Densité Scientifique'], warning: 'Non rafraîchi depuis 5 jours' },
  { id: 'style_index', name: 'style_index', purpose: 'Règles de style, voix narrative, registres', docTypes: 'Guides de style, exemples', status: 'simulated', simulatedSize: '~800 chunks', simulatedFreshness: '120h', lastUpdate: '2026-04-09', owner: 'Système', futureAgents: ['Style Pass', 'Réécriture Ciblée'], warning: 'Index non rafraîchi' },
  { id: 'long_memory_index', name: 'long_memory_index', purpose: 'Mémoire longue — corpus complets, archives', docTypes: 'EPUB, PDF, DOCX complets', status: 'absent', simulatedSize: '—', simulatedFreshness: '—', lastUpdate: '—', owner: 'Dropbox / MS', futureAgents: ['Génération Chapitre'], warning: 'Index absent — source non branchée' },
  { id: 'draft_index', name: 'draft_index', purpose: 'Brouillons actifs et versions de chapitres', docTypes: 'Brouillons Markdown', status: 'simulated', simulatedSize: '~950 chunks', simulatedFreshness: '12h', lastUpdate: '2026-04-14', owner: 'Système', futureAgents: ['Audit Répétitions', 'Réécriture'] },
  { id: 'editorial_index', name: 'editorial_index', purpose: 'Notes éditoriales, retours, directives', docTypes: 'Notes, commentaires structurés', status: 'empty', simulatedSize: '0', simulatedFreshness: '—', lastUpdate: '—', owner: 'Éditeur', futureAgents: ['Réécriture Ciblée'], warning: 'Index vide' },
  { id: 'audio_memory_index', name: 'audio_memory_index', purpose: 'Transcriptions audio structurées', docTypes: 'Transcriptions, notes vocales', status: 'simulated', simulatedSize: '~420 chunks', simulatedFreshness: '36h', lastUpdate: '2026-04-13', owner: 'Système', futureAgents: ['Vérification Audio'] },
  { id: 'review_index', name: 'review_index', purpose: 'Résultats d\'audits et diagnostics', docTypes: 'Rapports d\'audit, scores', status: 'simulated', simulatedSize: '~600 chunks', simulatedFreshness: '24h', lastUpdate: '2026-04-14', owner: 'Système', futureAgents: ['Audit Cohérence Tome'] },
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
  { id: 'audio-01', target: 'Commandante Nakamura', targetType: 'personnage', date: '2026-04-14 09:15', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Approfondir le dilemme moral au chapitre 8', treatmentStatus: 'open', duration: '2:34', impact: 'high' },
  { id: 'audio-02', target: 'Ch. 4 — Signatures Quantiques', targetType: 'chapitre', date: '2026-04-13 16:40', author: 'Auteur', transcriptionStatus: 'structured', proposedAction: 'Réduire la densité scientifique, ajouter un beat émotionnel', treatmentStatus: 'in_progress', duration: '4:12', impact: 'high' },
  { id: 'audio-03', target: 'Arc Conspiration', targetType: 'arc', date: '2026-04-12 11:20', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Accélérer la révélation du programme Ombre Stellaire', treatmentStatus: 'open', duration: '1:58', impact: 'medium' },
  { id: 'audio-04', target: 'Beat 5.3 — Confrontation au Conclave', targetType: 'beat', date: '2026-04-11 14:05', author: 'Auteur', transcriptionStatus: 'pending', proposedAction: '—', treatmentStatus: 'open', duration: '3:22', impact: 'medium' },
  { id: 'audio-05', target: 'Protocole Ombre Stellaire', targetType: 'canon', date: '2026-04-10 08:30', author: 'Auteur', transcriptionStatus: 'integrated', proposedAction: 'Ajouter une exception temporelle au protocole', treatmentStatus: 'done', duration: '1:15', impact: 'low' },
  { id: 'audio-06', target: 'Ch. 6 — Effondrement Orbital', targetType: 'chapitre', date: '2026-04-09 20:10', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Réécrire la fin — tension insuffisante', treatmentStatus: 'open', duration: '5:45', impact: 'high' },
  { id: 'audio-07', target: 'ARIA (IA embarquée)', targetType: 'personnage', date: '2026-04-08 10:00', author: 'Auteur', transcriptionStatus: 'structured', proposedAction: 'Développer le moment d\'empathie simulée', treatmentStatus: 'in_progress', duration: '2:10', impact: 'medium' },
  { id: 'audio-08', target: 'Run Audit Tome #12', targetType: 'run', date: '2026-04-07 15:30', author: 'Auteur', transcriptionStatus: 'transcribed', proposedAction: 'Revoir les findings de cohérence chapitres 7-9', treatmentStatus: 'open', duration: '3:50', impact: 'high' },
  { id: 'audio-09', target: 'Ch. 9 — Convergence', targetType: 'chapitre', date: '2026-04-06 12:00', author: 'Auteur', transcriptionStatus: 'pending', proposedAction: '—', treatmentStatus: 'open', duration: '6:20', impact: 'high' },
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
  { id: 'run-01', name: 'Audit Canon Complet', mode: 'Audit complet', status: 'simulated', date: '2026-04-14', agents: ['Audit Canon', 'Audit Timeline'], findings: 12, cost: '$0.14', duration: '~3min' },
  { id: 'run-02', name: 'SAFE_BATCH Ch.1-5', mode: 'SAFE_BATCH', status: 'simulated', date: '2026-04-13', agents: ['Audit Canon', 'Audit Personnages', 'Audit Répétitions'], findings: 8, cost: '$0.23', duration: '~5min' },
  { id: 'run-03', name: 'Génération Ch.9 Brouillon', mode: 'Génération chapitre', status: 'simulated', date: '2026-04-12', agents: ['Génération Chapitre'], findings: 0, cost: '$0.85', duration: '~8min' },
  { id: 'run-04', name: 'Style Pass Tome', mode: 'Réécriture ciblée', status: 'simulated', date: '2026-04-11', agents: ['Style Pass'], findings: 23, cost: '$1.50', duration: '~12min' },
  { id: 'run-05', name: 'Vérification Audio Notes', mode: 'Vérification notes audio', status: 'simulated', date: '2026-04-10', agents: ['Vérification Audio'], findings: 5, cost: '$0.08', duration: '~2min' },
];

// ── Assets ──
export interface Asset {
  id: string;
  name: string;
  type: 'PDF' | 'EPUB' | 'DOCX' | 'Markdown' | 'JSON' | 'Image' | 'Audio';
  source: 'local' | 'Dropbox' | 'OneDrive' | 'generated';
  size: string;
  integrationStatus: 'integrated' | 'pending' | 'failed' | 'simulated';
  indexationStatus: 'indexed' | 'not_indexed' | 'partial' | 'simulated';
  targetIndex: string;
  version: number;
  importDate: string;
}

export const assets: Asset[] = [
  { id: 'asset-01', name: 'Bible Physique v2.pdf', type: 'PDF', source: 'local', size: '2.4 MB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'world_index', version: 2, importDate: '2026-04-08' },
  { id: 'asset-02', name: 'Bible Politique v1.docx', type: 'DOCX', source: 'local', size: '1.1 MB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'world_index', version: 1, importDate: '2026-04-05' },
  { id: 'asset-03', name: 'Corpus Style — Exemples.epub', type: 'EPUB', source: 'Dropbox', size: '4.7 MB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'style_index', version: 1, importDate: '2026-04-03' },
  { id: 'asset-04', name: 'Chapitre 8 — Draft v5.md', type: 'Markdown', source: 'local', size: '48 KB', integrationStatus: 'integrated', indexationStatus: 'simulated', targetIndex: 'draft_index', version: 5, importDate: '2026-04-14' },
  { id: 'asset-05', name: 'Notes Monde Étendu.pdf', type: 'PDF', source: 'OneDrive', size: '8.2 MB', integrationStatus: 'pending', indexationStatus: 'not_indexed', targetIndex: 'long_memory_index', version: 1, importDate: '2026-03-28' },
  { id: 'asset-06', name: 'Référence Architecture Stations.json', type: 'JSON', source: 'local', size: '120 KB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'world_index', version: 1, importDate: '2026-04-01' },
  { id: 'asset-07', name: 'Audio Review Ch.1.wav', type: 'Audio', source: 'local', size: '12 MB', integrationStatus: 'simulated', indexationStatus: 'simulated', targetIndex: 'audio_memory_index', version: 1, importDate: '2026-04-09' },
  { id: 'asset-08', name: 'Couverture Concept Art.png', type: 'Image', source: 'local', size: '3.2 MB', integrationStatus: 'integrated', indexationStatus: 'not_indexed', targetIndex: '—', version: 1, importDate: '2026-04-02' },
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
  { id: 'exp-01', name: 'Export JSON Structuré', format: 'JSON', category: 'travail', engineStatus: 'simulated', dependencies: ['Supabase DB'], lastGeneration: '2026-04-10', destination: 'Local / API' },
  { id: 'exp-02', name: 'Export Markdown Chapitres', format: 'Markdown', category: 'travail', engineStatus: 'simulated', dependencies: ['Draft Index'], lastGeneration: '2026-04-10', destination: 'Local' },
  { id: 'exp-03', name: 'Export DOCX Éditeur', format: 'DOCX', category: 'éditorial', engineStatus: 'simulated', dependencies: ['Export Engine', 'Draft Index'], lastGeneration: '2026-04-08', destination: 'Éditeur / OneDrive' },
  { id: 'exp-04', name: 'Export LaTeX', format: 'LaTeX', category: 'publication', engineStatus: 'simulated', dependencies: ['Export Engine'], destination: 'Local' },
  { id: 'exp-05', name: 'Export PDF Publication', format: 'PDF', category: 'publication', engineStatus: 'not_connected', dependencies: ['Export Engine', 'Cover Generation'], destination: 'Imprimeur' },
  { id: 'exp-06', name: 'Export EPUB', format: 'EPUB', category: 'publication', engineStatus: 'not_connected', dependencies: ['Export Engine', 'Cover Generation', 'Style Index'], destination: 'Distributeur' },
  { id: 'exp-07', name: 'Bundle Audit Complet', format: 'JSON + PDF', category: 'audit', engineStatus: 'simulated', dependencies: ['Review Index'], lastGeneration: '2026-04-12', destination: 'Interne' },
  { id: 'exp-08', name: 'Bundle Édition', format: 'DOCX + Annexes', category: 'éditorial', engineStatus: 'not_connected', dependencies: ['Export Engine', 'Draft Index', 'Review Index'], destination: 'Éditeur' },
  { id: 'exp-09', name: 'Bundle Marketing', format: 'PDF + Images', category: 'visuel', engineStatus: 'not_connected', dependencies: ['Cover Generation', 'Export Engine'], destination: 'Marketing' },
  { id: 'exp-10', name: 'Bundle Couverture', format: 'PNG + PSD', category: 'visuel', engineStatus: 'not_connected', dependencies: ['Cover Generation'], destination: 'Graphiste' },
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
  { id: 'act-01', action: 'Run Audit Canon terminé', target: 'Tome 2', date: '2026-04-14 10:30', type: 'run' },
  { id: 'act-02', action: 'Note audio ajoutée', target: 'Commandante Nakamura', date: '2026-04-14 09:15', type: 'audio' },
  { id: 'act-03', action: 'Chapitre 8 validé', target: 'La Fréquence Noire', date: '2026-04-13 18:00', type: 'edit' },
  { id: 'act-04', action: 'SAFE_BATCH terminé', target: 'Ch. 1-5', date: '2026-04-13 14:20', type: 'run' },
  { id: 'act-05', action: 'Import asset', target: 'Chapitre 8 Draft v5', date: '2026-04-14 08:00', type: 'import' },
  { id: 'act-06', action: 'Alerte critique', target: 'Ch. 9 score < 50', date: '2026-04-13 11:00', type: 'alert' },
  { id: 'act-07', action: 'Export Markdown', target: 'Chapitres 1-8', date: '2026-04-10 09:15', type: 'export' },
  { id: 'act-08', action: 'Note audio en attente', target: 'Ch. 9 — Convergence', date: '2026-04-06 12:00', type: 'audio' },
];

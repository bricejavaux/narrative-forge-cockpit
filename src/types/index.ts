// Re-export domain types from the central dummy data module so future code
// can import types from a stable location without depending on the
// data-shaped file directly.
export type {
  Connector, ConnectorStatus, Chapter, Character, Arc, CanonRule,
  Agent, VectorIndex, AudioNote, Run, Asset, ExportConfig, Activity,
  Beat, Payoff, ChapterConsequence,
} from '@/data/dummyData';

import { useState, useMemo } from 'react';
import { canonRules, characters, chapters, arcs, audioNotes } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import NoteComposer from '@/components/shared/NoteComposer';
import {
  ChevronRight, ChevronDown, BookOpen, Globe, Shield, AlertOctagon, Building2,
  Cpu, MapPin, BookMarked, X, Link2, Clock, Users, GitBranch, FileText, Mic, Database
} from 'lucide-react';

const categoryMeta: Record<string, { icon: any; label: string }> = {
  Monde: { icon: Globe, label: 'Règles du monde' },
  Contrainte: { icon: Shield, label: 'Contraintes' },
  Panne: { icon: AlertOctagon, label: 'Modes de panne' },
  Organisation: { icon: Building2, label: 'Organisations' },
  Technologie: { icon: Cpu, label: 'Technologies' },
  Lieu: { icon: MapPin, label: 'Lieux' },
  Glossaire: { icon: BookMarked, label: 'Glossaire' },
  Source: { icon: Database, label: 'Sources & index' },
};

export default function CanonPage() {
  const [selectedRule, setSelectedRule] = useState<string | null>('CAN-001');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Monde: true, Contrainte: true, Organisation: true,
    Technologie: true, Lieu: true, Glossaire: false, Panne: true, Source: true,
  });
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const map: Record<string, typeof canonRules> = {};
    canonRules.forEach((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return;
      (map[r.category] ||= []).push(r);
    });
    return map;
  }, [search]);

  const rule = canonRules.find((r) => r.id === selectedRule);
  const meta = rule ? categoryMeta[rule.category] : null;

  // Simulated linked references
  const linkedChars = rule ? characters.slice(0, 3) : [];
  const linkedChapters = rule ? chapters.slice(0, 4) : [];
  const linkedArcs = rule ? arcs.slice(0, 2) : [];
  const linkedAudio = rule ? audioNotes.filter((a) => a.targetType === 'canon').slice(0, 2) : [];
  const related = rule ? canonRules.filter((r) => r.id !== rule.id).slice(0, 3) : [];

  return (
    <div className="animate-slide-in">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <p className="editorial-eyebrow">Pilotage narratif</p>
          <h1 className="text-3xl editorial-heading text-foreground mt-1">Canon</h1>
        </div>
        {rule && meta && (
          <nav className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BookOpen size={12} />
            <span>Canon</span>
            <ChevronRight size={11} />
            <span>{meta.label}</span>
            <ChevronRight size={11} />
            <span className="text-foreground">{rule.title}</span>
          </nav>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Le canon est la colonne vertébrale du monde. Naviguez les règles, contraintes, organisations,
        technologies et lieux — chaque objet est relié aux personnages, chapitres et notes vocales associés.
      </p>

      <div className="grid grid-cols-12 gap-6">
        {/* Tree navigation */}
        <aside className="col-span-3">
          <div className="cockpit-card sticky top-24 space-y-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans le canon…"
              className="w-full text-xs rounded-lg border border-border bg-background/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <div className="space-y-0.5 max-h-[calc(100vh-260px)] overflow-y-auto">
              {Object.entries(categoryMeta).map(([cat, m]) => {
                const items = grouped[cat] || [];
                const Icon = m.icon;
                const isOpen = expanded[cat];
                return (
                  <div key={cat}>
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [cat]: !s[cat] }))}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground hover:bg-secondary/60 rounded-md"
                    >
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <Icon size={12} className="text-muted-foreground" />
                      <span className="flex-1 text-left">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{items.length}</span>
                    </button>
                    {isOpen && (
                      <div className="ml-5 border-l border-border pl-2 space-y-0.5">
                        {items.length === 0 && (
                          <div className="px-2 py-1 text-[10px] text-muted-foreground italic">— vide —</div>
                        )}
                        {items.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setSelectedRule(r.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors ${
                              selectedRule === r.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                            }`}
                          >
                            {r.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Detail */}
        <main className="col-span-6 space-y-5">
          {rule ? (
            <>
              <div className="cockpit-card-elevated space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="editorial-eyebrow mb-1">{rule.id} · {meta?.label}</p>
                    <h2 className="text-2xl editorial-heading text-foreground">{rule.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedRule(null)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={rule.status} />
                  <StatusBadge status={rule.criticality === 'haute' ? 'critical' : rule.criticality === 'moyenne' ? 'warning' : 'low'} />
                  <span className="px-2 py-0.5 rounded text-xs font-mono border border-border bg-secondary/40 text-muted-foreground">
                    rigidité · {rule.rigidity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono border border-border bg-secondary/40 text-muted-foreground">
                    v{rule.version}
                  </span>
                </div>

                <div className="soft-divider" />

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="editorial-eyebrow mb-1">Résumé</p>
                    <p className="text-foreground leading-relaxed">{rule.summary}</p>
                  </div>
                  <div>
                    <p className="editorial-eyebrow mb-1">Description</p>
                    <p className="text-foreground/85 leading-relaxed">{rule.description}</p>
                  </div>
                  <div>
                    <p className="editorial-eyebrow mb-1">Exceptions</p>
                    <p className="text-foreground/75 leading-relaxed italic">{rule.exceptions}</p>
                  </div>
                </div>
              </div>

              {/* Notes & comments */}
              <NoteComposer target={rule.title} />

              {/* Timeline */}
              <div className="cockpit-card space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground" />
                  <h3 className="editorial-eyebrow">Historique des modifications</h3>
                </div>
                <ol className="relative border-l border-border ml-1 space-y-3">
                  {[
                    { date: rule.lastUpdate, label: `v${rule.version} — révision mineure`, who: rule.source },
                    { date: '2026-03-20', label: `v${rule.version - 1} — passage en active`, who: 'Auteur' },
                    { date: '2026-03-01', label: 'v1 — création', who: 'Auteur' },
                  ].map((h, i) => (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-card border-2 border-primary/40" />
                      <p className="text-sm text-foreground">{h.label}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{h.date} · {h.who}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className="cockpit-card p-12 text-center text-muted-foreground">
              <BookOpen size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sélectionne un objet du canon dans l'arborescence</p>
            </div>
          )}
        </main>

        {/* Linked references */}
        <aside className="col-span-3">
          {rule && (
            <div className="cockpit-card sticky top-24 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-violet" />
                <h3 className="editorial-eyebrow !text-violet">Références liées</h3>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Users size={10} /> Personnages
                </p>
                <div className="space-y-1">
                  {linkedChars.map((c) => (
                    <button key={c.id} className="w-full text-left text-xs text-foreground hover:text-primary transition-colors py-0.5">
                      → {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <GitBranch size={10} /> Arcs
                </p>
                <div className="space-y-1">
                  {linkedArcs.map((a) => (
                    <button key={a.id} className="w-full text-left text-xs text-foreground hover:text-primary transition-colors py-0.5">
                      → {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <FileText size={10} /> Chapitres
                </p>
                <div className="flex flex-wrap gap-1">
                  {linkedChapters.map((c) => (
                    <button
                      key={c.id}
                      className="px-2 py-0.5 rounded text-[11px] font-mono border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      Ch.{c.number}
                    </button>
                  ))}
                </div>
              </div>

              {linkedAudio.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Mic size={10} /> Notes audio
                  </p>
                  <div className="space-y-1.5">
                    {linkedAudio.map((a) => (
                      <div key={a.id} className="text-xs">
                        <p className="text-foreground">{a.proposedAction || '—'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{a.duration} · {a.transcriptionStatus}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="soft-divider" />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Index cible</p>
                <span className="px-2 py-1 rounded text-xs font-mono bg-primary/10 text-primary">
                  {rule.indexAssociated}
                </span>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Objets connexes</p>
                <div className="space-y-1">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRule(r.id)}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    >
                      → {r.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

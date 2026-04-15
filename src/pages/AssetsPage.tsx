import { useState } from 'react';
import { assets } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { FolderOpen, Cloud, ArrowRight, Upload } from 'lucide-react';

const sections = ['Tous les assets', 'Repositories externes', 'Pipeline d\'ingestion'];

export default function AssetsPage() {
  const [activeSection, setActiveSection] = useState(sections[0]);

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Assets</h1>

      <div className="flex gap-1 border-b border-border pb-2">
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeSection === s ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {activeSection === 'Tous les assets' && (
        <div className="cockpit-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3">Nom</th>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Source</th>
                <th className="text-left py-2 px-3">Taille</th>
                <th className="text-left py-2 px-3">Intégration</th>
                <th className="text-left py-2 px-3">Indexation</th>
                <th className="text-left py-2 px-3">Index cible</th>
                <th className="text-left py-2 px-3">V.</th>
                <th className="text-left py-2 px-3">Import</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-surface-2">
                  <td className="py-2 px-3 text-foreground">{a.name}</td>
                  <td className="py-2 px-3"><StatusBadge status={a.type} /></td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{a.source}</td>
                  <td className="py-2 px-3 text-xs font-mono">{a.size}</td>
                  <td className="py-2 px-3"><StatusBadge status={a.integrationStatus} /></td>
                  <td className="py-2 px-3"><StatusBadge status={a.indexationStatus} /></td>
                  <td className="py-2 px-3 text-xs font-mono text-cyan">{a.targetIndex}</td>
                  <td className="py-2 px-3 font-mono text-xs">v{a.version}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{a.importDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === 'Repositories externes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: 'Dropbox', icon: Cloud, desc: 'Corpus longs — EPUB, PDF, DOCX, archives, bibliothèques de style, corpus monde', role: 'Mémoire longue et corpus de référence', corpusCount: 12 },
            { name: 'MS Teams / SharePoint / OneDrive', icon: FolderOpen, desc: 'Repositories documentaires, fichiers partagés, notes collaboratives, archives', role: 'Collaboration éditoriale et archives partagées', corpusCount: 8 },
          ].map(repo => (
            <div key={repo.name} className="cockpit-card border-destructive/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center">
                    <repo.icon size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{repo.name}</h3>
                    <StatusBadge status="not_connected" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{repo.desc}</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Rôle futur</span><span className="text-foreground">{repo.role}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Corpus simulés</span><span className="font-mono text-foreground">{repo.corpusCount}</span></div>
              </div>
              <button className="w-full py-2 text-xs rounded border border-border text-muted-foreground cursor-not-allowed opacity-60">
                Connecter — future connexion
              </button>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'Pipeline d\'ingestion' && (
        <div className="cockpit-card">
          <h3 className="font-display font-semibold text-foreground mb-6">Pipeline d'ingestion documentaire (futur)</h3>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
            {['Import', 'Conversion EPUB/PDF', 'Chunking', 'Tagging', 'Structuration', 'Choix indexation', 'Archivage'].map((step, i) => (
              <div key={step} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-mono text-muted-foreground">
                    {i + 1}
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center max-w-[80px]">{step}</span>
                </div>
                {i < 6 && <ArrowRight size={14} className="text-border mt-[-20px]" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-4">* Pipeline entièrement simulé — nécessite Supabase Storage + OpenAI</p>
        </div>
      )}
    </div>
  );
}

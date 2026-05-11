import { exports_ } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import { FileOutput, Download, Cloud, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { exportService, type ExportFormat, type ExportDestination, type ExportResult } from '@/services/exportService';
import { supabaseService, type ConnectionReadiness } from '@/services/supabaseService';

const categories = ['Tous', 'travail', 'éditorial', 'audit', 'publication', 'visuel'];

export default function ExportsPage() {
  const [filter, setFilter] = useState('Tous');
  const filtered = filter === 'Tous' ? exports_ : exports_.filter((e) => e.category === filter);

  const [readiness, setReadiness] = useState<ConnectionReadiness | null>(null);
  useEffect(() => { supabaseService.getReadiness().then(setReadiness).catch(() => setReadiness(null)); }, []);
  const onedriveOk = !!readiness?.onedrive?.oauth_configured;

  const [filename, setFilename] = useState('export_tome1');
  const [format, setFormat] = useState<ExportFormat>('txt');
  const [destination, setDestination] = useState<ExportDestination>('supabase');
  const [content, setContent] = useState('# Export — Tome I\n\n(Insérer le contenu)\n');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportResult | { error: string } | null>(null);

  const runExport = async () => {
    setBusy(true); setResult(null);
    try {
      const fn = format === 'json' ? exportService.createJsonExport :
                 format === 'md' ? exportService.createMarkdownExport :
                 exportService.createTextExport;
      const r = await fn(filename, content, destination);
      setResult(r);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'unknown' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="editorial-eyebrow">Atelier</p>
        <h1 className="text-3xl editorial-heading text-foreground mt-1">Exports</h1>
      </div>

      {/* Live / minimal export panel */}
      <div className="cockpit-card-elevated space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display text-sm text-foreground" style={{ fontWeight: 500 }}>Export texte / Markdown / JSON</h2>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30">txt / md / json : live</span>
            <span className={`font-mono px-2 py-0.5 rounded-full border ${onedriveOk ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
              OneDrive : {onedriveOk ? 'disponible' : 'non disponible'}
            </span>
            <span className="font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/30">PDF / DOCX / EPUB : futur</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="editorial-eyebrow">Nom de fichier</label>
            <input value={filename} onChange={(e) => setFilename(e.target.value)} className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 font-mono text-foreground" />
          </div>
          <div>
            <label className="editorial-eyebrow">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-foreground">
              <option value="txt">Texte (.txt)</option>
              <option value="md">Markdown (.md)</option>
              <option value="json">JSON (.json)</option>
            </select>
          </div>
          <div>
            <label className="editorial-eyebrow">Destination</label>
            <select value={destination} onChange={(e) => setDestination(e.target.value as ExportDestination)} className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-foreground">
              <option value="supabase">Supabase</option>
              <option value="onedrive" disabled={!onedriveOk}>OneDrive — 04_exports</option>
              <option value="both" disabled={!onedriveOk}>Supabase + OneDrive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={runExport} disabled={busy || !filename || !content}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
              Exporter
            </button>
          </div>
        </div>

        <div>
          <label className="editorial-eyebrow">Contenu</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
            className="mt-1 w-full bg-card border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground" />
        </div>

        {result && 'error' in result && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-600">
            <AlertTriangle size={11} className="mt-0.5" /> {result.error}
          </div>
        )}
        {result && !('error' in result) && (
          <div className="rounded-md border border-border bg-secondary/30 p-2 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className={result.mode === 'live' ? 'text-emerald-600' : 'text-amber'} />
              <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${result.mode === 'live' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                mode : {result.mode}
              </span>
              <span className="text-muted-foreground">Supabase : {result.supabase_status}</span>
              <span className="text-muted-foreground">OneDrive : {result.onedrive_status}</span>
            </div>
            {result.onedrive_path && <p className="font-mono text-foreground/80">OneDrive : {result.onedrive_path}</p>}
            {result.warnings?.length > 0 && (
              <ul className="text-amber-600">
                {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${filter === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="editorial-eyebrow">Presets d'export</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-violet-500/10 text-violet-600 border-violet-500/30">design examples</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exp) => {
            const isText = ['txt', 'md', 'json'].includes((exp.format || '').toLowerCase());
            return (
              <div key={exp.id} className={`cockpit-card space-y-3 ${exp.engineStatus === 'not_connected' ? 'border-destructive/20' : 'border-amber/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileOutput size={14} className="text-primary" />
                    <span className="font-display font-semibold text-sm text-foreground">{exp.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isText ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-violet-500/10 text-violet-600 border-violet-500/30'}`}>
                    {isText ? 'preset live' : 'futur'}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Format</span><span className="font-mono text-foreground">{exp.format}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Catégorie</span><StatusBadge status={exp.category} /></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="text-foreground">{exp.destination}</span></div>
                  {exp.lastGeneration && <div className="flex justify-between"><span className="text-muted-foreground">Dernière génération</span><span className="font-mono text-foreground">{exp.lastGeneration}</span></div>}
                </div>
                <button
                  disabled={!isText}
                  onClick={() => isText && setFormat((exp.format as ExportFormat))}
                  className={`w-full flex items-center justify-center gap-2 py-2 text-xs rounded border ${isText ? 'border-primary/40 text-primary hover:bg-primary/10' : 'border-border text-muted-foreground cursor-not-allowed opacity-60'}`}
                >
                  <Download size={12} /> {isText ? 'Charger comme preset' : 'Format à venir'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { audioNotes } from '@/data/dummyData';
import StatusBadge from '@/components/shared/StatusBadge';
import MicButton from '@/components/shared/MicButton';
import { Mic, Play, Pause, FileText, Clock, User } from 'lucide-react';

const subSections = ['Notes audio', 'Relectures chapitres', 'Commentaires beats', 'Revues cross-chapitres', 'Sessions de lecture', 'Historique vocal', 'Traçabilité'];

const recordVariants = [
  'Sur le canon', 'Sur un personnage', 'Sur un arc', 'Sur un beat',
  'Sur un brouillon', 'Sur un chapitre', 'Sur un audit', 'Sur un run'
];

export default function AudioPage() {
  const [activeSection, setActiveSection] = useState(subSections[0]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Audio & Reviews</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose/30 bg-rose/5 text-rose text-xs font-mono">
          <Mic size={12} className="animate-pulse-glow" />
          Audio omniprésent — simulé
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {subSections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeSection === s ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {activeSection === 'Notes audio' && (
        <div className="space-y-4">
          {/* Big record button */}
          <div className="cockpit-card border-rose/20 cockpit-glow-violet">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground">Enregistrer une note audio</h2>
              <span className="text-[10px] font-mono text-muted-foreground">Simulé — Whisper non connecté</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recordVariants.map(v => (
                <MicButton key={v} label={v} size="md" />
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="cockpit-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Cible</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Durée</th>
                  <th className="text-left py-2 px-3">Transcription</th>
                  <th className="text-left py-2 px-3">Impact</th>
                  <th className="text-left py-2 px-3">Action proposée</th>
                  <th className="text-left py-2 px-3">Traitement</th>
                </tr>
              </thead>
              <tbody>
                {audioNotes.map(note => (
                  <tr key={note.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                    <td className="py-2 px-3 text-foreground">{note.target}</td>
                    <td className="py-2 px-3"><StatusBadge status={note.targetType} /></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{note.date}</td>
                    <td className="py-2 px-3 text-xs font-mono text-foreground">{note.duration}</td>
                    <td className="py-2 px-3"><StatusBadge status={note.transcriptionStatus} /></td>
                    <td className="py-2 px-3"><StatusBadge status={note.impact} /></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px] truncate">{note.proposedAction}</td>
                    <td className="py-2 px-3"><StatusBadge status={note.treatmentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audio card detail */}
          <div className="cockpit-card space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Détail note audio (simulé)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Audio brut</span>
                <div className="mt-1 flex items-center gap-2 p-3 bg-surface-2 rounded">
                  <button className="text-rose cursor-not-allowed"><Play size={16} /></button>
                  <div className="flex-1 h-1 bg-surface-3 rounded-full"><div className="w-1/3 h-full bg-rose rounded-full" /></div>
                  <span className="text-xs font-mono text-muted-foreground">2:34</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Transcription brute</span>
                <p className="mt-1 text-xs text-muted-foreground italic bg-surface-2 p-3 rounded">
                  "Il faut absolument approfondir le dilemme moral de Nakamura au chapitre 8. La confrontation avec les données Aether n'est pas assez viscérale..."
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Structuration future</span>
                <p className="mt-1 text-xs text-muted-foreground font-mono bg-surface-2 p-3 rounded">→ Tâche: réécriture beat 8.5 · Priorité: haute · Agent: Réécriture Ciblée</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase">Impact & agent</span>
                <p className="mt-1 text-xs text-muted-foreground bg-surface-2 p-3 rounded">Impact élevé · Agent associé: Réécriture Ciblée · Version: v5</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'Relectures chapitres' && (
        <div className="cockpit-card space-y-4">
          <h3 className="font-display font-semibold text-foreground">Lecture commentée — Ch. 8 La Fréquence Noire (simulé)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-2 rounded p-4 text-sm text-muted-foreground leading-relaxed max-h-[400px] overflow-y-auto">
              <p className="text-foreground mb-4">[Extrait simulé du chapitre 8]</p>
              <p>Le signal traversa les couches de bruit cosmique comme une lame de verre fendant un océan d'encre. Nakamura fixait l'oscilloscope, ses doigts blancs agrippés au bord de la console. Quatre-vingt-douze heures sans sommeil, et pourtant chaque fibre de son être vibrait d'une clarté terrifiante.</p>
              <p className="mt-3">«La modulation est artificielle», murmura Elara sans lever les yeux de ses calculs. «Pas naturelle. Pas aléatoire. Quelqu'un — ou quelque chose — structure ce signal.»</p>
              <p className="mt-3">Le silence qui suivit pesa plus lourd que toute la masse de Jupiter, dont la station Aether dessinait l'ombre colossale sur leurs visages blêmes.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Commentaires oraux</h4>
              {[
                { time: '0:45', text: 'Très bonne ouverture — garder cette tension', status: 'done' },
                { time: '1:20', text: 'Le dialogue d\'Elara est trop expositoire ici', status: 'open' },
                { time: '2:10', text: 'La métaphore de Jupiter est forte — à étoffer', status: 'in_progress' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-surface-2 rounded">
                  <span className="font-mono text-[10px] text-rose w-10 shrink-0">{c.time}</span>
                  <p className="text-xs text-foreground flex-1">{c.text}</p>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!['Notes audio', 'Relectures chapitres'].includes(activeSection) && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Section "{activeSection}" — simulée</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Whisper + Supabase requis</p>
        </div>
      )}
    </div>
  );
}

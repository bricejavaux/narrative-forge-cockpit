import { connectors } from '@/data/dummyData';
import ConnectorStatusCard from '@/components/shared/ConnectorStatusCard';
import { Settings as SettingsIcon, Sliders, Mic, Shield } from 'lucide-react';

function NarrativeSlider({ label, value, min = 0, max = 100 }: { label: string; value: number; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} readOnly
        className="w-full h-1.5 bg-surface-2 rounded-full appearance-none cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
    </div>
  );
}

const sections = ['Connecteurs', 'Paramètres narratifs', 'Paramètres IA', 'Gouvernance réécriture', 'Indexes vectoriels', 'Audio & transcription', 'Auth & accès'];

import { useState } from 'react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState(sections[0]);

  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-3 py-2 text-xs whitespace-nowrap rounded-t transition-colors ${activeSection === s ? 'bg-surface-2 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {activeSection === 'Connecteurs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map(c => (
            <ConnectorStatusCard key={c.id} name={c.name} description={c.description} status={c.status} note={c.note} />
          ))}
        </div>
      )}

      {activeSection === 'Paramètres narratifs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="cockpit-card space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Sliders size={14} className="text-primary" /> Structure</h3>
            <NarrativeSlider label="Longueur standard (mots)" value={3500} min={1000} max={6000} />
            <NarrativeSlider label="Amplitude de variation" value={15} />
            <NarrativeSlider label="Tempo" value={65} />
            <NarrativeSlider label="Respiration" value={40} />
            <NarrativeSlider label="Compression" value={30} />
            <NarrativeSlider label="Fragmentation temporelle" value={25} />
            <NarrativeSlider label="Fragmentation POV" value={35} />
          </div>
          <div className="cockpit-card space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Sliders size={14} className="text-violet" /> Tonalité</h3>
            <NarrativeSlider label="Densité scientifique" value={55} />
            <NarrativeSlider label="Densité émotionnelle" value={70} />
            <NarrativeSlider label="Niveau de mystère" value={72} />
            <NarrativeSlider label="Charge personnages" value={60} />
            <NarrativeSlider label="Délai avant payoff" value={60} />
            <NarrativeSlider label="Brutalité des bascules" value={45} />
            <NarrativeSlider label="Répétition max. tolérée" value={20} />
          </div>
        </div>
      )}

      {activeSection === 'Audio & transcription' && (
        <div className="cockpit-card space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Mic size={14} className="text-rose" /> Audio & Transcription</h3>
          <div className="space-y-3">
            {[
              ['Microphone sur les fiches personnages', true],
              ['Microphone sur les chapitres', true],
              ['Microphone sur les beats', true],
              ['Transcription automatique', false],
              ['Structuration post-transcription', false],
              ['Indexation des notes vocales', false],
              ['Conservation audio brut', true],
              ['Traçabilité complète', true],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground">{label as string}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-4 rounded-full ${val ? 'bg-emerald' : 'bg-surface-3'} relative cursor-not-allowed`}>
                    <div className={`w-3 h-3 rounded-full bg-foreground absolute top-0.5 transition-all ${val ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  {!val && <span className="text-[10px] font-mono text-muted-foreground">nécessite Whisper</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!['Connecteurs', 'Paramètres narratifs', 'Audio & transcription'].includes(activeSection) && (
        <div className="cockpit-card p-8 text-center">
          <p className="text-muted-foreground text-sm">Section "{activeSection}" — simulée</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Future configuration</p>
        </div>
      )}
    </div>
  );
}

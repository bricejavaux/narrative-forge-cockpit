import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Action = { label: string; route: string; reason: string };

export default function NextBestActionPanel() {
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ count: canonCount }, { count: charsCount }, { count: chaptersCount }, { count: beatsCount }, { count: rewritesCount }] = await Promise.all([
          supabase.from('canon_objects').select('id', { count: 'exact', head: true }),
          supabase.from('characters').select('id', { count: 'exact', head: true }),
          supabase.from('chapters').select('id', { count: 'exact', head: true }),
          supabase.from('beats').select('id', { count: 'exact', head: true }),
          supabase.from('rewrite_tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        let next: Action;
        if (!canonCount) next = { label: 'Importer articulation.txt (canon)', route: '/canon', reason: 'Aucun canon_object actif.' };
        else if (!charsCount) next = { label: 'Importer personnages.txt', route: '/characters', reason: 'Aucun personnage en base.' };
        else if (!chaptersCount) next = { label: 'Importer architecture des chapitres', route: '/architecture', reason: 'Aucun chapitre en base.' };
        else if (!beatsCount) next = { label: 'Générer les beats prévus du Ch.1', route: '/production', reason: 'Aucun beat planifié.' };
        else if ((rewritesCount ?? 0) > 0) next = { label: `Résoudre ${rewritesCount} tâche(s) de réécriture`, route: '/production', reason: 'Tâches de réécriture en attente.' };
        else next = { label: 'Lancer un audit méta-tome', route: '/runs', reason: 'Pipeline prêt pour audit transverse.' };

        setAction(next);
      } catch {
        setAction({ label: 'Vérifier la connexion Supabase', route: '/settings', reason: 'Lecture impossible — vérifier les connexions.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="cockpit-card space-y-2">
      <div className="flex items-center gap-2">
        <Compass size={14} className="text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">Prochaine action recommandée</h3>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Analyse de l'état de production…</p>}
      {action && (
        <Link to={action.route} className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 hover:bg-primary/10 transition-colors">
          <div>
            <p className="text-sm text-foreground font-display font-semibold">{action.label}</p>
            <p className="text-[11px] text-muted-foreground">{action.reason}</p>
          </div>
          <ArrowRight size={16} className="text-primary shrink-0" />
        </Link>
      )}
    </div>
  );
}

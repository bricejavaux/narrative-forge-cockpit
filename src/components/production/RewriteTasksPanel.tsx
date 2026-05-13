import { useEffect, useState } from 'react';
import { chapterProductionService } from '@/services/chapterProductionService';

export default function RewriteTasksPanel({ chapterId }: { chapterId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const refresh = () => chapterProductionService.listRewriteTasks(chapterId).then(setTasks);
  useEffect(() => { refresh(); }, [chapterId]);

  return (
    <div className="cockpit-card space-y-2">
      <h3 className="editorial-eyebrow">Tâches de réécriture ciblée</h3>
      {tasks.length === 0 && <p className="text-xs text-muted-foreground">Aucune tâche de réécriture pour ce chapitre.</p>}
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="border border-border rounded p-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{t.title}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{t.status}</span>
            </div>
            {t.instruction && <p className="text-muted-foreground">{t.instruction}</p>}
            <div className="flex gap-1.5">
              <button onClick={async () => { await chapterProductionService.setRewriteStatus(t.id, 'accepted'); refresh(); }}
                className="px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-700 text-[10px]">Accepter</button>
              <button onClick={async () => { await chapterProductionService.setRewriteStatus(t.id, 'rejected'); refresh(); }}
                className="px-2 py-0.5 rounded border border-rose-500/30 text-rose-700 text-[10px]">Rejeter</button>
              <button onClick={async () => { await chapterProductionService.setRewriteStatus(t.id, 'escalated'); refresh(); }}
                className="px-2 py-0.5 rounded border border-amber-500/30 text-amber-700 text-[10px]">Escalader</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

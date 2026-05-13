import { supabase } from '@/integrations/supabase/client';

export const chapterProductionService = {
  async listVersions(chapter_id: string) {
    const { data } = await supabase.from('chapter_versions').select('*').eq('chapter_id', chapter_id).order('version', { ascending: false });
    return data ?? [];
  },

  async lock(chapter_id: string, reason: string) {
    const { error } = await supabase.from('chapters').update({ locked: true, production_status: 'locked' } as any).eq('id', chapter_id);
    if (error) throw error;
    await supabase.from('production_events').insert({
      event_type: 'chapter_locked',
      object_type: 'chapter',
      object_id: chapter_id,
      event_summary: reason,
      new_status: 'locked',
    } as any);
  },

  async reopen(chapter_id: string, reason: string) {
    const { error } = await supabase.from('chapters').update({ locked: false, production_status: 'reopened' } as any).eq('id', chapter_id);
    if (error) throw error;
    await supabase.from('production_events').insert({
      event_type: 'chapter_reopened',
      object_type: 'chapter',
      object_id: chapter_id,
      event_summary: reason,
      new_status: 'reopened',
    } as any);
  },

  async listRewriteTasks(chapter_id: string) {
    const { data } = await supabase.from('rewrite_tasks').select('*').eq('chapter_id', chapter_id).order('created_at', { ascending: false });
    return data ?? [];
  },

  async setRewriteStatus(id: string, status: 'pending' | 'accepted' | 'rejected' | 'escalated') {
    const { error } = await supabase.from('rewrite_tasks').update({ status } as any).eq('id', id);
    if (error) throw error;
  },
};

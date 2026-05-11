import { supabase } from '@/integrations/supabase/client';

export type AgentRow = {
  id: string;
  external_id: string | null;
  name: string;
  category: string;
  objective: string | null;
  description: string | null;
  default_model: string | null;
  selected_model: string | null;
  quality_profile: string | null;
  permission_level: string | null;
  persistence_status: string | null;
  vector_context_status: string | null;
  rewrite_rights: boolean;
  status: string;
  criticality: string | null;
  simulated_cost: string | null;
  is_active: boolean;
  updated_at: string;
};

export type AgentVersionRow = {
  id: string;
  agent_id: string;
  version_number: number;
  objective: string | null;
  system_prompt: string | null;
  operating_script: any;
  inputs_schema: any;
  outputs_schema: any;
  model_recommendations: any;
  index_bindings: any;
  parameters: any;
  permission_policy: any;
  created_at: string;
  created_by: string | null;
  change_reason: string | null;
  is_current: boolean;
};

export type AgentBindingRow = {
  id: string;
  agent_id: string;
  index_name: string;
  corpus_name: string | null;
  required: boolean;
  top_k: number;
  similarity_threshold: number;
  status: string;
};

export const agentsService = {
  async list(): Promise<AgentRow[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name', { ascending: true });
    if (error) return [];
    return (data ?? []) as AgentRow[];
  },

  async bootstrap() {
    const { data, error } = await supabase.functions.invoke('agents-bootstrap', { body: {} });
    if (error) throw error;
    return data;
  },

  async getCurrentVersion(agent_id: string): Promise<AgentVersionRow | null> {
    const { data } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('is_current', true)
      .maybeSingle();
    return (data ?? null) as AgentVersionRow | null;
  },

  async listVersions(agent_id: string): Promise<AgentVersionRow[]> {
    const { data } = await supabase
      .from('agent_versions')
      .select('*')
      .eq('agent_id', agent_id)
      .order('version_number', { ascending: false });
    return (data ?? []) as AgentVersionRow[];
  },

  async listBindings(agent_id: string): Promise<AgentBindingRow[]> {
    const { data } = await supabase
      .from('agent_index_bindings')
      .select('*')
      .eq('agent_id', agent_id);
    return (data ?? []) as AgentBindingRow[];
  },

  /** Save a new version. Marks it current; previous current is unflagged. */
  async saveVersion(agent_id: string, patch: Partial<AgentVersionRow>, change_reason?: string) {
    const versions = await this.listVersions(agent_id);
    const nextNumber = (versions[0]?.version_number ?? 0) + 1;
    // Unset previous current
    await supabase.from('agent_versions').update({ is_current: false }).eq('agent_id', agent_id).eq('is_current', true);
    const { data, error } = await supabase
      .from('agent_versions')
      .insert({
        agent_id,
        version_number: nextNumber,
        is_current: true,
        change_reason: change_reason ?? null,
        objective: patch.objective ?? null,
        system_prompt: patch.system_prompt ?? null,
        operating_script: patch.operating_script ?? [],
        inputs_schema: patch.inputs_schema ?? {},
        outputs_schema: patch.outputs_schema ?? {},
        model_recommendations: patch.model_recommendations ?? {},
        index_bindings: patch.index_bindings ?? [],
        parameters: patch.parameters ?? {},
        permission_policy: patch.permission_policy ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return data as AgentVersionRow;
  },

  async restoreVersion(agent_id: string, version_id: string) {
    await supabase.from('agent_versions').update({ is_current: false }).eq('agent_id', agent_id).eq('is_current', true);
    const { error } = await supabase.from('agent_versions').update({ is_current: true }).eq('id', version_id);
    if (error) throw error;
    return { ok: true };
  },

  async updateAgent(id: string, patch: Partial<AgentRow>) {
    const { error } = await supabase.from('agents').update(patch).eq('id', id);
    if (error) throw error;
    return { ok: true };
  },
};

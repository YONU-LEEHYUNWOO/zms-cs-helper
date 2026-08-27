/**
 * ZMS CS Helper - 사내 상담원 계정(InternalAgent) 전용 커스텀 Sub-Hook (useInternalAgentState)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/hooks/subhooks/useInternalAgentState.ts
 * - internal_agents 테이블 상태 관리, CRUD, Auth 연동 및 실시간 동기화
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase/client';
import { InternalAgent } from '../../../backend/types';
import { generateUUID } from '../../../lib/utils/uuid';

export function useInternalAgentState(currentAgent: InternalAgent | null) {
  const [agents, setAgents] = useState<InternalAgent[]>([]);

  const fetchAgents = useCallback(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from('internal_agents')
        .select('*')
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            const agentList = data as InternalAgent[];
            if (currentAgent && !agentList.find(a => a.email === currentAgent.email || a.agent_name === currentAgent.agent_name)) {
              agentList.unshift(currentAgent);
            }
            setAgents(agentList);
          } else if (currentAgent) {
            setAgents([currentAgent]);
          } else {
            setAgents([]);
          }
        });
    }
  }, [currentAgent]);

  useEffect(() => {
    fetchAgents();
    if (isSupabaseConfigured() && supabase) {
      const agentChannel = supabase
        .channel('public:internal_agents_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_agents' }, () => {
          fetchAgents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(agentChannel);
      };
    }
  }, [fetchAgents]);

  const handleAddAgent = useCallback((newAgent: InternalAgent) => {
    setAgents((prev) => [...prev, newAgent]);
  }, []);

  const handleSaveAgentProfile = useCallback(async (updatedAgent: InternalAgent) => {
    if (!currentAgent) return;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('internal_agents')
          .upsert([updatedAgent])
          .select();
        if (error) {
          console.error('[saveAgentProfile] Supabase 오류:', error.message);
        } else if (data && data.length > 0) {
          const saved = data[0] as InternalAgent;
          setAgents((prev) => {
            const exists = prev.some((a) => a.id === saved.id || a.email === saved.email);
            const updated = exists
              ? prev.map((a) => (a.id === saved.id || a.email === saved.email ? saved : a))
              : [...prev, saved];
            return updated;
          });
          return;
        }
      } catch (e) {
        console.error('[saveAgentProfile] Supabase 예외:', e);
      }
    }

    setAgents((prev) =>
      prev.map((a) => (a.id === updatedAgent.id || a.agent_name === currentAgent.agent_name ? updatedAgent : a))
    );
  }, [currentAgent]);

  const handleRegisterNewAgent = useCallback(async (newAgentData: {
    email: string;
    agent_name: string;
    team_name?: string;
    extension_number?: string;
    phone_number?: string;
    role?: 'AGENT' | 'LEADER' | 'ADMIN';
    password_hash?: string;
  }) => {
    let createdAgentId = generateUUID();
    const targetEmail = (newAgentData.email || '').toLowerCase().trim();
    const cleanAgentName = newAgentData.agent_name.trim();

    if (isSupabaseConfigured() && supabase) {
      const { data: existingAgent } = await supabase
        .from('internal_agents')
        .select('*')
        .or(`email.eq.${targetEmail},agent_name.eq.${cleanAgentName}`)
        .maybeSingle();

      if (existingAgent) {
        createdAgentId = existingAgent.id;
      }

      const newAgent: InternalAgent = {
        id: createdAgentId,
        email: targetEmail,
        agent_name: cleanAgentName,
        team_name: newAgentData.team_name || 'CS 1팀',
        extension_number: newAgentData.extension_number || '',
        phone_number: newAgentData.phone_number || '',
        role: newAgentData.role || 'AGENT',
        agent_status: '활성화',
        created_at: existingAgent?.created_at || new Date().toISOString(),
      };

      const { error: dbError } = await supabase.from('internal_agents').upsert([newAgent]);
      if (dbError) {
        console.error('[registerNewAgent] Supabase DB 오류:', dbError.message);
        throw new Error(`상담원 DB 저장 실패: ${dbError.message}`);
      }

      try {
        const { data: authData } = await supabase.auth.signUp({
          email: targetEmail,
          password: newAgentData.password_hash || '12341234',
          options: {
            data: {
              agent_name: cleanAgentName,
              team_name: newAgentData.team_name || 'CS 1팀',
              extension_number: newAgentData.extension_number || '',
              phone_number: newAgentData.phone_number || '',
              role: newAgentData.role || 'AGENT',
            },
          },
        });

        if (authData?.user) {
          await supabase.from('internal_agents').update({ id: authData.user.id }).eq('email', targetEmail);
          newAgent.id = authData.user.id;
        }
      } catch (authException: any) {
        console.warn('[registerNewAgent] Supabase Auth signUp 경고 (DB 저장은 보장됨):', authException?.message);
      }

      setAgents((prev) => {
        const exists = prev.some((a) => a.id === newAgent.id || a.email === newAgent.email || a.agent_name === newAgent.agent_name);
        return exists ? prev.map((a) => (a.email === newAgent.email || a.agent_name === newAgent.agent_name ? newAgent : a)) : [...prev, newAgent];
      });

      fetchAgents();
      return newAgent;
    }

    const fallbackAgent: InternalAgent = {
      id: createdAgentId,
      email: targetEmail,
      agent_name: cleanAgentName,
      team_name: newAgentData.team_name || 'CS 1팀',
      extension_number: newAgentData.extension_number || '',
      phone_number: newAgentData.phone_number || '',
      role: newAgentData.role || 'AGENT',
      agent_status: '활성화',
      created_at: new Date().toISOString(),
    };
    setAgents((prev) => [...prev, fallbackAgent]);
    return fallbackAgent;
  }, [fetchAgents]);

  const handleToggleAgentStatus = useCallback((agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, agent_status: a.agent_status === '활성화' ? '비활성화' : ('활성화' as const) }
          : a
      )
    );
  }, []);

  const handleUpdateAgentRole = useCallback(async (agentId: string, newRole: 'AGENT' | 'LEADER' | 'ADMIN') => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('internal_agents')
          .update({ role: newRole })
          .eq('id', agentId);
        if (error) {
          console.error('[updateAgentRole] Supabase 오류:', error.message);
        }
      } catch (e) {
        console.error('[updateAgentRole] Supabase 예외:', e);
      }
    }
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, role: newRole } : a))
    );
  }, []);

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('internal_agents').delete().eq('id', agentId);
      if (!error) {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        console.error('[deleteAgent] 실패:', error.message);
      }
    }
  }, []);

  return {
    agents,
    setAgents,
    fetchAgents,
    handleAddAgent,
    handleSaveAgentProfile,
    handleRegisterNewAgent,
    handleToggleAgentStatus,
    handleUpdateAgentRole,
    handleDeleteAgent,
  };
}

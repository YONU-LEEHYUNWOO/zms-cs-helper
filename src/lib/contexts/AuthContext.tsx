import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import { InternalAgent } from '../../backend/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  agent: InternalAgent | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshAgentData: () => Promise<void>;
  setAgentOverride: (agent: InternalAgent) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  agent: null,
  isLoading: true,
  signOut: async () => {},
  refreshAgentData: async () => {},
  setAgentOverride: () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * Supabase 세션의 user 정보를 InternalAgent 형태로 변환
 * 회원가입 시 저장한 user_metadata.agent_name 을 우선 사용
 * 없으면 이메일 앞부분을 이름으로 사용
 */
async function fetchAgentFromDB(user: User): Promise<InternalAgent> {
  const cacheKey = `zms_agent_profile_${user.id}`;
  const localCached = localStorage.getItem(cacheKey);
  const userMetaName = user.user_metadata?.agent_name;
  const defaultAgentName = userMetaName || user.email?.split('@')[0] || '상담원';

  if (!supabase) {
    if (localCached) {
      try { return JSON.parse(localCached); } catch (e) {}
    }
    return {
      id: user.id,
      agent_name: defaultAgentName,
      email: user.email || '',
      role: 'AGENT',
      agent_status: '활성화',
      created_at: user.created_at,
    };
  }

  // Supabase DB 조회: ID 또는 이메일 기준으로 매칭
  const userEmailClean = (user.email || '').toLowerCase().trim();
  const { data, error } = await supabase
    .from('internal_agents')
    .select('*')
    .or(`id.eq.${user.id},email.eq.${userEmailClean}`)
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    const fetched = data as InternalAgent;
    localStorage.setItem(cacheKey, JSON.stringify(fetched));
    return fetched;
  }

  if (localCached) {
    try { return JSON.parse(localCached); } catch (e) {}
  }

  return {
    id: user.id,
    agent_name: defaultAgentName,
    email: user.email || '',
    role: 'AGENT',
    agent_status: '활성화',
    created_at: user.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<InternalAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // 초기 세션 로드
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        setAgent(await fetchAgentFromDB(session.user));
      }
      setIsLoading(false);
    });

    // 인증 상태 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        setAgent(await fetchAgentFromDB(session.user));
      } else {
        setAgent(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAgent(null);
  };

  const refreshAgentData = async () => {
    if (user) {
      setAgent(await fetchAgentFromDB(user));
    }
  };

  const setAgentOverride = (newAgent: InternalAgent) => {
    setAgent(newAgent);
    if (user?.id) {
      localStorage.setItem(`zms_agent_profile_${user.id}`, JSON.stringify(newAgent));
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, agent, isLoading, signOut, refreshAgentData, setAgentOverride }}>
      {children}
    </AuthContext.Provider>
  );
};

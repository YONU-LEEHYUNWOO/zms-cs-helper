/**
 * ZMS CS Helper - 중앙 마스터 업무 & TODO 리포지토리 구현체 (AgentTaskRepositoryImpl)
 *
 * [핵심 기능 및 무결성 보장]
 * 1. Supabase agent_tasks 테이블 연동 (FK consultation_id 사전 검증하여 23503 에러 100% 방지)
 * 2. 1차 풀 스키마 upsert 실패 시 2차 기본 컬럼 폴백 upsert 지원 (400 Bad Request 방지)
 * 3. 로컬스토리지 미동기화 TODO 감지 시 Supabase DB로 자동 복구/밀어넣기 업로드
 * 4. 사내 다중 상담사 간 1초 실시간 Realtime 동기화 및 전 사내 마스터 공유
 */

import { AgentTask } from '../types';
import { IAgentTaskRepository } from './IAgentTaskRepository';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export class AgentTaskRepositoryImpl implements IAgentTaskRepository {
  private readonly STORAGE_KEY = 'local_agent_tasks';
  private subscribers: Array<(tasks: AgentTask[]) => void> = [];
  private cache: AgentTask[] = [];

  constructor() {
    this.loadInitial();
  }

  /**
   * 초기 데이터 로드 및 수파베이스 연동
   */
  private async loadInitial(): Promise<void> {
    await this.getAllTasks();
  }

  private notifySubscribers(tasks: AgentTask[]): void {
    this.subscribers.forEach((cb) => cb(tasks));
  }

  /**
   * consultation_id가 Supabase consultations DB 테이블에 실제로 존재하는지 사전 검증
   * (존재하지 않으면 null을 반환하여 23503 Foreign Key Constraint 에러 사전 차단)
   */
  private async verifyConsultationId(consId?: string): Promise<string | null> {
    if (!consId) return null;
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('id')
        .eq('id', consId)
        .maybeSingle();

      if (!error && data) {
        return consId;
      } else {
        console.warn('[AgentTaskRepo] consultation_id가 DB consultations 테이블에 존재하지 않아 null로 처리 (FK 위반 방지):', consId);
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * DB에 보낼 payload 포맷팅
   */
  private formatDbPayload(t: AgentTask, verifiedConsId: string | null) {
    return {
      id: t.id,
      consultation_id: verifiedConsId,
      agent_name: t.agent_name,
      created_by: t.created_by || t.agent_name,
      task_title: t.task_title,
      tag: t.tag || '개인메모',
      due_date: t.due_date ? new Date(t.due_date).toISOString() : null,
      is_completed: t.is_completed ?? false,
      created_at: t.created_at || new Date().toISOString(),
      history: t.history || [],
    };
  }

  async getAllTasks(): Promise<AgentTask[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('agent_tasks')
          .select('*')
          .order('created_at', { ascending: false });

        const cachedRaw = localStorage.getItem(this.STORAGE_KEY);
        let localTasks: AgentTask[] = [];
        if (cachedRaw) {
          try { localTasks = JSON.parse(cachedRaw); } catch {}
        }

        if (!error && data) {
          const fetchedTasks = data as AgentTask[];

          // 💡 로컬스토리지에는 있으나 DB에는 업로드되지 않은 태스크 탐지 및 Supabase DB로 복구 동기화
          const dbTaskIds = new Set(fetchedTasks.map((t) => t.id));
          const unsyncedLocalTasks = localTasks.filter((t) => !dbTaskIds.has(t.id));

          if (unsyncedLocalTasks.length > 0) {
            console.log(`[AgentTaskRepo] 미동기화 로컬 TODO ${unsyncedLocalTasks.length}건 → Supabase DB 자동 마이그레이션 시작`);
            for (const unsynced of unsyncedLocalTasks) {
              await this.saveTask(unsynced);
            }
          }

          const combinedMap = new Map<string, AgentTask>();
          fetchedTasks.forEach((t) => combinedMap.set(t.id, t));
          unsyncedLocalTasks.forEach((t) => combinedMap.set(t.id, t));

          this.cache = Array.from(combinedMap.values()).sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );

          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
          this.notifySubscribers(this.cache);
          return this.cache;
        } else if (error) {
          console.warn('[AgentTaskRepo] Supabase 조회 실패, 로컬 캐시 사용:', error.message);
        }
      } catch (e) {
        console.warn('[AgentTaskRepo] getAllTasks 예외:', e);
      }
    }

    // 로컬스토리지 폴백
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.cache = JSON.parse(raw);
      } catch {
        this.cache = [];
      }
    } else {
      this.cache = [];
    }
    this.notifySubscribers(this.cache);
    return this.cache;
  }

  async getTaskById(id: string): Promise<AgentTask | null> {
    return this.cache.find((t) => t.id === id) || null;
  }

  async saveTask(task: AgentTask): Promise<AgentTask> {
    const verifiedConsId = await this.verifyConsultationId(task.consultation_id);
    const toSave: AgentTask = {
      ...task,
      consultation_id: verifiedConsId || undefined,
    };

    if (isSupabaseConfigured() && supabase) {
      const payload = this.formatDbPayload(toSave, verifiedConsId);

      // 1차 시도: 전체 컬럼 풀 payload upsert
      const { error: err1 } = await supabase.from('agent_tasks').upsert([payload]);

      if (err1) {
        console.warn('[AgentTaskRepo] 1차 풀 payload upsert 실패, 2차 폴백 진행:', err1.message);
        // 2차 시도: 기본 컬럼만으로 폴백 upsert
        const fallbackPayload = {
          id: payload.id,
          consultation_id: payload.consultation_id,
          agent_name: payload.agent_name,
          task_title: payload.task_title,
          due_date: payload.due_date,
          is_completed: payload.is_completed,
          created_at: payload.created_at,
        };
        const { error: err2 } = await supabase.from('agent_tasks').upsert([fallbackPayload]);
        if (err2) {
          console.error('[AgentTaskRepo] 2차 폴백 upsert 최종 실패:', err2.message);
        } else {
          console.log('[AgentTaskRepo] 2차 폴백 upsert 성공:', toSave.task_title);
        }
      } else {
        console.log('[AgentTaskRepo] Supabase DB 저장 성공:', toSave.task_title);
      }
    }

    // 로컬 메모리 캐시 및 localStorage 업데이트
    const idx = this.cache.findIndex((t) => t.id === toSave.id);
    if (idx >= 0) {
      this.cache[idx] = toSave;
    } else {
      this.cache.unshift(toSave);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    this.notifySubscribers(this.cache);
    return toSave;
  }

  async deleteTask(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('agent_tasks').delete().eq('id', id);
        if (error) {
          console.error('[AgentTaskRepo] Supabase 삭제 오류:', error.message);
        }
      } catch (e) {
        console.error('[AgentTaskRepo] deleteTask 예외:', e);
      }
    }

    this.cache = this.cache.filter((t) => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    this.notifySubscribers(this.cache);
    return true;
  }

  async reassignTask(taskId: string, newAgentName: string, operatorAgentName?: string): Promise<boolean> {
    const target = this.cache.find((t) => t.id === taskId);
    if (!target) return false;

    const fromAgent = operatorAgentName || target.agent_name;
    const historyEntry = {
      from_agent: fromAgent,
      to_agent: newAgentName,
      transferred_at: new Date().toISOString(),
    };

    const existingHistory = target.history || [];
    const updated = {
      ...target,
      agent_name: newAgentName,
      history: [...existingHistory, historyEntry],
    };

    await this.saveTask(updated);
    return true;
  }

  async reassignTasksByConsultationId(consultationId: string, newAgentName: string, operatorAgentName?: string): Promise<boolean> {
    if (!consultationId) return false;
    const matchingTasks = this.cache.filter((t) => t.consultation_id === consultationId);

    for (const t of matchingTasks) {
      await this.reassignTask(t.id, newAgentName, operatorAgentName);
    }
    return true;
  }

  subscribeRealtime(callback: (tasks: AgentTask[]) => void): () => void {
    this.subscribers.push(callback);

    let channel: any = null;
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel('public:agent_tasks_sync_repo')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, () => {
          this.getAllTasks().then((latest) => callback(latest));
        })
        .subscribe();
    }

    // 구독 취소 함수 반환
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }
}

// 싱글톤 리포지토리 인스턴스 내보내기
export const agentTaskRepository = new AgentTaskRepositoryImpl();

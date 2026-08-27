/**
 * ZMS CS Helper - TODO 업무(AgentTask) 전용 커스텀 Sub-Hook (useAgentTaskState)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/hooks/subhooks/useAgentTaskState.ts
 * - agentTaskRepository 및 Supabase agent_tasks 테이블 상태 관리
 * - CRUD (추가, 완료 토글, 삭제, 이관, 수정) 및 실시간 구독 처리
 */

import { useState, useCallback, useEffect } from 'react';
import { AgentTask } from '../../../backend/types';
import { agentTaskRepository } from '../../../backend/repositories/AgentTaskRepositoryImpl';
import { generateUUID } from '../../../lib/utils/uuid';

export function useAgentTaskState(currentAgentName: string) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);

  const fetchTasks = useCallback(async () => {
    const latestTasks = await agentTaskRepository.getAllTasks();
    setTasks(latestTasks);
  }, []);

  useEffect(() => {
    fetchTasks();
    const unsubscribe = agentTaskRepository.subscribeRealtime((latestTasks) => {
      setTasks(latestTasks);
    });
    return () => unsubscribe();
  }, [fetchTasks]);

  const handleAddTask = useCallback(async (
    input: string | {
      task_title: string;
      agent_name?: string;
      tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관';
      due_date?: string;
      reminder_datetime?: string;
      consultation_id?: string;
    },
    dueDateParam?: string
  ) => {
    let newTask: AgentTask;
    if (typeof input === 'string') {
      newTask = {
        id: generateUUID(),
        created_by: currentAgentName,
        agent_name: currentAgentName,
        task_title: input,
        tag: '개인메모',
        due_date: dueDateParam || undefined,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
    } else {
      const assignedAgent = input.agent_name || currentAgentName;
      newTask = {
        id: generateUUID(),
        consultation_id: input.consultation_id,
        created_by: currentAgentName,
        agent_name: assignedAgent,
        task_title: input.task_title,
        tag: input.tag || '개인메모',
        due_date: input.due_date || undefined,
        reminder_datetime: input.reminder_datetime || undefined,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
    }

    setTasks((prev) => [newTask, ...prev]);
    await agentTaskRepository.saveTask(newTask);
    fetchTasks();
  }, [currentAgentName, fetchTasks]);

  const handleToggleTask = useCallback(async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updated = { ...target, is_completed: !target.is_completed };
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updated : t))
    );

    await agentTaskRepository.saveTask(updated);
    fetchTasks();
  }, [tasks, fetchTasks]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await agentTaskRepository.deleteTask(taskId);
    fetchTasks();
  }, [fetchTasks]);

  const handleReassignTask = useCallback(async (taskId: string, newAgentName: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    if (target.agent_name === newAgentName) {
      alert(`[이관 불가] "${newAgentName}" 상담사는 이미 본 업무의 현재 담당자입니다.\n본인에서 본인으로의 동일 상담사 이관은 저장되지 않습니다.`);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, agent_name: newAgentName } : t))
    );
    await agentTaskRepository.reassignTask(taskId, newAgentName, currentAgentName);
    fetchTasks();
  }, [tasks, currentAgentName, fetchTasks]);

  const handleEditTask = useCallback(async (
    taskId: string,
    input: {
      task_title: string;
      agent_name?: string;
      tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관';
      due_date?: string;
      reminder_datetime?: string;
    }
  ) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updated: AgentTask = {
      ...target,
      task_title: input.task_title,
      agent_name: input.agent_name || target.agent_name,
      tag: input.tag || target.tag,
      due_date: input.due_date !== undefined ? input.due_date : target.due_date,
      reminder_datetime: input.reminder_datetime !== undefined ? input.reminder_datetime : target.reminder_datetime,
    };

    if (input.agent_name && input.agent_name !== target.agent_name) {
      const historyEntry = {
        from_agent: currentAgentName || target.agent_name,
        to_agent: input.agent_name,
        transferred_at: new Date().toISOString(),
      };
      updated.history = [...(target.history || []), historyEntry];
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updated : t))
    );

    await agentTaskRepository.saveTask(updated);
    fetchTasks();
  }, [tasks, currentAgentName, fetchTasks]);

  return {
    tasks,
    setTasks,
    fetchTasks,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
    handleReassignTask,
    handleEditTask,
  };
}

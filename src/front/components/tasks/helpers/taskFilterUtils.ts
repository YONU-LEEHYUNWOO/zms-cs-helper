/**
 * ZMS CS Helper - TODO 관제 메인 필터링 및 통계 유틸리티 (taskFilterUtils)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/tasks/helpers/taskFilterUtils.ts
 * - TaskManagementView의 상단 4개 현황판 카드 (내 담당 / 전달건 / 오늘 마감 및 지연 / 사내 전체 미처리)
 *   및 탭, 태그, 상담사 선택기, 라이브 검색어의 교차 필터링 조건 전담
 */

import { AgentTask } from '../../../../backend/types';

export type TaskTabFilterMode = 'my' | 'sent' | 'today' | 'all' | 'completed';

export interface TaskFilterOptions {
  activeTabFilter: TaskTabFilterMode;
  selectedAgentFilter: string;
  selectedTagFilter: string;
  searchQuery: string;
  currentAgentName: string;
}

export interface TaskStatsSummary {
  myPendingCount: number;
  sentPendingCount: number;
  dueTodayOrOverdueCount: number;
  allPendingCount: number;
  completedCount: number;
}

/**
 * 전 사내 AgentTasks 목록으로부터 5대 핵심 통계 수치 계산
 */
export function calculateTaskStats(tasks: AgentTask[], currentAgentName: string): TaskStatsSummary {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. 내 담당 미완료 TODO
  const myPendingCount = tasks.filter(
    (t) => t.agent_name === currentAgentName && !t.is_completed
  ).length;

  // 2. 내가 타 상담사에 전달한 건 (최초 작성자 또는 첫 이관자가 본인이고, 현재 담당자가 타 상담사인 미완료건)
  const sentPendingCount = tasks.filter((t) => {
    if (t.is_completed) return false;
    const isInitialCreator = t.created_by === currentAgentName;
    const isTransferredFromMe = t.history && t.history.length > 0 && t.history[0].from_agent === currentAgentName;
    const isAssignedToOther = t.agent_name !== currentAgentName;
    return (isInitialCreator || isTransferredFromMe) && isAssignedToOther;
  }).length;

  // 3. 오늘 마감 / 알림 예정 / 미완료 지연(Overdue) 항목
  const dueTodayOrOverdueCount = tasks.filter((t) => {
    if (t.is_completed) return false;
    const dueDateStr = t.due_date ? t.due_date.slice(0, 10) : '';
    const reminderDateStr = t.reminder_datetime ? t.reminder_datetime.slice(0, 10) : '';

    const isDueToday = dueDateStr === todayStr;
    const isReminderToday = reminderDateStr === todayStr;
    const isOverdue = dueDateStr !== '' && dueDateStr < todayStr;

    return isDueToday || isReminderToday || isOverdue;
  }).length;

  // 4. 사내 전체 상담사 미처리 TODO
  const allPendingCount = tasks.filter((t) => !t.is_completed).length;

  // 5. 완료된 전체 항목
  const completedCount = tasks.filter((t) => t.is_completed).length;

  return {
    myPendingCount,
    sentPendingCount,
    dueTodayOrOverdueCount,
    allPendingCount,
    completedCount,
  };
}

/**
 * 탭, 드롭다운, 태그, 검색어를 종합 반영한 최종 TODO 목록 필터링
 */
export function filterTasks(tasks: AgentTask[], options: TaskFilterOptions): AgentTask[] {
  const { activeTabFilter, selectedAgentFilter, selectedTagFilter, searchQuery, currentAgentName } = options;
  const todayStr = new Date().toISOString().slice(0, 10);
  const q = searchQuery.trim().toLowerCase();

  return tasks.filter((t) => {
    // 1. 탭 (Card / Tab) 필터링
    if (activeTabFilter === 'my') {
      const targetAgent = selectedAgentFilter || currentAgentName;
      if (t.agent_name !== targetAgent || t.is_completed) return false;
    } else if (activeTabFilter === 'sent') {
      const creatorAgent = selectedAgentFilter || currentAgentName;
      if (t.is_completed) return false;
      const isCreator = t.created_by === creatorAgent;
      const isHistoryFrom = t.history && t.history.length > 0 && t.history[0].from_agent === creatorAgent;
      const isOtherAgent = t.agent_name !== creatorAgent;
      if (!(isCreator || isHistoryFrom) || !isOtherAgent) return false;
    } else if (activeTabFilter === 'today') {
      if (t.is_completed) return false;
      const dueDateStr = t.due_date ? t.due_date.slice(0, 10) : '';
      const reminderDateStr = t.reminder_datetime ? t.reminder_datetime.slice(0, 10) : '';
      const isDueToday = dueDateStr === todayStr;
      const isReminderToday = reminderDateStr === todayStr;
      const isOverdue = dueDateStr !== '' && dueDateStr < todayStr;

      if (!isDueToday && !isReminderToday && !isOverdue) return false;
      if (selectedAgentFilter && t.agent_name !== selectedAgentFilter && t.created_by !== selectedAgentFilter) {
        return false;
      }
    } else if (activeTabFilter === 'completed') {
      if (!t.is_completed) return false;
      if (selectedAgentFilter && t.agent_name !== selectedAgentFilter && t.created_by !== selectedAgentFilter) {
        return false;
      }
    } else if (activeTabFilter === 'all') {
      // 사내 전체 미처리 TODO
      if (t.is_completed) return false;
      if (selectedAgentFilter && t.agent_name !== selectedAgentFilter && t.created_by !== selectedAgentFilter) {
        return false;
      }
    }

    // 2. 태그 필터링
    if (selectedTagFilter && t.tag !== selectedTagFilter) {
      return false;
    }

    // 3. 라이브 검색어 필터링
    if (q) {
      const matchTitle = t.task_title.toLowerCase().includes(q);
      const matchAgent = t.agent_name.toLowerCase().includes(q);
      const matchCreator = (t.created_by || '').toLowerCase().includes(q);
      if (!matchTitle && !matchAgent && !matchCreator) return false;
    }

    return true;
  });
}

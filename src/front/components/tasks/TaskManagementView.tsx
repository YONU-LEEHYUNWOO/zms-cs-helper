/**
 * ZMS CS Helper - 독립 업무(Task) & TODO 리마인더 메인 관제 컴포넌트 (TaskManagementView)
 * 
 * [역할 및 아키텍처 위치]
 * - 사이드바 `📋 업무 & TODO 관제` 메뉴 독립 전용 메인 컴포넌트
 * - 하위 모듈 조립: TaskStatusCards, TaskFilterToolbar, TaskItemRow, taskFilterUtils
 * - 단일 파일 500줄 제한(Rule 2) 준수: 모듈화 적용 (~130줄)
 */

import React, { useState, useMemo } from 'react';
import { CheckSquare, PlusCircle } from 'lucide-react';
import { AgentTask, Consultation, InternalAgent } from '../../../backend/types';
import { TaskCreateModal } from '../workspace/TaskCreateModal';
import {
  calculateTaskStats,
  filterTasks,
  TaskTabFilterMode,
} from './helpers/taskFilterUtils';
import { TaskStatusCards } from './components/TaskStatusCards';
import { TaskFilterToolbar } from './components/TaskFilterToolbar';
import { TaskItemRow } from './components/TaskItemRow';

import { TaskHistoryModal } from './components/TaskHistoryModal';

interface TaskManagementViewProps {
  tasks: AgentTask[];
  agents: InternalAgent[];
  consultations: Consultation[];
  currentAgentName: string;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onReassignTask?: (taskId: string, newAgentName: string) => void;
  onAddTask: (input: {
    task_title: string;
    agent_name?: string;
    tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관';
    due_date?: string;
    reminder_datetime?: string;
    consultation_id?: string;
  }) => void;
  onEditTask?: (
    taskId: string,
    input: {
      task_title: string;
      agent_name?: string;
      tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관';
      due_date?: string;
      reminder_datetime?: string;
    }
  ) => void;
  onSelectConsultation?: (consId: string) => void;
  onNavigateToWorkspace?: () => void;
}

export const TaskManagementView: React.FC<TaskManagementViewProps> = ({
  tasks,
  agents,
  consultations,
  currentAgentName,
  onToggleTask,
  onDeleteTask,
  onReassignTask,
  onAddTask,
  onEditTask,
  onSelectConsultation,
  onNavigateToWorkspace,
}) => {
  const [activeTabFilter, setActiveTabFilter] = useState<TaskTabFilterMode>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<AgentTask | null>(null);
  const [taskForHistory, setTaskForHistory] = useState<AgentTask | null>(null);

  // 1. 통계 요약 수치 계산
  const stats = useMemo(() => calculateTaskStats(tasks, currentAgentName), [tasks, currentAgentName]);

  // 2. 필터링된 최종 업무 목록 계산
  const filteredTasks = useMemo(
    () =>
      filterTasks(tasks, {
        activeTabFilter,
        selectedAgentFilter,
        selectedTagFilter,
        searchQuery,
        currentAgentName,
      }),
    [tasks, activeTabFilter, selectedAgentFilter, selectedTagFilter, searchQuery, currentAgentName]
  );

  const handleGoToConsultation = (consId: string) => {
    if (onSelectConsultation) onSelectConsultation(consId);
    if (onNavigateToWorkspace) onNavigateToWorkspace();
  };

  const handleSelectCard = (mode: TaskTabFilterMode) => {
    setActiveTabFilter(mode);
    if (mode === 'my' || mode === 'sent') {
      setSelectedAgentFilter(currentAgentName);
    } else if (mode === 'all') {
      setSelectedAgentFilter('');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-black tracking-tight">📋 업무 & TODO 관제 센터</h2>
            <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              실시간 다방향 동기화 중
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            전 사내 상담원의 후속 조치 리마인더, 업무 이관 내역 및 개인 메모를 100% 실시간 공유 관제합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTaskToEdit(null);
            setShowCreateModal(true);
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>➕ 신규 TODO / 업무 이관 등록</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <TaskStatusCards
        stats={stats}
        activeTabFilter={activeTabFilter}
        currentAgentName={currentAgentName}
        onSelectCard={handleSelectCard}
      />

      {/* 3. Filter & Control Toolbar */}
      <TaskFilterToolbar
        activeTabFilter={activeTabFilter}
        selectedTagFilter={selectedTagFilter}
        selectedAgentFilter={selectedAgentFilter}
        searchQuery={searchQuery}
        currentAgentName={currentAgentName}
        agents={agents}
        stats={stats}
        onSelectTab={setActiveTabFilter}
        onChangeTagFilter={setSelectedTagFilter}
        onChangeAgentFilter={setSelectedAgentFilter}
        onChangeSearchQuery={setSearchQuery}
      />

      {/* 4. Task / TODO List Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-800">
          <span>조회된 TODO / 업무 목록 ({filteredTasks.length}건)</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold">등록되었거나 조회된 TODO 항목이 없습니다.</p>
              <p className="text-[11px]">우측 상단의 [➕ 신규 업무/TODO 등록] 버튼을 눌러 새 업무를 등록하세요.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskItemRow
                key={task.id}
                task={task}
                consultations={consultations}
                agents={agents}
                currentAgentName={currentAgentName}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                onReassignTask={onReassignTask}
                onEditTaskClick={(t) => {
                  setTaskToEdit(t);
                  setShowCreateModal(true);
                }}
                onGoToConsultation={handleGoToConsultation}
                onViewHistory={(t) => setTaskForHistory(t)}
              />
            ))
          )}
        </div>
      </div>

      {/* 5. Create / Edit Task Modal */}
      {showCreateModal && (
        <TaskCreateModal
          isOpen={showCreateModal}
          agents={agents}
          currentAgentName={currentAgentName}
          taskToEdit={taskToEdit}
          onClose={() => {
            setShowCreateModal(false);
            setTaskToEdit(null);
          }}
          onAddTask={onAddTask}
          onEditTask={onEditTask}
        />
      )}

      {/* 6. View Task Transfer History Modal */}
      {taskForHistory && (
        <TaskHistoryModal
          task={taskForHistory}
          onClose={() => setTaskForHistory(null)}
        />
      )}
    </div>
  );
};

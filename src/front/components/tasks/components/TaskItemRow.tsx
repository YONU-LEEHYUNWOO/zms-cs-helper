/**
 * ZMS CS Helper - 개별 TODO 항목 행 컴포넌트 (TaskItemRow)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/tasks/components/TaskItemRow.tsx
 * - 개별 AgentTask 렌더링, 완료 체크박스, 이관 경로 배지 (`최초 작성: X ➔ 현재 담당: Y`),
 *   전달 히스토리 상세 보기 모달 팝업 연결, 수정/이관/삭제 및 연관 상담실 1클릭 이동 버튼
 */

import React from 'react';
import {
  Clock,
  ExternalLink,
  Trash2,
  Edit2,
  BellRing,
  User,
  Send,
  History,
} from 'lucide-react';
import { AgentTask, Consultation, InternalAgent } from '../../../../backend/types';
import { formatDisplayDateTime } from '../../../../lib/utils/dateUtils';

interface TaskItemRowProps {
  task: AgentTask;
  consultations: Consultation[];
  agents: InternalAgent[];
  currentAgentName: string;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onReassignTask?: (taskId: string, newAgentName: string) => void;
  onEditTaskClick: (task: AgentTask) => void;
  onGoToConsultation: (consId: string) => void;
  onViewHistory?: (task: AgentTask) => void;
}

export const TaskItemRow: React.FC<TaskItemRowProps> = ({
  task,
  consultations,
  agents,
  currentAgentName,
  onToggleTask,
  onDeleteTask,
  onReassignTask,
  onEditTaskClick,
  onGoToConsultation,
  onViewHistory,
}) => {
  const matchedCons = consultations.find((c) => c.id === task.consultation_id);

  // 이관 경로 계산 (최초 작성자 ➔ 최종 담당자)
  const initialCreator = task.created_by || (task.history && task.history.length > 0 ? task.history[0].from_agent : task.agent_name);
  const isTransferred = initialCreator !== task.agent_name || (task.history && task.history.length > 0);

  const getTagBadgeStyle = (tag?: string) => {
    switch (tag) {
      case '업무이관':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case '개인메모':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200 font-bold';
      case '리마인더':
        return 'bg-purple-100 text-purple-900 border-purple-200 font-bold';
      case '고객조치요망':
        return 'bg-blue-100 text-blue-900 border-blue-200 font-bold';
      case '결제환불확인':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 font-bold';
    }
  };

  return (
    <div
      className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs ${
        task.is_completed ? 'bg-slate-50/50 opacity-75' : ''
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={task.is_completed}
          onChange={() => {
            const targetStatusText = task.is_completed ? '미완료' : '완료';
            if (
              window.confirm(
                `이 TODO 항목("${task.task_title}")을 [${targetStatusText}] 처리 단계로 변경하시겠습니까?`
              )
            ) {
              onToggleTask(task.id);
            }
          }}
          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
        />

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 태그 배지 */}
            {task.tag && (
              <span className={`px-2 py-0.5 rounded text-[10px] border shadow-3xs ${getTagBadgeStyle(task.tag)}`}>
                {task.tag === '개인메모' && '⏰ '}
                {task.tag === '리마인더' && '🔔 '}
                {task.tag === '고객조치요망' && '📞 '}
                {task.tag === '결제환불확인' && '💳 '}
                {task.tag === '업무이관' && '📌 '}
                {task.tag}
              </span>
            )}

            {/* 이관 경로 배지 (클릭 시 상세 전달 히스토리 모달 오픈) */}
            {isTransferred ? (
              <button
                type="button"
                onClick={() => onViewHistory && onViewHistory(task)}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 shadow-3xs transition-colors cursor-pointer"
                title="클릭하여 상세 전달/이관 연쇄 히스토리 타임라인 보기"
              >
                <Send className="w-3 h-3 text-amber-600 shrink-0" />
                <span>
                  작성: {initialCreator} ➔ 담당: <strong className="text-amber-800">{task.agent_name}</strong>
                </span>
                <History className="w-3 h-3 text-amber-700 ml-0.5" />
              </button>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                <span>담당: {task.agent_name}</span>
              </span>
            )}

            {/* 마감 일시 배지 */}
            {task.due_date && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>마감: {formatDisplayDateTime(task.due_date)}</span>
              </span>
            )}

            {/* 알림 시각 배지 */}
            {task.reminder_datetime && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-200 flex items-center gap-1">
                <BellRing className="w-3 h-3 text-purple-500" />
                <span>알림: {formatDisplayDateTime(task.reminder_datetime)}</span>
              </span>
            )}

            {/* 연관 상담실 연결 배지 */}
            {matchedCons && (
              <button
                type="button"
                onClick={() => onGoToConsultation(matchedCons.id)}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3 h-3 text-blue-500" />
                <span>연관 상담: {matchedCons.car_number || matchedCons.phone_number || '고객'}</span>
              </button>
            )}
          </div>

          <p className={`font-bold ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.task_title}
          </p>
        </div>
      </div>

      {/* 우측 조치 버튼 그룹 */}
      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
        {/* 전달/이관 히스토리 보기 버튼 */}
        {onViewHistory && (
          <button
            type="button"
            onClick={() => onViewHistory(task)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-200/80 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-3xs active:scale-95"
            title="전달 및 담당자 이관 히스토리 보기"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>히스토리</span>
          </button>
        )}

        {/* 담당자 이관 드롭다운 */}
        {onReassignTask && !task.is_completed && (
          <select
            value={task.agent_name}
            onChange={(e) => {
              const newAgent = e.target.value;
              if (newAgent === task.agent_name) {
                alert(`[이관 불가] "${task.agent_name}" 상담사는 현재 본 업무의 담당자입니다.\n본인에서 본인으로의 동일 상담사 이관은 저장되지 않으므로 타 상담사를 선택해 주세요.`);
                return;
              }
              if (
                window.confirm(
                  `이 업무("${task.task_title}") 담당자를 [${task.agent_name}] ➔ [${newAgent}] (으)로 변경하시겠습니까?`
                )
              ) {
                onReassignTask(task.id, newAgent);
              }
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-white"
          >
            {agents.map((ag) => (
              <option key={ag.id} value={ag.agent_name}>
                {ag.agent_name === task.agent_name ? `👤 ${ag.agent_name} (현재)` : `➔ ${ag.agent_name} 이관`}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => onEditTaskClick(task)}
          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
          title="TODO 수정"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (window.confirm(`이 TODO 항목("${task.task_title}")을 삭제하시겠습니까?`)) {
              onDeleteTask(task.id);
            }
          }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="TODO 삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

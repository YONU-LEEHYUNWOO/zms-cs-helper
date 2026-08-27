/**
 * ZMS CS Helper - TODO 업무 전달 및 이관 상세 히스토리 모달 (TaskHistoryModal)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/tasks/components/TaskHistoryModal.tsx
 * - 특정 AgentTask의 연쇄 이관 타임라인(최초 작성자 ➔ 1차 전달 ➔ 2차 전달 ➔ 최종 담당자) 시각화
 * - AGENTS.md Rule 8 준수: 딤(Dim) 백드롭 클릭 시 닫기 (Backdrop Dismiss & stopPropagation)
 */

import React from 'react';
import { X, Send, History, User, Clock, BellRing, Tag } from 'lucide-react';
import { AgentTask } from '../../../../backend/types';
import { formatDisplayDateTime } from '../../../../lib/utils/dateUtils';

interface TaskHistoryModalProps {
  task: AgentTask;
  onClose: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ task, onClose }) => {
  const initialCreator = task.created_by || (task.history && task.history.length > 0 ? task.history[0].from_agent : task.agent_name);
  const historyList = task.history || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black tracking-tight">📜 업무 전달 & 이관 히스토리</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Detail Summary Box */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {task.tag && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-600" />
                {task.tag}
              </span>
            )}
            {task.due_date && (
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                마감: {formatDisplayDateTime(task.due_date)}
              </span>
            )}
            {task.reminder_datetime && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold flex items-center gap-1">
                <BellRing className="w-3 h-3 text-purple-600" />
                알림: {formatDisplayDateTime(task.reminder_datetime)}
              </span>
            )}
          </div>

          <h4 className="text-sm font-black text-slate-900 leading-snug">{task.task_title}</h4>

          <div className="pt-2 text-xs text-slate-600 flex items-center justify-between border-t border-slate-200/80">
            <span>
              ✍️ 최초 작성: <strong className="text-slate-900">{initialCreator}</strong>
            </span>
            <span>
              👤 현재 담당: <strong className="text-amber-700">{task.agent_name}</strong>
            </span>
          </div>
        </div>

        {/* Transfer Timeline List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-amber-600" />
            <span>단계별 전달 / 담당 변경 기록 ({historyList.length > 0 ? historyList.length : (initialCreator !== task.agent_name ? 1 : 0)}건)</span>
          </p>

          {historyList.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200">
              {historyList.map((h, idx) => (
                <div key={idx} className="relative flex flex-col gap-1 text-xs">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-xs">
                    {idx + 1}
                  </div>
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-700" />
                        {h.from_agent} ➔ {h.to_agent} (이관)
                      </span>
                      <span className="text-[10px] text-amber-700/80 font-normal">
                        {formatDisplayDateTime(h.transferred_at)}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-[11px] text-slate-600 bg-white/70 p-1.5 rounded border border-amber-100 mt-1">
                        💬 전달 메모: {h.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : initialCreator !== task.agent_name ? (
            <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200">
              <div className="relative flex flex-col gap-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-xs">
                  1
                </div>
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      {initialCreator} ➔ {task.agent_name} (최초 이관)
                    </span>
                    <span className="text-[10px] text-amber-700/80 font-normal">
                      {formatDisplayDateTime(task.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-xl text-slate-500 text-xs space-y-1">
              <User className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="font-bold text-slate-700">이관 이력 없이 단일 관리 중인 업무입니다.</p>
              <p className="text-[11px] text-slate-400">
                작성자({task.agent_name})가 본인의 업무로 지속 관리하고 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            확인 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

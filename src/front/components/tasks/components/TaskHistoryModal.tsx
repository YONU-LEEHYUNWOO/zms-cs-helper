/**
 * ZMS CS Helper - TODO 업무 전달 및 이관 상세 히스토리 모달 (TaskHistoryModal)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/tasks/components/TaskHistoryModal.tsx
 * - 3인(기존 배정자, 수신 담당자, 이관 조작자) 삼각 관계 한글 서술형 타임라인 카드 시각화
 * - 호박색(전달) vs 에메랄드색(가져옴) UI 색상 이원화 및 폰트 굵기/하이라이트 100% 동기화 렌더링
 * - AGENTS.md Rule 8 준수: 딤 백드롭 클릭 시 닫기 (Backdrop Dismiss & stopPropagation)
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
  
  // 💡 기존 DB의 무의미한 중복 셀프 이관(from_agent === to_agent) 데이터 자동 제외 정돈
  const historyList = (task.history || []).filter((h) => h.from_agent !== h.to_agent);

  /**
   * 💡 DB에서 로드된 노트 문자열 내의 [상담사명] 기호를 파싱하여 
   *    볼드/하이라이트 font-black 굵기를 100% 동일하게 균일 렌더링하는 헬퍼
   */
  const renderFormattedNote = (noteText: string, isTakeover: boolean) => {
    const parts = noteText.split(/(\[[^\]]+\])/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            const agentName = part.slice(1, -1);
            return (
              <strong
                key={i}
                className={`font-black ${
                  isTakeover ? 'text-emerald-800 font-black' : 'text-amber-800 font-black'
                }`}
              >
                [{agentName}]
              </strong>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black tracking-tight">📜 업무 전달 & 이관 연쇄 히스토리</h3>
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
              ✍️ 최초 작성: <strong className="text-slate-900 font-bold">{initialCreator}</strong>
            </span>
            <span>
              👤 현재 담당: <strong className="text-amber-800 font-bold">{task.agent_name}</strong>
            </span>
          </div>
        </div>

        {/* Transfer Timeline List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-amber-600" />
            <span>단계별 전달 / 담당 가져오기 서술 기록 ({historyList.length > 0 ? historyList.length : (initialCreator !== task.agent_name ? 1 : 0)}건)</span>
          </p>

          {historyList.length > 0 ? (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {historyList.map((h, idx) => {
                const isTakeover = h.transfer_type === 'takeover' || h.to_agent === h.operator_agent;

                const defaultText = isTakeover
                  ? `기존 배정자 [${h.from_agent}] 상담사의 건을 [${h.to_agent}] 상담사가 내 담당으로 가져옴`
                  : h.operator_agent && h.operator_agent !== h.from_agent
                  ? `기존 배정자 [${h.from_agent}] 상담사의 건을 [${h.operator_agent}] 상담사가 [${h.to_agent}] 상담사에게 전달함`
                  : `[${h.from_agent}] 상담사가 [${h.to_agent}] 상담사에게 업무를 직접 전달함`;

                const textToRender = h.note || defaultText;

                return (
                  <div key={idx} className="relative flex flex-col gap-1 text-xs">
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-xs ${
                        isTakeover ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div
                      className={`rounded-xl p-3.5 border space-y-1.5 shadow-3xs ${
                        isTakeover
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/80 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-xs">
                          {isTakeover ? (
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black">
                              📥 담당 가져옴
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-black">
                              📤 업무 전달
                            </span>
                          )}
                          <strong className="font-bold underline decoration-slate-300 underline-offset-2">
                            {h.from_agent}
                          </strong>{' '}
                          ➔{' '}
                          <strong className="font-bold text-indigo-900">
                            {h.to_agent}
                          </strong>
                        </span>
                        <span className="text-[10px] opacity-75 font-normal">
                          {formatDisplayDateTime(h.transferred_at)}
                        </span>
                      </div>

                      {/* 한글 서술형 상세 설명 문장 (볼드 하이라이트 균일 렌더링) */}
                      <p className="text-[11px] font-medium leading-relaxed bg-white/90 p-2 rounded-lg border border-slate-200/60 text-slate-800">
                        {renderFormattedNote(textToRender, isTakeover)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : initialCreator !== task.agent_name ? (
            <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
              <div className="relative flex flex-col gap-1 text-xs">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white shadow-xs">
                  1
                </div>
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-1 text-emerald-950">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black">
                        📥 담당 가져옴
                      </span>
                      {initialCreator} ➔ {task.agent_name}
                    </span>
                    <span className="text-[10px] opacity-75 font-normal">
                      {formatDisplayDateTime(task.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed bg-white/90 p-2 rounded-lg border border-emerald-100 text-slate-800">
                    {renderFormattedNote(
                      `기존 작성자 [${initialCreator}] 상담사의 건을 [${task.agent_name}] 상담사가 담당으로 가져옴`,
                      true
                    )}
                  </p>
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

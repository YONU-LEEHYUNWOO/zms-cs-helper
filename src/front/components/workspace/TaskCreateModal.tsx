/**
 * ZMS CS Helper - Task/TODO & 리마인더 생성/수정 모달 (TaskCreateModal)
 * 
 * [역할 및 아키텍처 위치]
 * - 사내 DB 등록 상담원(internal_agents) 계정 선택 및 다방향 업무 이관/전달 기능 제공
 * - 마감일자(due_date)와 알림일시(reminder_datetime) 완전 분리 제어 및 날짜/시간 피커 렌더링
 * - datetime-local 인풋 시/분 리셋 버그(ISO string 파싱 문제) 방지를 위한 포맷 변환 내장
 */

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, User, Tag, BellRing, PlusCircle, AlertCircle, Clock } from 'lucide-react';
import { AgentTask, InternalAgent } from '../../../backend/types';
import { formatToInputDateTime, calculateReminderTime, detectReminderOffset } from '../../../lib/utils/dateUtils';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: InternalAgent[];
  currentAgentName: string;
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
  taskToEdit?: AgentTask | null;
  activeConsultationId?: string;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  agents,
  currentAgentName,
  onAddTask,
  onEditTask,
  taskToEdit,
  activeConsultationId,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [assignedAgent, setAssignedAgent] = useState(currentAgentName);
  const [selectedTag, setSelectedTag] = useState<'개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관'>('개인메모');
  const [targetDateTime, setTargetDateTime] = useState('');
  const [reminderOption, setReminderOption] = useState<'exact' | '10m' | '30m' | '1h' | 'none'>('exact');

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTaskTitle(taskToEdit.task_title || '');
        setAssignedAgent(taskToEdit.agent_name || currentAgentName);
        setSelectedTag(taskToEdit.tag || '개인메모');
        
        const initialTarget = formatToInputDateTime(taskToEdit.due_date || taskToEdit.reminder_datetime) || formatToInputDateTime(new Date().toISOString());
        setTargetDateTime(initialTarget);
        
        const offset = detectReminderOffset(taskToEdit.due_date, taskToEdit.reminder_datetime);
        setReminderOption(offset);
      } else {
        setAssignedAgent(currentAgentName);
        setSelectedTag('개인메모');
        setTaskTitle('');
        
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1, 0, 0, 0);
        setTargetDateTime(formatToInputDateTime(defaultDate.toISOString()));
        setReminderOption('exact');
      }
    }
  }, [isOpen, taskToEdit, currentAgentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      alert('TODO 및 업무 메모 내용을 입력해 주세요.');
      return;
    }

    const calculatedReminder = calculateReminderTime(targetDateTime, reminderOption);

    const payload = {
      task_title: taskTitle.trim(),
      agent_name: assignedAgent || currentAgentName,
      tag: selectedTag,
      due_date: targetDateTime ? targetDateTime.replace('T', ' ') : undefined,
      reminder_datetime: calculatedReminder || undefined,
    };

    if (taskToEdit && onEditTask) {
      onEditTask(taskToEdit.id, payload);
    } else {
      onAddTask({
        ...payload,
        consultation_id: activeConsultationId,
      });
    }

    onClose();
  };

  const isAssigningToOther = assignedAgent !== currentAgentName;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-150 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs">
                <CheckSquare className="w-4 h-4" />
              </div>
              {taskToEdit ? '✏️ 업무(Task) & TODO 내용 수정' : '신규 업무(Task) & TODO 생성'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              사내 등록 상담사 계정으로 업무를 이관하거나, 개인 전용 메모/리마인더를 생성합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. 담당자 선택 (사내 DB 계정 internal_agents 연동) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>담당 상담사 지정 (DB 계정)</span>
              {isAssigningToOther ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-300">
                  📌 타 상담사에게 이관
                </span>
              ) : (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold border border-indigo-200">
                  👤 나 자신 (개인 메모)
                </span>
              )}
            </label>
            <select
              value={assignedAgent}
              onChange={(e) => {
                const nextAgent = e.target.value;
                setAssignedAgent(nextAgent);
                if (nextAgent !== currentAgentName && selectedTag === '개인메모') {
                  setSelectedTag('업무이관');
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value={currentAgentName}>
                👤 {currentAgentName} 상담사 (나 자신 - 개인 메모/리마인더)
              </option>
              {agents
                .filter((a) => a.agent_name !== currentAgentName)
                .map((a) => (
                  <option key={a.id} value={a.agent_name}>
                    👥 {a.agent_name} 상담사 ({a.team_name || 'CS팀'})
                  </option>
                ))}
            </select>
          </div>

          {/* 2. 업무 분류 태그 (드롭다운 선택) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>업무 분류 태그</span>
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="개인메모">⏰ 개인메모</option>
              <option value="리마인더">🔔 리마인더</option>
              <option value="고객조치요망">📞 고객조치요망</option>
              <option value="결제환불확인">💳 결제환불확인</option>
              <option value="업무이관">📌 업무이관</option>
            </select>
          </div>

          {/* 3. TODO / 업무 내용 입력 */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">TODO 및 조치 메모 내용 *</label>
            <textarea
              rows={3}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="예: 강남역 테헤란 빌딩 차단기 등록 여부 2시까지 확인 후 고객 전송"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 4. 마감 / 목표 일시 지정 피커 (Option 1) */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>⏰ 마감 / 목표 일시 지정</span>
              </label>
              <input
                type="datetime-local"
                value={targetDateTime}
                onChange={(e) => setTargetDateTime(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 5. 🔔 미리 알림 시점 1클릭 선택 (Option 1) */}
          <div className="space-y-2 bg-blue-50/60 p-4 rounded-xl border border-blue-100">
            <label className="font-bold text-blue-950 flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-blue-600" />
                <span>🔔 알림 울림 시점 1클릭 선택</span>
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'exact', label: '🔔 정각 알림', sub: '목표 시각 정각 팝업' },
                { id: '10m', label: '⏰ 10분 전', sub: '목표 10분 전 미리 팝업' },
                { id: '30m', label: '⏰ 30분 전', sub: '목표 30분 전 미리 팝업' },
                { id: '1h', label: '⏰ 1시간 전', sub: '목표 1시간 전 미리 팝업' },
                { id: 'none', label: '🔕 알림 안함', sub: '팝업 없이 목록에만 표출' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReminderOption(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    reminderOption === opt.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold ring-2 ring-blue-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className={`text-[10px] ${reminderOption === opt.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{taskToEdit ? '수정 완료' : '업무 등록 완료'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

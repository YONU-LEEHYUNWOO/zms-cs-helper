/**
 * ZMS CS Helper - 독립 업무(Task) & TODO 리마인더 메인 관제 컴포넌트 (TaskManagementView)
 * 
 * [역할 및 아키텍처 위치]
 * - 사이드바 `📋 업무 & TODO 관제` 메뉴 독립 전용 화면
 * - DB 등록 상담원 간 다방향 업무 이관/전달건 및 개인 전용 메모/리마인더 통합 관제
 * - 체크리스트, 태그 필터, 마감일시 알림 및 연관 상담실 1클릭 이동 연동
 */

import React, { useState } from 'react';
import {
  CheckSquare,
  PlusCircle,
  Search,
  Filter,
  User,
  Tag,
  Clock,
  ExternalLink,
  Trash2,
  Edit2,
  BellRing,
  AlertCircle,
  Send,
  UserCheck,
} from 'lucide-react';
import { AgentTask, Consultation, InternalAgent } from '../../../backend/types';
import { TaskCreateModal } from '../workspace/TaskCreateModal';
import { formatDisplayDate, formatDisplayDateTime } from '../../../lib/utils/dateUtils';

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
  const [activeTabFilter, setActiveTabFilter] = useState<'my' | 'sent' | 'today' | 'all' | 'completed'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<AgentTask | null>(null);

  // 1. 탭 필터링
  const tabFilteredTasks = tasks.filter((t) => {
    if (activeTabFilter === 'my') {
      const targetAgent = selectedAgentFilter || currentAgentName;
      return t.agent_name === targetAgent && !t.is_completed;
    }
    if (activeTabFilter === 'sent') {
      const targetAgent = selectedAgentFilter || currentAgentName;
      return t.created_by === targetAgent && t.agent_name !== targetAgent && !t.is_completed;
    }
    if (activeTabFilter === 'today') {
      if (t.is_completed || !t.due_date) return false;
      const todayStr = new Date().toISOString().slice(0, 10);
      const isMatchAgent = selectedAgentFilter
        ? (t.agent_name === selectedAgentFilter || t.created_by === selectedAgentFilter)
        : true;
      return t.due_date.startsWith(todayStr) && isMatchAgent;
    }
    if (activeTabFilter === 'completed') {
      const isMatchAgent = selectedAgentFilter
        ? (t.agent_name === selectedAgentFilter || t.created_by === selectedAgentFilter)
        : true;
      return t.is_completed && isMatchAgent;
    }

    // activeTabFilter === 'all' (전체 상담사 TODO)
    const isMatchAgent = selectedAgentFilter
      ? (t.agent_name === selectedAgentFilter || t.created_by === selectedAgentFilter)
      : true;
    return !t.is_completed && isMatchAgent;
  });

  // 2. 검색어 & 태그 필터링
  const filteredTasks = tabFilteredTasks.filter((t) => {
    const matchQuery = searchQuery.trim()
      ? t.task_title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        t.agent_name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (t.created_by || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true;

    const matchTag = selectedTagFilter ? t.tag === selectedTagFilter : true;
    return matchQuery && matchTag;
  });

  // 통계 계산
  const myPendingCount = tasks.filter((t) => t.agent_name === currentAgentName && !t.is_completed).length;
  const sentPendingCount = tasks.filter((t) => t.created_by === currentAgentName && t.agent_name !== currentAgentName && !t.is_completed).length;
  const allPendingCount = tasks.filter((t) => !t.is_completed).length;
  const completedCount = tasks.filter((t) => t.is_completed).length;
  const dueTodayCount = tasks.filter((t) => {
    if (t.is_completed || !t.due_date) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return t.due_date.startsWith(todayStr);
  }).length;

  const handleGoToConsultation = (consId: string) => {
    if (onSelectConsultation) onSelectConsultation(consId);
    if (onNavigateToWorkspace) onNavigateToWorkspace();
  };

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

      {/* 2. Top Summary KPI Cards (클릭 가능한 인터랙티브 뷰 스위처) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: 내 담당 미완료 TODO */}
        <button
          type="button"
          onClick={() => {
            setActiveTabFilter('my');
            setSelectedAgentFilter(currentAgentName);
          }}
          className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            activeTabFilter === 'my'
              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
              : 'bg-white border-slate-200 shadow-2xs hover:border-blue-300 hover:bg-slate-50/80'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-slate-600">📌 내 담당 미완료 TODO</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{myPendingCount}건</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'my' ? 'bg-blue-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <UserCheck className="w-5 h-5" />
          </div>
        </button>

        {/* Card 2: 내가 타 상담사에 전달건 */}
        <button
          type="button"
          onClick={() => {
            setActiveTabFilter('sent');
            setSelectedAgentFilter(currentAgentName);
          }}
          className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            activeTabFilter === 'sent'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/30 shadow-sm'
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300 hover:bg-slate-50/80'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-slate-600">📤 내가 타 상담사에 전달건</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{sentPendingCount}건</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'sent' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-600'
          }`}>
            <Send className="w-5 h-5" />
          </div>
        </button>

        {/* Card 3: 오늘 마감/알림 예정 */}
        <button
          type="button"
          onClick={() => setActiveTabFilter('today')}
          className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            activeTabFilter === 'today'
              ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/30 shadow-sm'
              : 'bg-white border-slate-200 shadow-2xs hover:border-red-300 hover:bg-slate-50/80'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-slate-600">⏰ 오늘 마감/알림 예정</p>
            <p className="text-2xl font-black text-red-600 mt-1">{dueTodayCount}건</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'today' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 text-red-600'
          }`}>
            <BellRing className="w-5 h-5" />
          </div>
        </button>

        {/* Card 4: 사내 전체 상담사 TODO */}
        <button
          type="button"
          onClick={() => {
            setActiveTabFilter('all');
            setSelectedAgentFilter('');
          }}
          className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
            activeTabFilter === 'all'
              ? 'bg-slate-800 border-slate-900 text-white shadow-sm ring-2 ring-slate-700/30'
              : 'bg-white border-slate-200 shadow-2xs hover:border-slate-400 hover:bg-slate-50/80'
          }`}
        >
          <div>
            <p className={`text-xs font-bold ${activeTabFilter === 'all' ? 'text-slate-200' : 'text-slate-600'}`}>👥 사내 전체 상담사 TODO</p>
            <p className={`text-2xl font-black mt-1 ${activeTabFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>{allPendingCount}건</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            <Filter className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* 3. Filter & Control Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Tab Switch Segment */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveTabFilter('my');
              setSelectedAgentFilter(currentAgentName);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'my'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            👤 내 담당 TODO ({myPendingCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabFilter('sent');
              setSelectedAgentFilter(currentAgentName);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'sent'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            📤 내가 전달한 이관건 ({sentPendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTabFilter('today')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'today'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            ⏰ 오늘 마감 ({dueTodayCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabFilter('all');
              setSelectedAgentFilter('');
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            👥 전체 상담사 TODO ({allPendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTabFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            ✅ 완료 항목 ({completedCount})
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="">전체 태그 분류</option>
            <option value="개인메모">⏰ 개인메모</option>
            <option value="리마인더">🔔 리마인더</option>
            <option value="고객조치요망">📞 고객조치요망</option>
            <option value="결제환불확인">💳 결제환불확인</option>
            <option value="업무이관">📌 업무이관</option>
          </select>

          <select
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="">🌐 사내 전체 상담사 업무 보기</option>
            {currentAgentName && (
              <option value={currentAgentName}>👤 내 업무만 보기 ({currentAgentName})</option>
            )}
            {agents
              .filter((ag) => ag.agent_name !== currentAgentName)
              .map((ag) => (
                <option key={ag.id} value={ag.agent_name}>
                  👤 {ag.agent_name} 상담사
                </option>
              ))}
          </select>

          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="TODO 검색..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. Task / TODO List Cards Container */}
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
            filteredTasks.map((task) => {
              const matchedCons = consultations.find((c) => c.id === task.consultation_id);
              const isMine = task.agent_name === currentAgentName;
              const isCreatorMine = task.created_by === currentAgentName;

              return (
                <div
                  key={task.id}
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
                        if (window.confirm(`이 TODO 항목("${task.task_title}")을 [${targetStatusText}] 처리 단계로 변경하시겠습니까?`)) {
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

                        {/* 담당 상담사 계정 (실시간 담당자 이관/전달 드롭다운) */}
                        <div className="flex items-center gap-1 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200 transition-colors" title="클릭 시 담당 상담사 즉시 변경/이관">
                          <User className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-500">담당:</span>
                          <select
                            value={task.agent_name}
                            onChange={(e) => {
                              const newAgent = e.target.value;
                              if (onReassignTask) {
                                onReassignTask(task.id, newAgent);
                              }
                            }}
                            className="bg-transparent text-[10px] font-bold text-slate-900 outline-none cursor-pointer hover:text-blue-600"
                          >
                            {agents.map((ag) => (
                              <option key={ag.id} value={ag.agent_name}>
                                {ag.agent_name} 상담사 ({ag.team_name || 'CS팀'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 전달 연쇄 히스토리 타임라인 배지 */}
                        {task.history && task.history.length > 0 ? (
                          <div
                            className="flex items-center gap-1.5 bg-indigo-50/90 text-indigo-900 border border-indigo-200/90 px-2 py-0.5 rounded text-[10px] font-bold shadow-3xs"
                            title={`전달 전체 히스토리:\n${task.history.map((h, i) => `${i + 1}. ${h.from_agent} ➔ ${h.to_agent} (${h.transferred_at.replace('T', ' ').slice(0, 16)})`).join('\n')}`}
                          >
                            <span className="text-indigo-600 font-mono flex items-center gap-1">
                              🔄 전달 히스토리:
                            </span>
                            <span className="font-semibold text-slate-700">
                              {task.created_by || task.history[0]?.from_agent}
                            </span>
                            {task.history.map((h, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="text-indigo-400 font-bold">➔</span>
                                <span
                                  className={
                                    i === (task.history?.length ?? 0) - 1
                                      ? 'text-indigo-950 font-black bg-indigo-200/80 px-1 py-0.2 rounded border border-indigo-300'
                                      : 'text-indigo-800'
                                  }
                                >
                                  {h.to_agent}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          task.created_by && task.created_by !== task.agent_name && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              ✍️ 최초 작성자: {task.created_by}
                            </span>
                          )
                        )}

                        {/* 마감 날짜 배지 */}
                        {task.due_date && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            📅 마감: {formatDisplayDate(task.due_date)}
                          </span>
                        )}

                        {/* 알림 일시 배지 */}
                        {task.reminder_datetime && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                            <BellRing className="w-3 h-3 text-red-600" />
                            🔔 알림: {formatDisplayDateTime(task.reminder_datetime)}
                          </span>
                        )}
                      </div>

                      {/* TODO 본문 */}
                      <p className={`font-bold text-slate-900 text-xs leading-relaxed ${
                        task.is_completed ? 'line-through text-slate-400' : ''
                      }`}>
                        {task.task_title}
                      </p>

                      {/* 연관 상담 정보 연결 메타 */}
                      {matchedCons && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 font-mono">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                            📂 연관 상담: [{matchedCons.parking_name || '주차장 미지정'}]
                          </span>
                          {matchedCons.summary && (
                            <span className="truncate max-w-xs text-slate-400">
                              "{matchedCons.summary}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Right Area */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {task.consultation_id && (
                      <button
                        type="button"
                        onClick={() => handleGoToConsultation(task.consultation_id!)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                        title="해당 연관 상담 워크스페이스로 이동"
                      >
                        <ExternalLink className="w-3 h-3" />
                        상담실 이동
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setTaskToEdit(task);
                        setShowCreateModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="TODO 및 업무 내용 수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('이 TODO 항목을 삭제하시겠습니까?')) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="TODO 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Creation & Editing Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setTaskToEdit(null);
        }}
        agents={agents}
        currentAgentName={currentAgentName}
        onAddTask={onAddTask}
        onEditTask={onEditTask}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};

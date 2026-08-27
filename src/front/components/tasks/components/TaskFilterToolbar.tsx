/**
 * ZMS CS Helper - TODO 관제 필터 및 제어 툴바 (TaskFilterToolbar)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/tasks/components/TaskFilterToolbar.tsx
 * - 탭 스위치 버튼 그룹, 태그 분류 선택기, 상담사 선택기 및 라이브 검색 인풋 툴바
 */

import React from 'react';
import { Search } from 'lucide-react';
import { InternalAgent } from '../../../../backend/types';
import { TaskStatsSummary, TaskTabFilterMode } from '../helpers/taskFilterUtils';

interface TaskFilterToolbarProps {
  activeTabFilter: TaskTabFilterMode;
  selectedTagFilter: string;
  selectedAgentFilter: string;
  searchQuery: string;
  currentAgentName: string;
  agents: InternalAgent[];
  stats: TaskStatsSummary;
  onSelectTab: (mode: TaskTabFilterMode) => void;
  onChangeTagFilter: (tag: string) => void;
  onChangeAgentFilter: (agent: string) => void;
  onChangeSearchQuery: (query: string) => void;
}

export const TaskFilterToolbar: React.FC<TaskFilterToolbarProps> = ({
  activeTabFilter,
  selectedTagFilter,
  selectedAgentFilter,
  searchQuery,
  currentAgentName,
  agents,
  stats,
  onSelectTab,
  onChangeTagFilter,
  onChangeAgentFilter,
  onChangeSearchQuery,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      {/* 탭 스위치 세그먼트 */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => onSelectTab('my')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTabFilter === 'my'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          👤 내 담당 TODO ({stats.myPendingCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('sent')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTabFilter === 'sent'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          📤 내가 전달한 이관건 ({stats.sentPendingCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('today')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTabFilter === 'today'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          ⏰ 오늘 마감/지연 ({stats.dueTodayOrOverdueCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('all')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTabFilter === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          👥 사내 전체 미처리 ({stats.allPendingCount})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('completed')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTabFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/70'
          }`}
        >
          ✅ 완료 항목 ({stats.completedCount})
        </button>
      </div>

      {/* 필터 선택기 & 검색창 */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        <select
          value={selectedTagFilter}
          onChange={(e) => onChangeTagFilter(e.target.value)}
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
          onChange={(e) => onChangeAgentFilter(e.target.value)}
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
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="TODO 검색..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>
    </div>
  );
};

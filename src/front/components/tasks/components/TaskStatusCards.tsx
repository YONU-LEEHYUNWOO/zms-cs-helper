/**
 * ZMS CS Helper - TODO 관제 상단 4개 KPI 현황판 카드 (TaskStatusCards)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/components/tasks/components/TaskStatusCards.tsx
 * - 1. 내 담당 미완료 TODO
 * - 2. 내가 타 상담사에 전달한 건
 * - 3. 오늘 마감 / 알림 / 지연 항목
 * - 4. 사내 전체 상담사 미처리 TODO
 */

import React from 'react';
import { UserCheck, Send, BellRing, Filter } from 'lucide-react';
import { TaskStatsSummary, TaskTabFilterMode } from '../helpers/taskFilterUtils';

interface TaskStatusCardsProps {
  stats: TaskStatsSummary;
  activeTabFilter: TaskTabFilterMode;
  currentAgentName: string;
  onSelectCard: (mode: TaskTabFilterMode) => void;
}

export const TaskStatusCards: React.FC<TaskStatusCardsProps> = ({
  stats,
  activeTabFilter,
  onSelectCard,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {/* Card 1: 내 담당 미완료 TODO */}
      <button
        type="button"
        onClick={() => onSelectCard('my')}
        className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
          activeTabFilter === 'my'
            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30 shadow-sm'
            : 'bg-white border-slate-200 shadow-2xs hover:border-blue-300 hover:bg-slate-50/80'
        }`}
      >
        <div>
          <p className="text-xs font-bold text-slate-600">📌 내 담당 미완료 TODO</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.myPendingCount}건</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'my' ? 'bg-blue-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          <UserCheck className="w-5 h-5" />
        </div>
      </button>

      {/* Card 2: 내가 타 상담사에 전달건 */}
      <button
        type="button"
        onClick={() => onSelectCard('sent')}
        className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
          activeTabFilter === 'sent'
            ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/30 shadow-sm'
            : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300 hover:bg-slate-50/80'
        }`}
      >
        <div>
          <p className="text-xs font-bold text-slate-600">📤 내가 타 상담사에 전달한 건</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{stats.sentPendingCount}건</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'sent' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-600'
          }`}
        >
          <Send className="w-5 h-5" />
        </div>
      </button>

      {/* Card 3: 오늘 마감/알림/지연 항목 */}
      <button
        type="button"
        onClick={() => onSelectCard('today')}
        className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
          activeTabFilter === 'today'
            ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/30 shadow-sm'
            : 'bg-white border-slate-200 shadow-2xs hover:border-red-300 hover:bg-slate-50/80'
        }`}
      >
        <div>
          <p className="text-xs font-bold text-slate-600">⏰ 오늘 마감 / 알림 / 지연</p>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.dueTodayOrOverdueCount}건</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'today' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 text-red-600'
          }`}
        >
          <BellRing className="w-5 h-5" />
        </div>
      </button>

      {/* Card 4: 사내 전체 상담사 미처리 TODO */}
      <button
        type="button"
        onClick={() => onSelectCard('all')}
        className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer active:scale-98 ${
          activeTabFilter === 'all'
            ? 'bg-slate-800 border-slate-900 text-white shadow-sm ring-2 ring-slate-700/30'
            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-400 hover:bg-slate-50/80'
        }`}
      >
        <div>
          <p className={`text-xs font-bold ${activeTabFilter === 'all' ? 'text-slate-200' : 'text-slate-600'}`}>
            👥 사내 전체 상담사 미처리 TODO
          </p>
          <p className={`text-2xl font-black mt-1 ${activeTabFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
            {stats.allPendingCount}건
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTabFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Filter className="w-5 h-5" />
        </div>
      </button>
    </div>
  );
};

/**
 * ZMS CS Helper - 메인 상담 워크스페이스 우측 영역 (RightTaskManager)
 * 
 * [역할]
 * - 통화 녹취 오디오 CTI 검색 & Gemini AI 음성 분석 전용 시각적 카드 (테이프 시뮬레이션 제거, 버튼 부각)
 * - AI 실시간 음성 요약 & 화자 분리 대화록 뷰어
 * - 후속 조치 TODO 리스트 (콤팩트 카드 3건 노출 & 독립 관제 탭 1클릭 이동 연동)
 */

import React, { useState } from 'react';
import { 
  Volume2, Sparkles, CheckSquare, Plus, FileText, Mic, ExternalLink, 
  RefreshCw, ChevronRight, User, Tag, Clock, ArrowUpRight, BellRing
} from 'lucide-react';
import { AgentTask, Consultation, InternalAgent } from '../../../backend/types';
import { CtiAudioSummaryModal } from './CtiAudioSummaryModal';
import { TaskCreateModal } from './TaskCreateModal';
import { formatDisplayDate, formatDisplayDateTime } from '../../../lib/utils/dateUtils';

interface RightTaskManagerProps {
  activeConsultation: Consultation;
  assignedAgentName: string;
  activeTasks: AgentTask[];
  onAddTask: (input: any) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  agents?: InternalAgent[];
  onNavigateToTasksTab?: () => void;
  notes?: string;
  setNotes?: (text: string) => void;
}

export const RightTaskManager: React.FC<RightTaskManagerProps> = ({
  activeConsultation,
  assignedAgentName,
  activeTasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  agents = [],
  onNavigateToTasksTab,
  notes = '',
  setNotes,
}) => {
  const [showTaskModal, setShowTaskModal] = useState(false);

  // 🎙️ CTI 녹취 AI 음성 분석 모달 오픈 state
  const [showCtiModal, setShowCtiModal] = useState(false);
  // 최근 AI 분석 결과 텍스트 state
  const [latestAiSummary, setLatestAiSummary] = useState<string | null>(null);
  // 최근 AI 화자 분리 대화 스크립트 state
  const [latestTranscript, setLatestTranscript] = useState<string | null>(null);
  // CTI 패널 전용 2가지 탭 (음성 요약 분석 vs 스크립트 정리)
  const [activeCtiTab, setActiveCtiTab] = useState<'summary' | 'script'>('summary');
  // 업로드/URL 오디오 메타
  const [loadedAudioMeta, setLoadedAudioMeta] = useState<{ fileName: string; durationSec: number } | null>(null);

  // 상담 건 변경 시 CTI 분석 결과 초기화
  React.useEffect(() => {
    setLatestAiSummary(null);
    setLatestTranscript(null);
    setLoadedAudioMeta(null);
    setActiveCtiTab('summary');
  }, [activeConsultation?.id]);

  // AI 분석 결과 반영 핸들러
  const handleApplySummary = (summaryText: string, fullTranscript?: string, audioFileName?: string, durationSec?: number) => {
    setLatestAiSummary(summaryText);
    if (fullTranscript) setLatestTranscript(fullTranscript);
    if (audioFileName) {
      setLoadedAudioMeta({ fileName: audioFileName, durationSec: durationSec ?? 0 });
    }
  };

  // CTI 서버 웹페이지 새창 오픈
  const handleOpenCtiServer = () => {
    window.open('http://202.30.232.240/dial/call_list.jsp', '_blank', 'noopener,noreferrer');
  };

  const getTagBadgeStyle = (tag?: string) => {
    switch (tag) {
      case '업무이관':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case '개인메모':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200 font-bold';
      case '고객조치':
        return 'bg-blue-100 text-blue-900 border-blue-200 font-bold';
      case '결제확인':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
  };

  return (
    <div className="flex flex-col gap-5 font-sans">
      {/* 🎙️ 1. CTI 녹취 파일 수집 & AI 음성 분석 전용 프리미엄 버튼 카드 */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-2xl p-5 shadow-lg border border-indigo-900/60 relative overflow-hidden flex flex-col gap-4">
        {/* Subtle Background Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/40 border border-purple-400/30 flex items-center justify-center text-purple-200 shadow-2xs">
              <Mic className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white leading-tight">CTI 녹취 음성 AI 분석</h3>
              <p className="text-[10px] text-slate-400 font-medium">Gemini 1.5 Pro 1초 자동 요약</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenCtiServer}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-[10px] font-bold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
              title="CTI 녹취 검색 웹페이지 새창 열기"
            >
              <ExternalLink className="w-3 h-3 text-purple-300" />
              CTI 이동
            </button>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              latestAiSummary
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-purple-500/20 text-purple-200 border-purple-500/30'
            }`}>
              {latestAiSummary ? '✨ 요약 완료' : '⚡ 대기'}
            </span>
          </div>
        </div>

        {/* CTI AI 음성 분석 대형 프리미엄 액션 버튼 */}
        <button
          type="button"
          onClick={() => setShowCtiModal(true)}
          className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-white/20 group z-10"
        >
          <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
          <span>🎙️ CTI 녹취 파일/URL AI 음성 분석 실행</span>
          <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {loadedAudioMeta && (
          <p className="text-[10px] text-purple-200/80 font-mono truncate px-1 z-10">
            🎧 현재 수집 오디오: {loadedAudioMeta.fileName}
          </p>
        )}
      </div>

      {/* 🤖 2. CTI AI 요약 & 스크립트 뷰어 패널 */}
      <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-blue-50/90 rounded-2xl border border-indigo-200/80 p-4 shadow-2xs relative overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-white/80 rounded-xl border border-indigo-100 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveCtiTab('summary')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeCtiTab === 'summary'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              ✨ AI 요약 분석
            </button>
            <button
              type="button"
              onClick={() => setActiveCtiTab('script')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeCtiTab === 'script'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              💬 대화 스크립트
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCtiModal(true)}
            className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            다시 분석
          </button>
        </div>

        {activeCtiTab === 'summary' ? (
          <div className="min-h-[110px] flex flex-col justify-center">
            {latestAiSummary ? (
              <div className="bg-white/90 p-3.5 rounded-xl border border-purple-100 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[10px] font-bold text-purple-900 border-b border-purple-100 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    AI 핵심 통화 분석 결과
                  </span>
                  <span className="text-slate-400 font-normal">자동 수집 완료</span>
                </div>
                <div className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap max-h-36 overflow-y-auto custom-scroll pr-1">
                  {latestAiSummary}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 p-5 rounded-xl border border-indigo-100/60 text-center flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                <p className="text-xs font-bold text-indigo-950">CTI 음성 요약 분석 대기 중</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  상단의 [🎙️ CTI 녹취 파일/URL AI 음성 분석] 버튼을 눌러<br />
                  통화 오디오 URL 또는 녹취 파일을 선택해 보세요.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[110px] flex flex-col justify-center">
            {latestTranscript ? (
              <div className="bg-white/90 p-3.5 rounded-xl border border-purple-100 space-y-2 animate-in fade-in duration-200">
                <div className="text-[10px] font-bold text-purple-900 border-b border-purple-100 pb-1.5 flex items-center justify-between">
                  <span>💬 화자 분리 대화 스크립트</span>
                  <span className="text-slate-400 font-normal">상담사 ↔ 고객</span>
                </div>
                <div className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap max-h-36 overflow-y-auto custom-scroll pr-1">
                  {latestTranscript}
                </div>
              </div>
            ) : (
              <div className="bg-white/80 p-5 rounded-xl border border-indigo-100/60 text-center flex flex-col items-center justify-center gap-2">
                <FileText className="w-6 h-6 text-indigo-400" />
                <p className="text-xs font-bold text-indigo-950">대화록 스크립트 대기 중</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  음성 분석 완료 시 상담사와 고객 간의 실제 통화 내용이<br />
                  화자별(상담사 ↔ 고객) 대화 스크립트로 분리되어 정리됩니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📋 3. 후속 조치 TODO 작업 목록 콤팩트 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b pb-2.5 border-slate-100">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            후속 조치 & TODO ({activeTasks.length}건)
          </h3>
          <div className="flex items-center gap-2">
            {onNavigateToTasksTab && (
              <button
                type="button"
                onClick={onNavigateToTasksTab}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                title="전체 TODO 관제 화면으로 이동"
              >
                <span>관제 탭 전체보기</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ➕ 신규 TODO 등록 버튼 */}
        <button
          type="button"
          onClick={() => setShowTaskModal(true)}
          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>➕ 신규 TODO / 업무 이관 등록</span>
        </button>

        {/* Top 3 Active Tasks */}
        <div className="flex flex-col gap-2">
          {activeTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">등록된 후속 조치 TODO가 없습니다.</p>
          ) : (
            activeTasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors flex items-start gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={t.is_completed}
                  onChange={() => {
                    const targetStatusText = t.is_completed ? '미완료' : '완료';
                    if (window.confirm(`이 TODO 항목("${t.task_title}")을 [${targetStatusText}] 처리 단계로 변경하시겠습니까?`)) {
                      onToggleTask(t.id);
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {t.tag && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] border ${getTagBadgeStyle(t.tag)}`}>
                        {t.tag}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-600">
                      👤 {t.agent_name}
                    </span>
                    {t.due_date && (
                      <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-indigo-600" />
                        📅 {formatDisplayDateTime(t.due_date)}
                      </span>
                    )}
                    {t.reminder_datetime && (
                      <span className="text-[9px] font-mono text-red-600 bg-red-50 px-1 rounded border border-red-200 flex items-center gap-0.5">
                        <BellRing className="w-2.5 h-2.5 text-red-600" />
                        🔔 {formatDisplayDateTime(t.reminder_datetime)}
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-slate-800 text-[11px] leading-tight truncate ${
                    t.is_completed ? 'line-through text-slate-400' : ''
                  }`}>
                    {t.task_title}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        agents={agents}
        currentAgentName={assignedAgentName}
        onAddTask={onAddTask}
        activeConsultationId={activeConsultation?.id}
      />

      {/* CTI Audio Summary Modal */}
      <CtiAudioSummaryModal
        isOpen={showCtiModal}
        onClose={() => setShowCtiModal(false)}
        agentName={assignedAgentName}
        agentPhone={activeConsultation?.phone_number || "02-1544-0000"}
        agents={agents}
        onApplySummaryToNotes={handleApplySummary}
      />
    </div>
  );
};

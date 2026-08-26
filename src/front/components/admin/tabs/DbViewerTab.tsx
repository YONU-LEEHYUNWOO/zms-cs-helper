import React, { useState } from 'react';
import { FileSpreadsheet, Download, RefreshCcw, Database, Trash2, Archive, Clock } from 'lucide-react';
import { Consultation, Customer, AgentTask, InternalAgent } from '../../../../backend/types';
import { consultationRepository } from '../../../../backend/repositories/ConsultationRepositoryImpl';
import { customerRepository } from '../../../../backend/repositories/CustomerRepositoryImpl';
import { formatDateTime, getResolvedStatus, getSubStatusBadgeStyle, formatSubStatus } from '../../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../../lib/utils/normalize';

interface DbViewerTabProps {
  agents?: InternalAgent[];
  consultations: Consultation[];
  customers: Customer[];
  tasks?: AgentTask[];
  currentAgentName?: string;
  downloadConsultationsCSV: (targetAgentFilter?: string) => void;
  downloadCustomersCSV: () => void;
  downloadTasksCSV?: (targetAgentFilter?: string) => void;
  handleSanitizeDuplicates: () => void;
  onDeleteConsultation?: (consId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  setAdminToast: (msg: string | null) => void;
  initStorage: (clear: boolean) => void;
  showOlderArchive?: boolean;
  olderArchiveCount?: number;
  toggleShowOlderArchive?: () => void;
}

export const DbViewerTab: React.FC<DbViewerTabProps> = ({
  agents = [],
  consultations,
  customers,
  tasks = [],
  currentAgentName,
  downloadConsultationsCSV,
  downloadCustomersCSV,
  downloadTasksCSV,
  handleSanitizeDuplicates,
  onDeleteConsultation,
  onDeleteTask,
  setAdminToast,
  initStorage,
  showOlderArchive = false,
  olderArchiveCount = 0,
  toggleShowOlderArchive,
}) => {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>(currentAgentName || '');
  const [activeTableView, setActiveTableView] = useState<'consultations' | 'tasks' | 'all'>('consultations');

  const displayConsultations = selectedAgentFilter
    ? consultations.filter((c) => {
        const matchedAgent = agents.find(
          (a) => a.agent_name === selectedAgentFilter || a.email?.split('@')[0] === selectedAgentFilter || a.email === selectedAgentFilter || a.id === selectedAgentFilter
        );
        const filterAgentId = matchedAgent?.id;
        const filterAgentName = matchedAgent?.agent_name || selectedAgentFilter;
        const filterAgentEmailPrefix = matchedAgent?.email?.split('@')[0];

        return (
          c.agent_name === filterAgentName ||
          c.agent_name === selectedAgentFilter ||
          c.agent_name === filterAgentEmailPrefix ||
          c.agent_name === matchedAgent?.email ||
          (filterAgentId && c.agent_id === filterAgentId)
        );
      })
    : consultations;

  const displayTasks = selectedAgentFilter
    ? tasks.filter((t) => {
        const matchedAgent = agents.find(
          (a) => a.agent_name === selectedAgentFilter || a.email?.split('@')[0] === selectedAgentFilter || a.email === selectedAgentFilter || a.id === selectedAgentFilter
        );
        const filterAgentName = matchedAgent?.agent_name || selectedAgentFilter;
        const filterAgentEmailPrefix = matchedAgent?.email?.split('@')[0];

        return (
          t.agent_name === filterAgentName ||
          t.agent_name === selectedAgentFilter ||
          t.agent_name === filterAgentEmailPrefix ||
          t.created_by === filterAgentName ||
          t.created_by === selectedAgentFilter ||
          t.created_by === filterAgentEmailPrefix
        );
      })
    : tasks;

  return (
    <div className="space-y-6">
      {/* 👤 상담사 데이터 필터 바 */}
      <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Database className="w-4 h-4 text-blue-600" />
          <span>👤 관제 & CSV 추출 대상 상담사:</span>
          <select
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-slate-900 shadow-2xs"
          >
            {currentAgentName && (
              <option value={currentAgentName}>👤 내 계정 데이터만 관제/수출 ({currentAgentName})</option>
            )}
            <option value="">🌐 사내 전체 상담원 데이터 관제/수출</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.agent_name}>
                {ag.agent_name} 상담사 ({ag.team_name || 'CS팀'})
              </option>
            ))}
          </select>
        </div>
        {selectedAgentFilter ? (
          <span className="text-[11px] text-blue-700 font-bold bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200">
            📌 현재 '{selectedAgentFilter}' 계정 데이터만 아래 테이블에 표시되며 엑셀(CSV)로 추출됩니다.
          </span>
        ) : (
          <span className="text-[11px] text-slate-600 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200">
            🌐 전체 상담사의 통합 데이터가 표시됩니다.
          </span>
        )}
      </div>

      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            실시간 DB 테이블 검증 및 엑셀(CSV) 파일 수출 도구
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            데이터베이스 행/열 구조와 실제 저장된 값을 직접 엑셀로 내보내어 100% 무결성을 검증합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {toggleShowOlderArchive && (
            <button
              type="button"
              onClick={toggleShowOlderArchive}
              className={`px-3.5 py-2 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border ${
                showOlderArchive
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="완료된 지 90일 이상 지난 과거 보관건 목록/엑셀 표시 여부 토글"
            >
              <Archive className="w-4 h-4" />
              {showOlderArchive
                ? '📦 과거 보관이력 포함 중 (ON)'
                : `📦 90일+ 과거 보관이력 보기 (${olderArchiveCount}건)`}
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadConsultationsCSV(selectedAgentFilter)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            📥 상담 DB 엑셀 다운로드
          </button>

          <button
            type="button"
            onClick={downloadCustomersCSV}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            📥 고객 원장 CSV 다운로드
          </button>

          {downloadTasksCSV && (
            <button
              type="button"
              onClick={() => downloadTasksCSV(selectedAgentFilter)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              📥 업무/TODO DB 엑셀 다운로드
            </button>
          )}

          <button
            type="button"
            onClick={handleSanitizeDuplicates}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            🧹 DB 중복건 즉시 정돈
          </button>

          <button
            type="button"
            onClick={async () => {
              if (window.confirm('[DB 싹 청소 초기화]\n얽힌 캐시와 DB 폴더 데이터를 싹 삭제하고 클린 마스터 데이터로 리셋하시겠습니까?')) {
                // Wipe both Consultation and Customer tables in Supabase and local cache
                await consultationRepository.initStorage(true);
                await customerRepository.initStorage(true);
                setAdminToast('🔥 DB 캐시가 싹 지워지고 클린 5건 마스터 데이터로 리셋되었습니다.');
                setTimeout(() => {
                  setAdminToast(null);
                  window.location.reload();
                }, 1000);
              }
            }}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            🔥 DB 싹 지우기 & 클린 리셋
          </button>
        </div>
      </div>

      {/* 🎛️ DB View Switcher (뷰 스위처 바) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">📊 DB 테이블 뷰 스위처 (View Switcher):</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTableView('consultations')}
            className={`flex-1 sm:flex-none px-4 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTableView === 'consultations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📞 상담 마스터 DB ({displayConsultations.length}행)
          </button>

          <button
            type="button"
            onClick={() => setActiveTableView('tasks')}
            className={`flex-1 sm:flex-none px-4 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTableView === 'tasks'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 업무/TODO DB ({displayTasks.length}행)
          </button>

          <button
            type="button"
            onClick={() => setActiveTableView('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTableView === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📑 전체 DB 통합 보기
          </button>
        </div>
      </div>

      {/* 1. Consultations Table (상담 마스터 DB 거울) */}
      {(activeTableView === 'consultations' || activeTableView === 'all') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Consultations Table (상담 마스터 행/열 데이터 - 총 {displayConsultations.length}행)
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              컬럼 수: 14개 | 행 수: {displayConsultations.length}개
            </span>
          </div>

          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-3"># 행(Row)</th>
                  <th className="p-3 font-bold text-blue-700">상담사 계정 (ID / Name)</th>
                  <th className="p-3">차량번호 (car_number)</th>
                  <th className="p-3">연락처 (phone_number)</th>
                  <th className="p-3">상태 (status)</th>
                  <th className="p-3 font-bold text-purple-700">문의 유형 (inquiry_type)</th>
                  <th className="p-3 font-bold text-purple-700">프로세스 단계 (sub_status)</th>
                  <th className="p-3">구분 (is_archived)</th>
                  <th className="p-3 font-bold text-blue-700">상담 일자 (hope_date)</th>
                  <th className="p-3 font-bold text-slate-700">최초 접수 (created_at)</th>
                  <th className="p-3 font-bold text-slate-700">최종 저장 (updated_at)</th>
                  <th className="p-3">주차장명</th>
                  <th className="p-3 font-bold text-emerald-700">차주 번호 (user_phone)</th>
                  <th className="p-3 font-bold text-emerald-700">공유자 번호 (owner_phone)</th>
                  <th className="p-3 font-bold text-emerald-700">희망 주차 시작일 (parking_start_date)</th>
                  <th className="p-3">상담 메모 (summary)</th>
                  <th className="p-3 text-center">작업 (DB 영구삭제)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-6 text-center text-slate-400 font-semibold">
                      {selectedAgentFilter ? `'${selectedAgentFilter}' 상담사의 저장된 상담 DB 데이터가 없습니다.` : '저장된 상담 DB 데이터가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  displayConsultations.map((c, idx) => {
                    const matchedAgent = agents.find((a) => a.agent_name === c.agent_name || a.email?.split('@')[0] === c.agent_name || a.email === c.agent_name || a.id === c.agent_id);
                    const displayName = matchedAgent ? matchedAgent.agent_name : (c.agent_name || '미지정');
                    const displayEmail = matchedAgent?.email || (c.agent_name?.includes('@') ? c.agent_name : '');

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 flex flex-col leading-tight">
                            <span>👤 {displayName}</span>
                            {displayEmail && (
                              <span className="text-[10px] text-slate-500 font-mono font-normal mt-0.5">
                                ({displayEmail})
                              </span>
                            )}
                          </div>
                        </td>
                      <td className="p-3 font-mono uppercase font-bold text-slate-900">
                        {maskTempCarNumber(customers.find((cust) => cust.id === c.customer_id)?.car_number || c.car_number, '-')}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {maskTempPhoneNumber(customers.find((cust) => cust.id === c.customer_id)?.phone_number || c.phone_number, '-', true)}
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          getResolvedStatus(c) === '완료' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : getResolvedStatus(c) === '해결중' 
                              ? 'bg-amber-100 text-amber-800 border-amber-300' 
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {getResolvedStatus(c)}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-purple-700 bg-purple-50/30">
                        {c.inquiry_type || '-'}
                      </td>
                      <td className="p-3 bg-purple-50/30">
                        {c.sub_status ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${getSubStatusBadgeStyle(c.sub_status)}`}>
                            ⚡ {formatSubStatus(c.sub_status)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">null</span>
                        )}
                      </td>
                      <td className="p-3 font-bold">
                        {c.is_archived ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] border border-amber-300 font-bold">
                            📦 보관됨 (Archived)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] border border-emerald-300 font-bold">
                            🟢 활성 (Active)
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold font-mono text-blue-700 bg-blue-50/50">
                        📅 {c.hope_date || '-'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 bg-slate-50 font-semibold">
                        🕒 {formatDateTime(c.created_at)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-emerald-700 bg-emerald-50/30 font-semibold">
                        💾 {formatDateTime(c.updated_at || c.created_at)}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{c.parking_name || '-'}</td>
                      <td className="p-3 font-mono text-slate-800 bg-emerald-50/30">{maskTempPhoneNumber(c.user_phone, '-', true)}</td>
                      <td className="p-3 font-mono text-slate-800 bg-emerald-50/30">{maskTempPhoneNumber(c.owner_phone, '-', true)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-800 bg-emerald-50/50">
                        🚗 {c.parking_start_date || '-'}
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-600">{c.summary || '-'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const displayCar = maskTempCarNumber(c.car_number, '미입력');
                            if (window.confirm(`[DB 영구삭제]\n상담 ID: ${c.id}\n차량번호: ${displayCar}\n\n이 데이터 행을 DB에서 삭제하시겠습니까?`)) {
                              if (onDeleteConsultation) onDeleteConsultation(c.id);
                              setAdminToast(`🗑️ 상담건 [${c.id}]가 DB에서 영구 삭제되었습니다.`);
                              setTimeout(() => setAdminToast(null), 3000);
                            }
                          }}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg border border-red-200 text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 mx-auto"
                          title="해당 DB 행 영구 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. AgentTasks Table (업무 & TODO 마스터 DB 거울) */}
      {(activeTableView === 'tasks' || activeTableView === 'all') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              AgentTasks Table (업무 & TODO 마스터 행/열 데이터 - 총 {displayTasks.length}행)
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              컬럼 수: 9개 | 행 수: {displayTasks.length}개
            </span>
          </div>

          <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-3"># 행(Row)</th>
                <th className="p-3 font-bold text-purple-700">Task ID</th>
                <th className="p-3">연관 상담 ID (consultation_id)</th>
                <th className="p-3 font-bold text-blue-700">작성자 (created_by)</th>
                <th className="p-3 font-bold text-blue-700">담당 상담사 (agent_name)</th>
                <th className="p-3">업무 태그 (tag)</th>
                <th className="p-3 font-bold text-slate-900">TODO 내용 (task_title)</th>
                <th className="p-3 font-bold text-red-600">마감/알림 일시 (due_date)</th>
                <th className="p-3 font-bold text-emerald-700">완료 상태 (is_completed)</th>
                <th className="p-3">생성 일시 (created_at)</th>
                <th className="p-3 text-center">작업 (DB 영구삭제)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayTasks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400">
                    {selectedAgentFilter ? `'${selectedAgentFilter}' 상담사의 저장된 업무/TODO DB 데이터가 없습니다.` : '저장된 업무/TODO DB 데이터가 없습니다.'}
                  </td>
                </tr>
              ) : (
                displayTasks.map((t, idx) => {
                  const creatorAgent = agents.find((a) => a.agent_name === t.created_by || a.email?.split('@')[0] === t.created_by || a.email === t.created_by || a.id === t.created_by);
                  const assignedAgent = agents.find((a) => a.agent_name === t.agent_name || a.email?.split('@')[0] === t.agent_name || a.email === t.agent_name || a.id === t.agent_name);

                  const creatorName = creatorAgent ? creatorAgent.agent_name : (t.created_by || '미지정');
                  const creatorEmail = creatorAgent?.email || (t.created_by?.includes('@') ? t.created_by : '');

                  const assignedName = assignedAgent ? assignedAgent.agent_name : (t.agent_name || '미지정');
                  const assignedEmail = assignedAgent?.email || (t.agent_name?.includes('@') ? t.agent_name : '');

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-purple-700">{t.id}</td>
                      <td className="p-3 font-mono text-slate-500">{t.consultation_id || '-'}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 flex flex-col leading-tight">
                          <span>👤 {creatorName}</span>
                          {creatorEmail && (
                            <span className="text-[10px] text-slate-500 font-mono font-normal mt-0.5">
                              ({creatorEmail})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 bg-blue-50/40">
                        <div className="font-bold text-blue-900 flex flex-col leading-tight">
                          <span>👤 {assignedName}</span>
                          {t.history && t.history.length > 0 && (
                            <div className="text-[9px] text-indigo-700 font-mono font-bold mt-1 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              🔄 히스토리: {t.created_by || t.history[0]?.from_agent} {t.history.map(h => `➔ ${h.to_agent}`).join(' ')}
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="p-3 font-bold text-slate-700">
                      {t.tag ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                          {t.tag}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3 font-bold text-slate-900 max-w-sm truncate">{t.task_title}</td>
                    <td className="p-3 font-mono font-bold text-red-600 bg-red-50/30">{t.due_date ? t.due_date.replace('T', ' ') : '-'}</td>
                    <td className="p-3">
                      {t.is_completed ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold border border-emerald-300">
                          ✅ 완료 (TRUE)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold border border-amber-300">
                          ⏳ 진행중 (FALSE)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{formatDateTime(t.created_at || '')}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`[DB 영구삭제]\nTask ID: ${t.id}\n내용: ${t.task_title}\n\n이 TODO 행을 DB에서 영구 삭제하시겠습니까?`)) {
                            if (onDeleteTask) onDeleteTask(t.id);
                            setAdminToast(`🗑️ Task [${t.id}]가 DB에서 영구 삭제되었습니다.`);
                            setTimeout(() => setAdminToast(null), 3000);
                          }
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg border border-red-200 text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 mx-auto"
                        title="해당 Task DB 행 영구 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </button>
                      </td>
                    </tr>
                  );
                })
                )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

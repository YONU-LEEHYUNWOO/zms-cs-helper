/**
 * ZMS CS Helper - 상담 & 녹취 통합 이력 관제 컴포넌트
 * 
 * [주의] 기존 디자인 100% 유지
 */

import React, { useState } from 'react';
import { Search, Archive, FileText } from 'lucide-react';
import { Consultation, CallLog, InternalAgent } from '../../../backend/types';
import { getSubStatusBadgeStyle, getResolvedStatus, formatDateTime, formatSubStatus } from '../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../lib/utils/normalize';

interface LogsArchiveViewProps {
  consultations: Consultation[];
  callLogs: CallLog[];
  agents?: InternalAgent[];
  currentAgentName?: string;
  showOlderArchive?: boolean;
  olderArchiveCount?: number;
  toggleShowOlderArchive?: () => void;
}

export const LogsArchiveView: React.FC<LogsArchiveViewProps> = ({
  consultations,
  callLogs,
  agents = [],
  currentAgentName,
  showOlderArchive = false,
  olderArchiveCount = 0,
  toggleShowOlderArchive,
}) => {
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConsultations = consultations.filter((c) => {
    const matchAgent = filterAgent ? c.agent_name === filterAgent : true;
    const matchQuery = searchQuery.trim()
      ? (c.parking_name || '').includes(searchQuery) ||
        (c.agent_name || '').includes(searchQuery) ||
        (c.car_number || '').includes(searchQuery) ||
        (c.phone_number || '').includes(searchQuery) ||
        (c.summary || '').includes(searchQuery)
      : true;
    return matchAgent && matchQuery;
  });

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            상담 & 녹취 이력 데이터 아카이브
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            누적된 전체 상담 이력과 CTI 통화 녹취 분석 기록을 조회 및 검색합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {toggleShowOlderArchive && (
            <button
              type="button"
              onClick={toggleShowOlderArchive}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                showOlderArchive
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Archive className="w-4 h-4 text-amber-600" />
              {showOlderArchive
                ? '📦 과거 90일+ 보관이력 포함 중 (ON)'
                : `📦 90일+ 과거 보관이력 포함하기 (${olderArchiveCount}건)`}
            </button>
          )}

          <div className="flex items-center gap-2">
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer text-slate-700"
            >
              <option value="">🌐 전체 상담사 이력 보기 (디폴트)</option>
              {currentAgentName && (
                <option value={currentAgentName}>👤 내 이력만 보기 ({currentAgentName})</option>
              )}
            </select>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="통합 이력 검색 (차량/연락처/상담사)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-800">
          <span>전체 아카이브 기록 ({filteredConsultations.length}건)</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredConsultations.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">조회된 이력 기록이 없습니다.</p>
          ) : (
            filteredConsultations.map((c) => (
              <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">[{getResolvedStatus(c)}] {c.parking_name || '주차장 미지정'}</span>
                    {c.sub_status && (
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getSubStatusBadgeStyle(c.sub_status)}`}>
                        ⚡ {formatSubStatus(c.sub_status)}
                      </span>
                    )}
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold">{c.inquiry_type || '일반문의'}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg">{c.summary || '상담 요약 내용 없음'}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono pt-1 flex-wrap">
                    <span>📅 최초접수: {formatDateTime(c.created_at)}</span>
                    <span>💾 최종저장: {formatDateTime(c.updated_at || c.created_at)}</span>
                    <span>👤 고객: {maskTempPhoneNumber(c.phone_number, '미입력', true)}</span>
                    <span>🚗 차량: {maskTempCarNumber(c.car_number, '미입력')}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {(() => {
                    const matchedAgent = agents.find(a => a.agent_name === c.agent_name || a.id === c.agent_id);
                    return (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-slate-200">
                        <span>👤 담당: {c.agent_name || '미지정'}</span>
                        {matchedAgent?.extension_number && (
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-mono font-bold">
                            (내선 {matchedAgent.extension_number})
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

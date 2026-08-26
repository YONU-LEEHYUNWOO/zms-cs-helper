/**
 * ZMS CS Helper - CTI 녹취 목록 검색 및 테이블 렌더러 컴포넌트 (CtiRecordTable)
 * 
 * [역할 및 아키텍처 위치]
 * - CtiAudioSummaryModal의 좌측 영역을 담당하며, 검색 조건, 필터링 및 성공/실패 탭 분리 통화 이력을 렌더링합니다.
 */

import React from 'react';
import { Search, Loader2, Sparkles, Mic, RotateCcw } from 'lucide-react';
import { CtiCallRecord } from '../../../backend/services/cti/ctiCollectorService';
import { InternalAgent } from '../../../backend/types';
import { getStoredGeminiApiKey } from '../../../lib/utils/geminiApi';

interface CtiRecordTableProps {
  agents?: InternalAgent[];
  phoneInput: string;
  setPhoneInput: (val: string) => void;
  extensionInput: string;
  setExtensionInput: (val: string) => void;
  isSearchingList: boolean;
  rawHtmlText: string;
  setShowRawHtmlModal: (val: boolean) => void;
  handleSearchCallList: () => void;
  handleResetSearch: () => void;
  fetchedRecords: CtiCallRecord[];
  activeListTab: 'success' | 'failed';
  setActiveListTab: (tab: 'success' | 'failed') => void;
  setSelectedRecordIdx: (idx: string) => void;
  selectedRecordIdx: string;
  callTypeFilter: 'all' | 'in' | 'out' | 'failed_missed' | 'failed_cancel';
  setCallTypeFilter: (filter: 'all' | 'in' | 'out' | 'failed_missed' | 'failed_cancel') => void;
  extSearchKeyword: string;
  setExtSearchKeyword: (val: string) => void;
  filteredRecords: CtiCallRecord[];
  callAnalysisCache: Map<string, any>;
  isAnalyzingAudio: boolean;
  handleAnalyzeSelectedCall: (onlyMetadata: boolean) => void;
  setAudioAnalysisResult: (result: any) => void;
  setActiveResultTab: (tab: 'summary' | 'script') => void;
  setToastMessage: (msg: string | null) => void;
  ctiUserIdInput: string;
  ctiUserPwInput: string;
  ctiSessionCookieInput: string;
  setFetchedRecords: React.Dispatch<React.SetStateAction<CtiCallRecord[]>>;
  setIsAnalyzingAudio: (val: boolean) => void;
  setCallAnalysisCache: React.Dispatch<React.SetStateAction<Map<string, any>>>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isDragOver: boolean;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const CtiRecordTable: React.FC<CtiRecordTableProps> = ({
  agents = [],
  phoneInput,
  setPhoneInput,
  extensionInput,
  setExtensionInput,
  isSearchingList,
  rawHtmlText,
  setShowRawHtmlModal,
  handleSearchCallList,
  handleResetSearch,
  fetchedRecords,
  activeListTab,
  setActiveListTab,
  setSelectedRecordIdx,
  selectedRecordIdx,
  callTypeFilter,
  setCallTypeFilter,
  extSearchKeyword,
  setExtSearchKeyword,
  filteredRecords,
  callAnalysisCache,
  isAnalyzingAudio,
  handleAnalyzeSelectedCall,
  setAudioAnalysisResult,
  setActiveResultTab,
  setToastMessage,
  ctiUserIdInput,
  ctiUserPwInput,
  ctiSessionCookieInput,
  setFetchedRecords,
  setIsAnalyzingAudio,
  setCallAnalysisCache,
  selectedFile,
  setSelectedFile,
  isDragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}) => {
  return (
    <div className="w-1/2 flex flex-col divide-y divide-slate-100 overflow-y-auto custom-scroll border-r border-slate-200">
      {/* 🔍 검색 조건 입력 폼 */}
      <div className="p-5 bg-slate-50 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
              <span>고객 전화번호</span>
            </label>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="예: 010-0000-0000"
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-mono font-bold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-slate-700">상담원 내선 필터</label>
            <input
              type="text"
              value={extensionInput}
              onChange={(e) => setExtensionInput(e.target.value)}
              placeholder="예: 7997 (전체는 공란)"
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            수신/발신 전체 녹취 목록을 조회합니다.
          </span>

          <div className="flex items-center gap-1.5">
            {rawHtmlText && (
              <button
                type="button"
                onClick={() => setShowRawHtmlModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-300 font-bold text-xs rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <span>원문 보기</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetSearch}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="검색 조건 및 수집 결과를 모두 초기화합니다."
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>초기화</span>
            </button>

            <button
              type="button"
              onClick={handleSearchCallList}
              disabled={isSearchingList}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSearchingList ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>수집 중...</span></>
              ) : (
                <><Search className="w-4 h-4" /><span>조회</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 📋 파싱된 CTI 통화 목록 테이블 */}
      {fetchedRecords.length > 0 && (
        <div className="p-5 flex flex-col gap-3 bg-white">
          {/* 탭 헤더 */}
          <div className="flex border-b border-slate-200 mb-1">
            <button
              type="button"
              onClick={() => {
                setActiveListTab('success');
                const firstSuccess = fetchedRecords.find(r => !r.isFailed);
                if (firstSuccess) setSelectedRecordIdx(firstSuccess.callIdx);
              }}
              className={`flex-1 pb-2 text-sm font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeListTab === 'success'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <span>📞 성공 목록</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${activeListTab === 'success' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                }`}>
                {fetchedRecords.filter(r => !r.isFailed).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveListTab('failed');
                const firstFailed = fetchedRecords.find(r => !!r.isFailed);
                if (firstFailed) setSelectedRecordIdx(firstFailed.callIdx);
              }}
              className={`flex-1 pb-2 text-sm font-bold border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${activeListTab === 'failed'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <span>❌ 실패/부재중</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${activeListTab === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                }`}>
                {fetchedRecords.filter(r => !!r.isFailed).length}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">
              목록 ({filteredRecords.length}건)
            </span>

            <div className="flex items-center gap-1">
              <select
                value={callTypeFilter}
                onChange={(e) => setCallTypeFilter(e.target.value as any)}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50 font-semibold text-slate-700"
              >
                <option value="all">전체유형</option>
                {activeListTab === 'success' ? (
                  <>
                    <option value="in">수신만</option>
                    <option value="out">발신만</option>
                  </>
                ) : (
                  <>
                    <option value="failed_missed">📥 부재중/무응답</option>
                    <option value="failed_cancel">📤 발신 취소</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-[32vh] overflow-y-auto custom-scroll">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2 text-center w-8">선택</th>
                  <th className="p-2">내선</th>
                  <th className="p-2">고객번호</th>
                  <th className="p-2">일시</th>
                  <th className="p-2 text-center">시간</th>
                  <th className="p-2">상태/구분</th>
                  <th className="p-2 text-center w-14">AI 분석</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const isSelected = selectedRecordIdx === rec.callIdx;
                  const isCached = callAnalysisCache.has(rec.callIdx);
                  const isAnalyzingThis = isSelected && isAnalyzingAudio;
                  return (
                    <tr
                      key={rec.callIdx}
                      onClick={() => {
                        setSelectedRecordIdx(rec.callIdx);
                        const cached = callAnalysisCache.get(rec.callIdx);
                        if (cached) {
                          setAudioAnalysisResult(cached);
                          setActiveResultTab('summary');
                        } else {
                          setAudioAnalysisResult(null);
                        }
                      }}
                      className={`border-b border-slate-100 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/90 font-semibold' : 'hover:bg-slate-50'
                        }`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="radio"
                          name="selected_record"
                          checked={isSelected}
                          onChange={() => setSelectedRecordIdx(rec.callIdx)}
                          className="w-3.5 h-3.5 text-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-xs">
                        {(() => {
                          const extNum = rec.memberPhone.split('-').pop() || rec.memberPhone || '';
                          const matchedAgent = agents?.find(
                            (a) =>
                              (a.extension_number && a.extension_number === extNum) ||
                              (a.extension_number && a.extension_number === rec.memberPhone) ||
                              (a.phone_number && a.phone_number.endsWith(extNum))
                          );
                          return (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 font-mono">내선 [{extNum}]</span>
                              {matchedAgent ? (
                                <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mt-0.5 w-fit shadow-2xs">
                                  👤 {matchedAgent.agent_name} 상담사
                                </span>
                              ) : rec.userName ? (
                                <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                  👤 {rec.userName}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-2.5 font-mono text-xs text-slate-700">{rec.guestPhone}</td>
                      <td className="p-2.5 text-slate-500 font-mono text-xs">
                        {rec.callDateStr.slice(5, 16)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-xs text-slate-600">
                        {rec.durationStr}
                      </td>
                      <td className="p-2.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          rec.isFailed
                            ? /취소/i.test(rec.statusText)
                              ? 'bg-amber-50 text-amber-805 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {rec.statusText}
                        </span>
                        {rec.userName && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            👤 {rec.userName}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {isAnalyzingThis ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-md">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            분석중
                          </span>
                        ) : isCached ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecordIdx(rec.callIdx);
                              const cached = callAnalysisCache.get(rec.callIdx);
                              if (cached) {
                                setAudioAnalysisResult(cached);
                                setActiveResultTab('summary');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-md transition-all cursor-pointer"
                          >
                            <span>완료</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isAnalyzingAudio}
                            onClick={() => {
                              setSelectedRecordIdx(rec.callIdx);
                              setTimeout(() => {
                                handleAnalyzeSelectedCall(false);
                              }, 50);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                          >
                            <Mic className="w-3 h-3" />
                            분석
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📁 파일 직접 업로드 UI */}
      <div className="p-5 flex flex-col gap-3">
        <label className="text-sm font-bold text-slate-700">녹취 파일 직접 업로드 (임의 파일 분석)</label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border border-dashed rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1.5 transition-all ${isDragOver
              ? 'border-indigo-500 bg-indigo-50/40 scale-[1.01]'
              : selectedFile
                ? 'border-indigo-400 bg-indigo-50/10'
                : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50'
            }`}
        >
          <input
            type="file"
            accept=".mp3,.wav,audio/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="hidden"
            id="cti-audio-file-input"
          />
          <label
            htmlFor="cti-audio-file-input"
            className="cursor-pointer flex flex-col items-center gap-1.5"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <span>📤</span>
            </div>
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-indigo-900">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) — 변경하려면 클릭
                </span>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold text-slate-700">녹취 파일 선택 (클릭 또는 드래그)</span>
                <span className="text-[10px] text-slate-400">PC에 저장된 오디오 파일이 있는 경우 업로드하세요.</span>
              </>
            )}
          </label>
        </div>
      </div>
    </div>
  );
};

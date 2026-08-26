/**
 * ZMS CS Helper - CTI 녹취 상세 정보 및 AI 분석 제어판 (CtiDetailPanel)
 * 
 * [역할 및 아키텍처]
 * - CtiAudioSummaryModal 우측 패널 UI 담당
 * - 선택된 통화 내역 상세 필드, 오디오 파일 재생기, Gemini STT/요약 탭 전환 뷰어 렌더링
 * - PC 로컬 파일 임시 연동 정보 지원
 */

import React, { useState } from 'react';
import {
  Mic, Sparkles, Loader2, PhoneCall, Download, PlayCircle, FileText, Copy, Maximize2
} from 'lucide-react';
import { CtiCallRecord } from '../../../backend/services/cti/ctiCollectorService';
import { InternalAgent } from '../../../backend/types';
import { getSafeAudioUrl } from '../../../lib/utils/normalize';
import { CtiFullViewerModal } from './CtiFullViewerModal';

interface CtiDetailPanelProps {
  agents?: InternalAgent[];
  selectedRecord: CtiCallRecord | undefined;
  selectedFile: File | null;
  isLoadingMp3Link: boolean;
  handleOpenMp3Link: () => Promise<void>;
  audioAnalysisResult: {
    summaries: string[];
    sttScript: string;
    keyIssues: string;
    sentiment: string;
    formattedReport: string;
    filename: string;
  } | null;
  isAnalyzingAudio: boolean;
  isAnalyzing: boolean;
  handleAnalyzeSelectedCall: (onlyMetadata: boolean) => Promise<void>;
  activeResultTab: 'summary' | 'script';
  setActiveResultTab: (tab: 'summary' | 'script') => void;
  setToastMessage: (msg: string | null) => void;
}

export const CtiDetailPanel: React.FC<CtiDetailPanelProps> = ({
  agents = [],
  selectedRecord,
  selectedFile,
  isLoadingMp3Link,
  handleOpenMp3Link,
  audioAnalysisResult,
  isAnalyzingAudio,
  isAnalyzing,
  handleAnalyzeSelectedCall,
  activeResultTab,
  setActiveResultTab,
  setToastMessage
}) => {
  const [showExpandedViewerModal, setShowExpandedViewerModal] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  return (
    <div className="w-1/2 flex flex-col bg-white overflow-y-auto custom-scroll p-5 gap-4">

      {/* 🎧 선택 통화 기본 정보 & 재생기 */}
      {selectedRecord ? (
        <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-col gap-4">
          {/* 상단원 ↔ 고객 연결 정보: 시각적으로 가장 크게 강조 */}
          <div className="flex items-center justify-between gap-3">
            {/* 내선 정보 */}
            <div className="flex-1 bg-white border-2 border-indigo-200 rounded-xl p-3 flex flex-col items-center gap-1 shadow-2xs">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">상담원 내선</span>
              <span className="text-2xl font-black font-mono text-indigo-700">
                {selectedRecord.memberPhone.split('-').pop() || selectedRecord.memberPhone}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{selectedRecord.memberPhone}</span>
              {(() => {
                const extNum = selectedRecord.memberPhone.split('-').pop() || selectedRecord.memberPhone || '';
                const matchedAgent = agents?.find(
                  (a) =>
                    (a.extension_number && a.extension_number === extNum) ||
                    (a.extension_number && a.extension_number === selectedRecord.memberPhone) ||
                    (a.phone_number && a.phone_number.endsWith(extNum))
                );
                if (matchedAgent) {
                  return (
                    <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 mt-1 shadow-2xs">
                      👤 {matchedAgent.agent_name} 상담사
                    </span>
                  );
                }
                if (selectedRecord.userName) {
                  return (
                    <span className="text-xs text-slate-600 font-semibold mt-1">
                      👤 {selectedRecord.userName}
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            {/* 연결 화살표 */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-indigo-400">&#8644;</div>
              <span className="text-[10px] text-slate-400 font-bold">
                {selectedRecord.callType === 'in' ? '수신' : '발신'}
              </span>
            </div>

            {/* 고객 번호 */}
            <div className="flex-1 bg-white border-2 border-slate-200 rounded-xl p-3 flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">고객 번호</span>
              <span className="text-xl font-black font-mono text-slate-800">
                {selectedRecord.guestPhone}
              </span>
              <span className="text-[10px] text-slate-400">CS 등록 고객</span>
            </div>
          </div>

          {/* 통화 상세 정보 그리드 */}
          <div className="grid grid-cols-3 gap-2 border-t border-indigo-100 pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">일시</span>
              <span className="text-sm font-bold font-mono text-slate-800">{selectedRecord.callDateStr.slice(5, 16)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">통화시간</span>
              <span className="text-sm font-bold font-mono text-indigo-700">{selectedRecord.durationStr}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">상태</span>
              <span className={`text-sm font-bold ${selectedRecord.isFailed ? 'text-rose-600' : 'text-emerald-600'
                }`}>{selectedRecord.statusText}</span>
            </div>
          </div>

          {/* 오디오 재생 또는 안내 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              {selectedRecord.fullUrl ? (
                <audio
                  controls
                  src={getSafeAudioUrl(selectedRecord.fullUrl)}
                  className="w-full h-9 rounded-lg border border-indigo-200"
                />
              ) : (
                <div className="flex items-center p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-100 text-xs text-slate-500">
                  <span>💡 [직접 MP3 링크 열기] 또는 [분석] 시 녹취파일이 자동 동기화됩니다.</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleOpenMp3Link}
              disabled={isLoadingMp3Link}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoadingMp3Link ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>조회 중...</span></>
              ) : (
                <><Download className="w-3.5 h-3.5" /><span>MP3 링크</span></>
              )}
            </button>
          </div>
        </div>
      ) : selectedFile ? (
        <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-col gap-2">
          <span className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4 text-indigo-600" />
            <span>업로드된 로컬 파일 분석 대기</span>
          </span>
          <span className="text-xs text-slate-600 font-mono font-bold">{selectedFile.name}</span>
        </div>
      ) : (
        <div className="p-6 border border-slate-200 rounded-xl text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <PhoneCall className="w-8 h-8 text-slate-300" />
          <span>분석할 통화 내역을 선택하거나 오디오를 업로드하세요.</span>
        </div>
      )}

      {/* 🎙️ AI CS 음성 녹취 분석 제어 패널 */}
      {(selectedRecord || selectedFile) && (
        <div className="flex flex-col gap-4">
          {!audioAnalysisResult && !isAnalyzingAudio && (
            <div className="p-5 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span>Gemini 3.5 AI 음성 녹취 분석</span>
                </span>
                <span className="text-xs text-indigo-600 bg-indigo-100 font-bold px-2 py-0.5 rounded-full">
                  원클릭 일괄 분석
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                녹취 오디오를 실시간 다운로드하여 <span className="font-bold text-indigo-900">• 3~5줄 핵심 요약</span> 및 <span className="font-bold text-indigo-900">• 타임스탬프 화자 분리 대화록(STT)</span>을 생성합니다.
              </p>

              <button
                type="button"
                onClick={() => handleAnalyzeSelectedCall(false)}
                disabled={isAnalyzingAudio || isAnalyzing}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Mic className="w-4 h-4 text-amber-300" />
                <span>🎙️ AI 음성 녹취 분석 시작 (STT & 핵심 요약)</span>
              </button>
            </div>
          )}

          {/* 2. 분석 진행 중 로딩 애니메이션 카드 */}
          {isAnalyzingAudio && (
            <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-50/70 flex flex-col items-center justify-center gap-3 text-center animate-pulse shadow-xs">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-indigo-950">AI 음성 녹취 분석이 진행 중입니다...</h4>
                <p className="text-sm text-slate-500 mt-1">
                  오디오 추출 ➔ 다운로드 ➔ Gemini AI 화자 분리(STT) & 요약 처리 중
                </p>
              </div>
            </div>
          )}

          {/* 3. 분석 완료: 💡 핵심 요약 vs 💬 STT 대화록 탭 전환 뷰어 */}
          {audioAnalysisResult && (
            <div className="flex flex-col gap-3 animate-fade-in">

              {/* 탭 헤더 */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('summary')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeResultTab === 'summary'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>💡 핵심 요약</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveResultTab('script')}
                    className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeResultTab === 'script'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>💬 STT 대화록 전문</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExpandedViewerModal(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🔍 크게 보기 (팝업 뷰어)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalyzeSelectedCall(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer font-bold"
                  >
                    다시 분석
                  </button>
                </div>
              </div>

              {/* 탭 1: 핵심 요약 뷰 */}
              {activeResultTab === 'summary' && (
                <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                      <span>💡 통화 핵심 요약 (3~5줄)</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      감정: {audioAnalysisResult.sentiment || '중립'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-3 bg-slate-50/50 max-h-[42vh] overflow-y-auto custom-scroll">
                    {audioAnalysisResult.summaries.map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-sm md:text-[15px] text-slate-800 leading-relaxed font-semibold">
                        <span className="w-5.5 h-5.5 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs shrink-0 flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-sans">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 탭 2: STT 대화록 전문 뷰 */}
              {activeResultTab === 'script' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span>💬 STT 화자 분리 대본</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(audioAnalysisResult.sttScript);
                        setToastMessage('✅ STT 대화록 전문이 클립보드에 복사되었습니다.');
                      }}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>대본 복사</span>
                    </button>
                  </div>

                  {/* 대화 피드 렌더러 */}
                  <div className="p-4 max-h-[42vh] overflow-y-auto custom-scroll flex flex-col gap-2.5 bg-slate-50/40">
                    {audioAnalysisResult.sttScript.split('\n').map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) return null;
                      const isAgent = trimmed.includes('상담사') || trimmed.includes('상담원');
                      const isCustomer = trimmed.includes('고객') || trimmed.includes('고객님');
                      const timeMatch = trimmed.match(/^[\[\s]*([0-9]{1,2}:[0-9]{2})[\]\s]*/);
                      const timeStr = timeMatch ? timeMatch[1] : '';
                      const textOnly = trimmed.replace(/^[\[\s]*[0-9]{1,2}:[0-9]{2}[\]\s]*/, '').replace(/^(상담사|상담원|고객|고객님)\s*[:：]\s*/, '');

                      return (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {isAgent && (
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-bold">
                                🎧 상담사
                              </span>
                            )}
                            {isCustomer && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                                👤 고객
                              </span>
                            )}
                            {!isAgent && !isCustomer && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                                내용
                              </span>
                            )}
                            {timeStr && (
                              <span className="text-xs text-slate-400 font-mono">
                                [{timeStr}]
                              </span>
                            )}
                          </div>
                          <div className={`p-2.5 rounded-xl text-sm md:text-[15px] leading-relaxed ${isAgent
                              ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-100/80 font-medium'
                              : isCustomer
                                ? 'bg-white text-slate-900 border border-emerald-100 shadow-2xs font-semibold'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}>
                            {textOnly || trimmed}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* 🔍 AI 요약 & STT 대화록 고가독성 팝업 뷰어 모달 */}
      <CtiFullViewerModal
        isOpen={showExpandedViewerModal}
        onClose={() => setShowExpandedViewerModal(false)}
        audioAnalysisResult={audioAnalysisResult}
        selectedRecord={selectedRecord}
        activeResultTab={activeResultTab}
        setActiveResultTab={setActiveResultTab}
        setToastMessage={setToastMessage}
      />
    </div>
  );
};

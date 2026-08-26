/**
 * ZMS CS Helper - CTI AI 분석 결과 고가독성 전체 화면 팝업 뷰어 모달 (CtiFullViewerModal)
 * 
 * [역할 및 아키텍처]
 * - CTI 녹취 파일 분석 완료 시, 큰 화면에서 핵심 요약 정독 및 타임라인 키워드 검색 지원
 * - Rule 8 준수: 외부 오버레이 클릭 시 닫기 및 이벤트 버블링 차단 적용
 */

import React, { useState } from 'react';
import { Sparkles, X, Search, Copy } from 'lucide-react';
import { CtiCallRecord } from '../../../backend/services/cti/ctiCollectorService';

interface CtiFullViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioAnalysisResult: {
    summaries: string[];
    sttScript: string;
    keyIssues: string;
    sentiment: string;
    formattedReport: string;
    filename: string;
  } | null;
  selectedRecord: CtiCallRecord | undefined;
  activeResultTab: 'summary' | 'script';
  setActiveResultTab: (tab: 'summary' | 'script') => void;
  setToastMessage: (msg: string | null) => void;
}

export const CtiFullViewerModal: React.FC<CtiFullViewerModalProps> = ({
  isOpen,
  onClose,
  audioAnalysisResult,
  selectedRecord,
  activeResultTab,
  setActiveResultTab,
  setToastMessage,
}) => {
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  if (!isOpen || !audioAnalysisResult) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>🎙️ CTI AI 음성 요약 & STT 대화록 팝업 뷰어</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  감정: {audioAnalysisResult.sentiment || '중립'}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {selectedRecord ? `고객: ${selectedRecord.guestPhone} | 내선: ${selectedRecord.memberPhone} | 일시: ${selectedRecord.callDateStr}` : audioAnalysisResult.filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveResultTab('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeResultTab === 'summary' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                💡 핵심 요약
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab('script')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeResultTab === 'script' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                💬 STT 대화록
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 대화록 키워드 검색 바 (STT 탭 활성화 시) */}
        {activeResultTab === 'script' && (
          <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="대화록 키워드 라이브 검색 (예: 결제, 차단기, 환불)..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-indigo-600"
              />
              {searchKeyword && (
                <button type="button" onClick={() => setSearchKeyword('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(audioAnalysisResult.sttScript);
                setToastMessage('✅ STT 대화록 전문이 클립보드에 복사되었습니다.');
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 text-indigo-700 font-bold hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>대본 전체 복사</span>
            </button>
          </div>
        )}

        {/* 팝업 본문 (큰 폰트 & 넓은 여백 & 가독성 극대화) */}
        <div className="p-6 flex-1 overflow-y-auto custom-scroll bg-slate-50/50 space-y-4">
          {activeResultTab === 'summary' ? (
            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
              <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>AI 정밀 분석 요약 본문</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(audioAnalysisResult.formattedReport);
                    setToastMessage('✅ 핵심 요약문이 클립보드에 복사되었습니다.');
                  }}
                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-50 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>요약문 복사</span>
                </button>
              </div>

              {audioAnalysisResult.summaries.map((line, idx) => (
                <div key={idx} className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-start gap-3.5 text-base md:text-lg text-slate-800 leading-relaxed font-semibold">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs shrink-0 flex items-center justify-center mt-0.5 shadow-2xs">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-sans select-text">{line}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-4xl mx-auto">
              {audioAnalysisResult.sttScript.split('\n').map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;

                if (searchKeyword && !trimmed.toLowerCase().includes(searchKeyword.toLowerCase())) {
                  return null;
                }

                const isAgent = trimmed.includes('상담사') || trimmed.includes('상담원');
                const isCustomer = trimmed.includes('고객') || trimmed.includes('고객님');
                const timeMatch = trimmed.match(/^[\[\s]*([0-9]{1,2}:[0-9]{2})[\]\s]*/);
                const timeStr = timeMatch ? timeMatch[1] : '';
                const textOnly = trimmed.replace(/^[\[\s]*[0-9]{1,2}:[0-9]{2}[\]\s]*/, '').replace(/^(상담사|상담원|고객|고객님)\s*[:：]\s*/, '');

                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      {isAgent && (
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-bold">
                          🎧 상담사
                        </span>
                      )}
                      {isCustomer && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold">
                          👤 고객
                        </span>
                      )}
                      {!isAgent && !isCustomer && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-xs font-mono font-bold">
                          내용
                        </span>
                      )}
                      {timeStr && (
                        <span className="text-xs text-slate-400 font-mono font-bold">
                          [{timeStr}]
                        </span>
                      )}
                    </div>
                    <div className={`p-4 rounded-2xl text-base md:text-lg leading-relaxed select-text ${
                      isAgent
                        ? 'bg-indigo-50/90 text-indigo-950 border border-indigo-100 font-medium shadow-2xs'
                        : isCustomer
                          ? 'bg-white text-slate-900 border border-emerald-200 shadow-xs font-semibold'
                          : 'bg-white text-slate-800 border border-slate-200'
                    }`}>
                      {textOnly || trimmed}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span>ZMS CS Helper - AI Voice Transcription & Summary High-Readability Viewer</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

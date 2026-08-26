/**
 * ZMS CS Helper - CTI & Gemini AI 실시간 진단 로그 뷰어 모달 (CtiDiagnosticLogsModal)
 * 
 * [역할 및 아키텍처]
 * - CTI 자동 로그인, 크롤링 및 Gemini API 연동 진단 로그 트레이싱
 * - Rule 8 준수: 외부 오버레이 클릭 시 닫기 및 이벤트 버블링 차단 적용
 */

import React, { useState } from 'react';
import { Terminal, Copy, Check, X } from 'lucide-react';

interface CtiDiagnosticLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosticLogs: string[];
}

export const CtiDiagnosticLogsModal: React.FC<CtiDiagnosticLogsModalProps> = ({
  isOpen,
  onClose,
  diagnosticLogs,
}) => {
  const [isCopiedRaw, setIsCopiedRaw] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>📋 CTI 크롤링 & Gemini AI 실시간 진단 로그</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-mono">
                총 {diagnosticLogs.length}건
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(diagnosticLogs.join('\n'));
                setIsCopiedRaw(true);
                setTimeout(() => setIsCopiedRaw(false), 2000);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {isCopiedRaw ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>📋 로그 전체 복사</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 내용 */}
        <div className="p-5 flex-1 overflow-y-auto custom-scroll bg-slate-950 space-y-2 font-mono text-xs select-text">
          {diagnosticLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-6">
              수집된 진단 로그가 없습니다. CTI 검색 또는 AI 분석을 실행해 주세요.
            </p>
          ) : (
            diagnosticLogs.map((logLine, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg text-[11px] leading-relaxed select-text ${
                  logLine.includes('❌') || logLine.includes('⚠️') || logLine.includes('실패') || logLine.includes('에러')
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-900/60 font-bold'
                    : logLine.includes('✅') || logLine.includes('성공')
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-900/60 font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
              >
                {logLine}
              </div>
            ))
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Vercel Serverless /api/cti & Client Gemini API Diagnostic Trace</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

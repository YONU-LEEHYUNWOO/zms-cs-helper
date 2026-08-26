/**
 * ZMS CS Helper - CTI 서버 Raw HTML 원문 조회 모달 (CtiRawHtmlModal)
 * 
 * [역할 및 아키텍처]
 * - CTI 수집 서버 응답의 디버깅을 위한 원본 HTML 뷰어
 * - Rule 8 준수: 외부 오버레이 클릭 시 닫기 및 이벤트 버블링 차단 적용
 */

import React, { useState } from 'react';
import { Code, Copy, Check, X, AlertCircle } from 'lucide-react';

interface CtiRawHtmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawHtmlText: string;
}

export const CtiRawHtmlModal: React.FC<CtiRawHtmlModalProps> = ({
  isOpen,
  onClose,
  rawHtmlText,
}) => {
  const [isCopiedRaw, setIsCopiedRaw] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>📄 CTI 서버 수신 Raw HTML 원문 뷰어</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] font-mono">
                {rawHtmlText ? `${rawHtmlText.length} bytes` : '0 bytes'}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(rawHtmlText);
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
                  <span>📋 코드 전체 복사</span>
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
        <div className="p-5 flex-1 overflow-y-auto custom-scroll bg-slate-950 space-y-3 font-mono text-xs select-text">
          {rawHtmlText.includes('top.location.href="/index.jsp"') && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>⚠️ 세션 미승인 리다이렉트 감지:</strong> CTI 서버가 로그인되지 않은 상태이므로 세션 만료 스크립트 <code>top.location.href="/index.jsp"</code>가 반환되었습니다. CTI 계정 아이디/비밀번호를 확인해 주세요.
              </span>
            </div>
          )}

          <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed custom-scroll select-text">
            <code>{rawHtmlText || 'CTI 서버로부터 수신된 HTML 원문 데이터가 없습니다. [🔍 CTI 통화 이력 조회]를 먼저 실행해 주세요.'}</code>
          </pre>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>http://202.30.232.240/dial/call_list.jsp 직수신 원문 데이터</span>
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

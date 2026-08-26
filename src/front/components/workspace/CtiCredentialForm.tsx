/**
 * ZMS CS Helper - CTI 자격증명 및 Gemini API Key 설정 컴포넌트 (CtiCredentialForm)
 * 
 * [역할 및 아키텍처]
 * - CtiAudioSummaryModal 상단 자격증명 관리 바 및 토글 설정 패널 담당
 * - Gemini API Key 등록 및 CTI 계정 로그인 테스트 연동 지원
 */

import React, { useState } from 'react';
import { Key, Terminal, ExternalLink, User, Loader2, Sparkles } from 'lucide-react';
import { setStoredGeminiApiKey } from '../../../lib/utils/geminiApi';

interface CtiCredentialFormProps {
  apiKeyInput: string;
  setApiKeyInput: (val: string) => void;
  ctiUserIdInput: string;
  setCtiUserIdInput: (val: string) => void;
  ctiUserPwInput: string;
  setCtiUserPwInput: (val: string) => void;
  ctiSessionCookieInput: string;
  setCtiSessionCookieInput: (val: string) => void;
  agentName: string;
  isTestingLogin: boolean;
  handleTestCtiLogin: () => Promise<void>;
  handleSaveCtiSettings: () => void;
  diagnosticLogsCount: number;
  setShowDiagnosticLogsModal: (val: boolean) => void;
  handleOpenCtiServer: () => void;
  setToastMessage: (msg: string | null) => void;
}

export const CtiCredentialForm: React.FC<CtiCredentialFormProps> = ({
  apiKeyInput,
  setApiKeyInput,
  ctiUserIdInput,
  setCtiUserIdInput,
  ctiUserPwInput,
  setCtiUserPwInput,
  ctiSessionCookieInput,
  setCtiSessionCookieInput,
  agentName,
  isTestingLogin,
  handleTestCtiLogin,
  handleSaveCtiSettings,
  diagnosticLogsCount,
  setShowDiagnosticLogsModal,
  handleOpenCtiServer,
  setToastMessage,
}) => {
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [showCtiAccountConfig, setShowCtiAccountConfig] = useState<boolean>(false);

  return (
    <div className="flex flex-col shrink-0">
      {/* 📌 CTI 계정 설정 바 */}
      <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            CTI 로그인 계정: <span className="font-mono text-indigo-900">{ctiUserIdInput || 'admin'}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setShowCtiAccountConfig(!showCtiAccountConfig);
              setShowApiKeyConfig(false);
            }}
            className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
          >
            [계정 변경]
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowApiKeyConfig(!showApiKeyConfig);
              setShowCtiAccountConfig(false);
            }}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Key className="w-3 h-3 text-indigo-600" />
            <span>🔑 Gemini API Key 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDiagnosticLogsModal(true)}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Terminal className="w-3 h-3 text-indigo-600" />
            <span>📋 진단 로그 ({diagnosticLogsCount}건)</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCtiServer}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <ExternalLink className="w-3 h-3 text-indigo-600" />
            CTI 웹서버 열기
          </button>
        </div>
      </div>
      {/* 🔑 Gemini API Key 설정 & Google AI Studio 무료 발급 가이드 팝업 */}
      {showApiKeyConfig && (
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex flex-col gap-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-600" />
              🔑 내 개별 Gemini API Key (오디오 STT 분석용)
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs cursor-pointer"
            >
              <span>🌐 Google AI Studio 무료 Key 발급 받기</span>
              <ExternalLink className="w-3 h-3 text-indigo-600" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy... (내 전용 API Key 입력 시 2~3초 초고속 STT 구동)"
              className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold text-slate-800"
            />
            <button
              type="button"
              onClick={() => {
                setStoredGeminiApiKey(apiKeyInput, agentName);
                setToastMessage('✅ 내 계정 전용 Gemini API Key가 저장되었습니다.');
                setShowApiKeyConfig(false);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 🔐 CTI 계정 수정 패널 */}
      {showCtiAccountConfig && (
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-indigo-950 shrink-0">🔐 CTI 접속 계정:</span>
            <input
              type="text"
              value={ctiUserIdInput}
              onChange={(e) => setCtiUserIdInput(e.target.value)}
              placeholder="CTI 아이디"
              className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono w-24"
            />
            <input
              type="password"
              value={ctiUserPwInput}
              onChange={(e) => setCtiUserPwInput(e.target.value)}
              placeholder="CTI 비밀번호"
              className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono w-24"
            />
            <input
              type="text"
              value={ctiSessionCookieInput}
              onChange={(e) => setCtiSessionCookieInput(e.target.value)}
              placeholder="JSESSIONID=... (직접 입력 / 자동 세션 보관)"
              className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono w-56"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestCtiLogin}
              disabled={isTestingLogin}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {isTestingLogin ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>인증 검증 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                  <span>🧪 CTI 계정 로그인 테스트</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                handleSaveCtiSettings();
                setShowCtiAccountConfig(false);
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              설정 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

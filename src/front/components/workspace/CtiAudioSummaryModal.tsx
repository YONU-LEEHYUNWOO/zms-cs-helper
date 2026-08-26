/**
 * ZMS CS Helper - CTI 녹취 검색 및 원클릭 AI 음성 요약 모달 (CtiAudioSummaryModal)
 * 
 * [주요 기능 및 UX 표준]
 * - CTI 녹취 서버(http://202.30.232.240) 로그인 계정(ctiUserId / ctiUserPw) 및 내선번호 지원
 * - 고객 전화번호(customerPhone) 100% 자동 프리필(Pre-fill)
 * - 6단계 CTI 크롤링 파이프라인으로 id="table01" 10개 셀 정밀 파싱 표출
 * - 상담원 내선전화(070-7931-XXXX) 뱃지 표출 및 실시간 내선 키워드 필터링
 * - 선택된 통화건 MP3 직접 듣기 오디오 플레이어 UI 제공
 * - Rule 8 준수: 최상위 백드롭 딤 클릭 닫기 바인딩
 */

import React from 'react';
import {
  X, AlertCircle, CheckCircle2, Loader2, PhoneCall, Sparkles, Mic
} from 'lucide-react';
import { useCtiCollector } from '../../hooks/useCtiCollector';
import { CtiCredentialForm } from './CtiCredentialForm';
import { CtiRecordTable } from './CtiRecordTable';
import { CtiDetailPanel } from './CtiDetailPanel';
import { CtiRawHtmlModal } from './CtiRawHtmlModal';
import { CtiDiagnosticLogsModal } from './CtiDiagnosticLogsModal';
import { InternalAgent } from '../../../backend/types';

interface CtiAudioSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPhone?: string; // 선택 고객 전화번호 (100% 자동 프리필)
  agentName?: string;
  agentPhone?: string;
  agents?: InternalAgent[];
  onApplySummaryToNotes: (summaryText: string, fullTranscript?: string, audioFileName?: string, durationSec?: number) => void;
}

export const CtiAudioSummaryModal: React.FC<CtiAudioSummaryModalProps> = ({
  isOpen,
  onClose,
  customerPhone = '',
  agentName = '담당 상담사',
  agentPhone = '02-1544-0000',
  agents = [],
  onApplySummaryToNotes,
}) => {
  const cti = useCtiCollector({
    isOpen,
    customerPhone,
    agentName,
    onApplySummaryToNotes,
    onClose,
  });

  if (!isOpen) return null;

  return (
    // Rule 8 준수: 최상위 백드롭 딤 클릭 닫기 바인딩
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 내부 컨텐츠 클릭 시 이벤트 버블링 차단 */}
      <div
        className="w-full max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 📌 모달 헤더 */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>CTI 녹취 자동 수집 및 AI 음성 분석</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                  http://202.30.232.240
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                고객 전화번호로 통화 목록을 검색하고 상담사 내선 및 MP3 음성을 확인합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 📌 CTI 계정 설정 바 및 설정 폼 */}
        <CtiCredentialForm
          apiKeyInput={cti.apiKeyInput}
          setApiKeyInput={cti.setApiKeyInput}
          ctiUserIdInput={cti.ctiUserIdInput}
          setCtiUserIdInput={cti.setCtiUserIdInput}
          ctiUserPwInput={cti.ctiUserPwInput}
          setCtiUserPwInput={cti.setCtiUserPwInput}
          ctiSessionCookieInput={cti.ctiSessionCookieInput}
          setCtiSessionCookieInput={cti.setCtiSessionCookieInput}
          agentName={agentName}
          isTestingLogin={cti.isTestingLogin}
          handleTestCtiLogin={cti.handleTestCtiLogin}
          handleSaveCtiSettings={cti.handleSaveCtiSettings}
          diagnosticLogsCount={cti.diagnosticLogs.length}
          setShowDiagnosticLogsModal={cti.setShowDiagnosticLogsModal}
          handleOpenCtiServer={cti.handleOpenCtiServer}
          setToastMessage={cti.setToastMessage}
        />

        {/* 📢 토스트 및 시스템 에러 알림 바 */}
        {cti.toastMessage && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between gap-2 border-b animate-in fade-in duration-150 ${
            cti.toastMessage.startsWith('✅')
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : cti.toastMessage.startsWith('⚠️') || cti.toastMessage.startsWith('❌')
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
          }`}>
            <div className="flex items-center gap-2">
              {cti.toastMessage.startsWith('✅') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{cti.toastMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {cti.diagnosticLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => cti.setShowDiagnosticLogsModal(true)}
                  className="text-[11px] underline text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                >
                  [📋 진단 로그 뷰어 열기]
                </button>
              )}
              <button
                type="button"
                onClick={() => cti.setToastMessage(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 📌 모달 바디 (성공/실패 분리 및 제어 패널 단일화 2열 구조) */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50 border-t border-slate-200">
          {/* ◀ 왼쪽 열: 검색조건 및 수집된 목록 */}
          <CtiRecordTable
            agents={agents}
            phoneInput={cti.phoneInput}
            setPhoneInput={cti.setPhoneInput}
            extensionInput={cti.extensionInput}
            setExtensionInput={cti.setExtensionInput}
            isSearchingList={cti.isSearchingList}
            rawHtmlText={cti.rawHtmlText}
            setShowRawHtmlModal={cti.setShowRawHtmlModal}
            handleSearchCallList={cti.handleSearchCallList}
            fetchedRecords={cti.fetchedRecords}
            activeListTab={cti.activeListTab}
            setActiveListTab={cti.setActiveListTab}
            setSelectedRecordIdx={cti.setSelectedRecordIdx}
            selectedRecordIdx={cti.selectedRecordIdx}
            callTypeFilter={cti.callTypeFilter}
            setCallTypeFilter={cti.setCallTypeFilter}
            extSearchKeyword={cti.extSearchKeyword}
            setExtSearchKeyword={cti.setExtSearchKeyword}
            filteredRecords={cti.filteredRecords}
            callAnalysisCache={cti.callAnalysisCache}
            isAnalyzingAudio={cti.isAnalyzingAudio}
            handleAnalyzeSelectedCall={cti.handleAnalyzeSelectedCall}
            setAudioAnalysisResult={cti.setAudioAnalysisResult}
            setActiveResultTab={cti.setActiveResultTab}
            setToastMessage={cti.setToastMessage}
            ctiUserIdInput={cti.ctiUserIdInput}
            ctiUserPwInput={cti.ctiUserPwInput}
            ctiSessionCookieInput={cti.ctiSessionCookieInput}
            setFetchedRecords={cti.setFetchedRecords}
            setIsAnalyzingAudio={cti.setIsAnalyzingAudio}
            setCallAnalysisCache={cti.setCallAnalysisCache}
            selectedFile={cti.selectedFile}
            setSelectedFile={cti.setSelectedFile}
            isDragOver={cti.isDragOver}
            handleDragOver={cti.handleDragOver}
            handleDragLeave={cti.handleDragLeave}
            handleDrop={cti.handleDrop}
            handleResetSearch={cti.handleResetSearch}
          />

          {/* ▶ 오른쪽 열: 선택 통화 정보, 오디오 재생 및 AI 분석 제어판 */}
          <CtiDetailPanel
            agents={agents}
            selectedRecord={cti.selectedRecord}
            selectedFile={cti.selectedFile}
            isLoadingMp3Link={cti.isLoadingMp3Link}
            handleOpenMp3Link={cti.handleOpenMp3Link}
            audioAnalysisResult={cti.audioAnalysisResult}
            isAnalyzingAudio={cti.isAnalyzingAudio}
            isAnalyzing={cti.isAnalyzing}
            handleAnalyzeSelectedCall={cti.handleAnalyzeSelectedCall}
            activeResultTab={cti.activeResultTab}
            setActiveResultTab={cti.setActiveResultTab}
            setToastMessage={cti.setToastMessage}
          />
        </div>

        {/* 📌 하단 푸터 버튼 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500">
            {cti.fetchedRecords.length > 0 && cti.selectedRecordIdx && (
              <span className="font-bold text-indigo-900">
                선택된 통화 ID: <span className="font-mono">{cti.selectedRecordIdx}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={cti.isAnalyzing || cti.isSearchingList}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              onClick={() => {
                if (cti.audioAnalysisResult) {
                  onApplySummaryToNotes(
                    cti.audioAnalysisResult.formattedReport,
                    cti.audioAnalysisResult.sttScript,
                    cti.audioAnalysisResult.filename,
                    0
                  );
                  onClose();
                } else {
                  cti.handleAnalyzeSelectedCall(false);
                }
              }}
              disabled={cti.isAnalyzingAudio || cti.isSearchingList || (cti.fetchedRecords.length === 0 && !cti.selectedFile && !cti.phoneInput)}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {cti.isAnalyzingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Gemini AI 음성 분석 진행 중...
                </>
              ) : cti.audioAnalysisResult ? (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                  ✨ 분석 결과 워크스페이스 반영 및 닫기
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-amber-300" />
                  🎙️ AI 음성 녹취 분석 실행
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 📄 CTI 서버 수신 Raw HTML 원문 보기 모달 */}
      <CtiRawHtmlModal
        isOpen={cti.showRawHtmlModal}
        onClose={() => cti.setShowRawHtmlModal(false)}
        rawHtmlText={cti.rawHtmlText}
      />

      {/* 📋 CTI & Gemini AI 실시간 진단 로그 뷰어 모달 */}
      <CtiDiagnosticLogsModal
        isOpen={cti.showDiagnosticLogsModal}
        onClose={() => cti.setShowDiagnosticLogsModal(false)}
        diagnosticLogs={cti.diagnosticLogs}
      />
    </div>
  );
};

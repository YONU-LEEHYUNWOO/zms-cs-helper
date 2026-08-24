/**
 * ZMS CS Helper - 상담 입력 패널 (LeftInteractionPad)
 * 
 * [역할 및 아키텍처 위치]
 * - 프론트엔드 워크스페이스(Workspace)의 왼쪽 인터랙션 영역을 담당합니다.
 * - 고객 문의 유형별 동적 프로세스 스텝퍼, 주차 희망 일자 및 상담 상세 메모를 작성합니다.
 * - 메모장 바로 아래에 [🗑️ 초기화] 및 [💾 기존상담 덮어쓰기 / 새 상담내역 저장] 버튼이 가독성 좋게 배치되어 있습니다.
 */

import React from 'react';
import { 
  FileText, Calendar as CalendarIcon, Clock, Building, 
  ArrowUpRight, MessageSquare, Save, Send, Trash2, RotateCcw
} from 'lucide-react';
import { Consultation, ConsultationStatus } from '../../../backend/types';
import { ProcessStepper } from './ProcessStepper';
import { formatDateTime, getSubStatusBadgeStyle } from '../../../lib/utils/consultationArchive';

interface LeftInteractionPadProps {
  activeConsultation: Consultation;
  isExistingConsultation?: boolean;
  assignedAgentName: string;
  notes: string;
  setNotes: (text: string) => void;
  hopeDateInput: string;
  setHopeDateInput: (val: string) => void;
  onChangeStatus?: (status: ConsultationStatus) => void;
  onChangeSubStatus: (subStatus: string) => void;
  onChangeHopeDate?: (newDate: string) => void;
  onNavigateToKanban: () => void;
  onResetForm?: () => void;
  setShowTemplateModal: (val: boolean) => void;
  handleSaveAndSubmit?: () => void;
  setSaveToast?: (val: string | null) => void;
}

export const LeftInteractionPad: React.FC<LeftInteractionPadProps> = ({
  activeConsultation,
  isExistingConsultation,
  assignedAgentName,
  notes,
  setNotes,
  hopeDateInput,
  setHopeDateInput,
  onChangeSubStatus,
  onChangeHopeDate,
  onNavigateToKanban,
  onResetForm,
  setShowTemplateModal,
  handleSaveAndSubmit,
  setSaveToast,
}) => {
  const [currentLiveKst, setCurrentLiveKst] = React.useState<string>(() =>
    formatDateTime(new Date().toISOString())
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLiveKst(formatDateTime(new Date().toISOString()));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 mt-6">
      {/* 📌 상단 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-amber-500" />
          상담 상세 내용 메모
          {isExistingConsultation && activeConsultation?.id ? (
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
              ✏️ 기존 수정 중
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
              ✨ 신규 작성 중
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {activeConsultation?.sub_status ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSubStatusBadgeStyle(activeConsultation.sub_status)}`}>
              ⚡ {activeConsultation.sub_status}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-blue-100 text-blue-800 border-blue-300">
              ⚡ {activeConsultation?.status || '접수'}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* ⚡ 문의 유형별 동적 프로세스 스텝퍼 */}
        <div className="w-full py-2">
          <ProcessStepper
            inquiryType={activeConsultation?.inquiry_type || '주차 문의'}
            currentSubStatus={activeConsultation?.sub_status || ''}
            onChangeSubStatus={onChangeSubStatus}
          />
        </div>

        <hr className="border-slate-100" />

        {/* 📅 상담 일자 필드 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            상담 일자
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={hopeDateInput}
              onChange={(e) => setHopeDateInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-blue-50/60 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            />
            <button
              type="button"
              onClick={() => {
                if (onChangeHopeDate) onChangeHopeDate(hopeDateInput);
                if (setSaveToast) setSaveToast(`📅 상담 일자가 [${hopeDateInput}]로 변경 적용되었습니다.`);
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              적용
            </button>
          </div>
        </div>

        {/* 📝 상담 메모 입력 영역 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <label className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>상담 내용 메모 (고객 인입 내용)</span>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                최종 수정자: {assignedAgentName}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors text-[10px] shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                템플릿 불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  if (notes.trim()) {
                    navigator.clipboard.writeText(notes);
                    alert('📝 작성된 상담 상세 메모 내용이 클립보드에 복사되었습니다!\n원하는 메신저/문자 전송창에 붙여넣기(Ctrl+V) 하세요.');
                  } else {
                    alert('상담 내용을 작성해 주세요.');
                  }
                }}
                className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-[10px] shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="상담 내용을 클립보드에 임시 복사합니다."
              >
                <Send className="w-3.5 h-3.5" />
                안내 템플릿 발송
              </button>
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-32 custom-scroll leading-relaxed"
            placeholder="상담 상세 내용을 입력하세요..."
          />
        </div>

        {/* 💾 저장 & 메모 다시 적기 액션 버튼 그룹 */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setNotes('')}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-200"
            title="작성된 상담 메모 내용을 비우고 다시 작성합니다."
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            상담 내용 다시 적기
          </button>

          <button
            type="button"
            onClick={() => handleSaveAndSubmit && handleSaveAndSubmit()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Save className="w-4 h-4" />
            {isExistingConsultation ? '기존 상담 내용 수정 저장' : '새 상담내역 저장'}
          </button>
        </div>

        {/* ⏱️ 최초 접수 & 최종 저장 타임스탬프 정보 바 (KST 한국 로컬 시간 100% 동기화) */}
        <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>최초 접수: <strong className="text-slate-900 font-mono font-bold">{activeConsultation?.created_at ? formatDateTime(activeConsultation.created_at) : currentLiveKst}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>최종 저장: <strong className="text-emerald-700 font-mono font-bold">{activeConsultation?.updated_at || activeConsultation?.created_at ? formatDateTime(activeConsultation.updated_at || activeConsultation.created_at) : `${currentLiveKst} (저장 대기)`}</strong></span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">수정자: {assignedAgentName}</span>
          </div>
        </div>

        {/* 🚀 파이프라인 관제 보드 이동 바 */}
        <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-xl">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Building className="w-4 h-4 text-blue-600" />
            주차 관제 파이프라인 보드로 이동
          </span>
          <button
            type="button"
            onClick={onNavigateToKanban}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 hover:text-blue-600 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
            파이프라인 관제 뷰
          </button>
        </div>
      </div>
    </div>
  );
};

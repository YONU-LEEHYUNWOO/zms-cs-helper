/**
 * ZMS CS Helper - 문의 유형별 프로세스 스텝퍼 컴포넌트
 *
 * [역할]
 * - inquiry_type(문의 유형)에 따라 동적으로 프로세스 단계를 표시합니다.
 * - 현재 단계는 consultations.sub_status 컬럼 값과 연동됩니다.
 * - DB 컬럼 추가 없이 기존 sub_status 필드를 재활용합니다.
 *
 * [단계 정의]
 * - 주차 문의: 접수 → 공유자 부재 → 결제 메시지 전송 → 결제 완료
 * - 기타 문의: 문의 접수 → 유관 부서 확인 중 → 처리 완료
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';

// ─────────────────────────────────────────────
// 📋 문의 유형별 프로세스 단계 상수 정의
// ─────────────────────────────────────────────
interface StepDef {
  label: string;  // UI 표시 텍스트
  value: string;  // DB 저장 값 (sub_status)
}

const PROCESS_STEPS: Record<string, StepDef[]> = {
  '주차 문의': [
    { label: '접수',             value: '접수' },
    { label: '공유자 부재',      value: '공유자_부재' },
    { label: '결제 메시지 전송', value: '결제메시지_전송' },
    { label: '결제완료/처리완료', value: '결제완료' },
  ],
  '연장': [
    { label: '접수',             value: '접수' },
    { label: '공유자 부재',      value: '공유자_부재' },
    { label: '결제 메시지 전송', value: '결제메시지_전송' },
    { label: '결제완료/처리완료', value: '결제완료' },
  ],
};

// 주차 문의 및 연장 외 모든 유형에 적용되는 기본 3단계
const DEFAULT_STEPS: StepDef[] = [
  { label: '문의 접수',                  value: '접수' },
  { label: '유관 부서/공급사 확인 중', value: '부서확인중' },
  { label: '결제완료/처리완료',         value: '처리완료' },
];

// ─────────────────────────────────────────────
// 📋 Props 인터페이스
// ─────────────────────────────────────────────
interface ProcessStepperProps {
  inquiryType: string;       // 현재 상담의 문의 유형
  currentSubStatus: string;  // DB의 sub_status 현재 값
  onChangeSubStatus: (value: string) => void; // 단계 클릭 시 호출
  readonly?: boolean;        // 읽기 전용 모드 (DbViewer 등에서 활용)
}

// ─────────────────────────────────────────────
// 🧩 ProcessStepper 컴포넌트
// ─────────────────────────────────────────────
export const ProcessStepper: React.FC<ProcessStepperProps> = ({
  inquiryType,
  currentSubStatus,
  onChangeSubStatus,
  readonly = false,
}) => {
  // 문의 유형에 맞는 단계 목록 선택
  const steps = PROCESS_STEPS[inquiryType] ?? DEFAULT_STEPS;

  // 현재 활성 인덱스: sub_status 값으로 단계 탐색 ('결제완료' & '처리완료' 상호 호환)
  const activeIndex = steps.findIndex(
    (s) =>
      s.value === currentSubStatus ||
      ((s.value === '결제완료' || s.value === '처리완료') &&
        (currentSubStatus === '결제완료' || currentSubStatus === '처리완료' || currentSubStatus === '결제완료/처리완료'))
  );
  // DB에 값이 없거나 매칭 안 되면 첫 번째 단계를 기본으로
  const resolvedIndex = activeIndex >= 0 ? activeIndex : 0;

  // 프로그레스 바 너비 계산 (첫 단계=0%, 마지막=100%)
  const progressWidth =
    steps.length <= 1
      ? '0%'
      : `${(resolvedIndex / (steps.length - 1)) * 100}%`;

  return (
    <div className="w-full py-2">
      {/* 문의 유형 레이블 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          프로세스 단계
        </span>
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
          {inquiryType}
        </span>
      </div>

      {/* 스텝 트래커 */}
      <div className="flex justify-between relative">
        {/* 배경 라인 */}
        <div className="absolute top-[14px] left-0 w-full h-[2px] bg-slate-100 z-0" />
        {/* 진행 라인 */}
        <div
          className="absolute top-[14px] left-0 h-[2px] bg-blue-500 z-0 transition-all duration-500"
          style={{ width: progressWidth }}
        />

        {/* 각 스텝 */}
        {steps.map((step, idx) => {
          const isCompleted = idx < resolvedIndex;
          const isActive = idx === resolvedIndex;

          return (
            <div
              key={step.value}
              onClick={() => !readonly && onChangeSubStatus(step.value)}
              className={`relative z-10 flex flex-col items-center gap-1.5 ${
                readonly ? 'cursor-default' : 'cursor-pointer group'
              }`}
            >
              {/* 원형 인디케이터 */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs ring-4 ring-white text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isActive
                    ? `${
                        step.value === '결제완료' || step.value === '처리완료'
                          ? 'bg-emerald-600 ring-emerald-100'
                          : step.value === '부서확인중'
                          ? 'bg-purple-600 ring-purple-100'
                          : step.value === '공유자_부재'
                          ? 'bg-rose-500 ring-rose-100'
                          : step.value === '결제메시지_전송'
                          ? 'bg-amber-500 ring-amber-100'
                          : 'bg-blue-600 ring-blue-100'
                      } text-white scale-110 shadow-md`
                    : 'bg-slate-200 text-slate-400'
                } ${!readonly && !isActive ? 'group-hover:bg-blue-100 group-hover:text-blue-700' : ''}`}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>

              {/* 단계 텍스트 */}
              <span
                className={`text-[10px] font-bold text-center leading-tight max-w-[60px] ${
                  isActive
                    ? step.value === '결제완료' || step.value === '처리완료'
                      ? 'text-emerald-700'
                      : step.value === '부서확인중'
                      ? 'text-purple-700'
                      : step.value === '공유자_부재'
                      ? 'text-rose-700'
                      : step.value === '결제메시지_전송'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 외부에서 문의 유형별 단계 목록을 참조할 수 있도록 export
export { PROCESS_STEPS, DEFAULT_STEPS };
export type { StepDef };

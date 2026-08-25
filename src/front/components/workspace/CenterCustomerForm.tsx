/**
 * ZMS CS Helper - 고객 정보 및 주차 희망 정보 입력 폼 컴포넌트 (CenterCustomerForm)
 * 
 * [역할 및 아키텍처 위치]
 * - 프론트엔드 워크스페이스(Workspace)의 중앙 고객 정보 작성 패널을 담당합니다.
 * - 고객 차량 정보, 희망 주차면 카테고리 매칭 및 추천 주차 검색 조회를 수행합니다.
 */

import React, { useState, useRef, useMemo } from 'react';
import { UserCheck, RotateCcw, Phone, Copy, Car, ChevronDown, Sparkles, Building, MapPin, PlusCircle, Search, FileText, X, History, Lock, AlertTriangle } from 'lucide-react';
import { Customer, ParkingSpot, Consultation, InternalAgent } from '../../../backend/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { getInquiryTypeBadgeStyle } from '../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../lib/utils/normalize';
import { CustomerHistoryTimelineModal } from './CustomerHistoryTimelineModal';

interface CenterCustomerFormProps {
  customer: Customer;
  parkingSpots: ParkingSpot[];
  onChangeCustomerField: (field: keyof Customer, value: any) => void;
  onSelectRecommendedParking: (spot: ParkingSpot) => void;
  onResetForm?: () => void;
  userCategory: '사용자' | '공유자';
  setUserCategory: (val: '사용자' | '공유자') => void;
  inquiryType: string;
  setInquiryType: (val: string) => void;
  parkingCategory: string;
  setParkingCategory: (val: string) => void;
  ownerPhone: string;
  setOwnerPhone: (val: string) => void;
  userPhone: string;
  setUserPhone: (val: string) => void;
  parkingStartDate: string;
  setParkingStartDate: (val: string) => void;
  isExistingConsultation?: boolean;
  onStartNewConsultation?: () => void;
  matchingSuggestion?: { customer: Customer; consultation?: Consultation } | null;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
  consultations?: Consultation[];
  activeLocks?: Record<string, { agentName: string; lockedAt: number }>;
  currentConsultationId?: string | null;
  currentAgentName?: string;
  onSelectConsultation?: (consId: string) => void;
  agents?: InternalAgent[];
}

const STANDARD_CAR_TYPES = [
  { label: '선택 안함 (빈칸)', value: '' },
  { label: '경차', value: '경차' },
  { label: '소형', value: '소형' },
  { label: '세단 중형', value: '세단 중형' },
  { label: '세단 대형', value: '세단 대형' },
  { label: 'SUV', value: 'SUV' },
  { label: '승합차', value: '승합차' },
  { label: '화물차(1톤탑차)', value: '화물차(1톤탑차)' },
];

export const CenterCustomerForm: React.FC<CenterCustomerFormProps> = ({
  customer,
  parkingSpots,
  onChangeCustomerField,
  onSelectRecommendedParking,
  onResetForm,
  userCategory,
  setUserCategory,
  inquiryType,
  setInquiryType,
  parkingCategory,
  setParkingCategory,
  ownerPhone,
  setOwnerPhone,
  userPhone,
  setUserPhone,
  parkingStartDate,
  setParkingStartDate,
  isExistingConsultation = false,
  onStartNewConsultation,
  matchingSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
  consultations = [],
  activeLocks = {},
  currentConsultationId,
  currentAgentName = '',
  onSelectConsultation,
  agents = [],
}) => {
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const recommendationRef = useRef<HTMLDivElement>(null);

  useClickOutside(recommendationRef, () => {
    setShowRecommendation(false);
  });

  const matchedSpots = customer
    ? parkingSpots.filter((s) => s.allowed_car_types.includes(customer.car_type))
    : parkingSpots;

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setSaveToast(`복사되었습니다: ${text}`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  // 과거 상담 이력 건수 계산
  const historyCount = useMemo(() => {
    if (!consultations || consultations.length === 0) return 0;
    const cleanPhone = (customer.phone_number || '').replace(/[^0-9]/g, '');
    const cleanCar = (customer.car_number || '').trim();
    if (!cleanPhone && !cleanCar) return 0;

    return consultations.filter((c) => {
      const cCar = c.customers?.car_number || '';
      const cPhone = c.customers?.phone_number || '';
      const pMatch = cleanPhone && cPhone.replace(/[^0-9]/g, '').includes(cleanPhone);
      const cMatch = cleanCar && cCar.includes(cleanCar);
      return Boolean(pMatch || cMatch);
    }).length;
  }, [consultations, customer.phone_number, customer.car_number]);

  // 다른 상담원이 현재 편집 중인지 (Soft Lock)
  const activeLockHolder = useMemo(() => {
    if (!currentConsultationId || !activeLocks) return null;
    const lock = activeLocks[currentConsultationId];
    if (lock && lock.agentName && lock.agentName !== currentAgentName) {
      return lock.agentName;
    }
    return null;
  }, [currentConsultationId, activeLocks, currentAgentName]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {saveToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl">
          {saveToast}
        </div>
      )}

      {/* 🛡️ 실시간 편집 소프트 락 (Soft Lock) 경고 펄스 배지 */}
      {activeLockHolder && (
        <div className="m-3 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-amber-900 text-xs font-bold animate-pulse shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>🟡 [{activeLockHolder} 상담원]이 현재 이 건을 편집 중입니다. (저장 시 경고 후 허용)</span>
          </div>
          <span className="bg-amber-200/80 text-amber-900 text-[11px] px-2 py-0.5 rounded font-mono">Soft Lock Active</span>
        </div>
      )}

      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/50 gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
            <UserCheck className="w-4 h-4 text-blue-600" />
            고객 및 차량 원장
          </h2>

          {/* 🎛️ 스마트 모드 토글 세그먼트 스위치 */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300/70 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (isExistingConsultation && onStartNewConsultation) {
                  onStartNewConsultation();
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !isExistingConsultation
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              ✨ 신규 상담 작성 모드
            </button>

            <button
              type="button"
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isExistingConsultation
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 opacity-60 cursor-not-allowed'
              }`}
              disabled={!isExistingConsultation}
            >
              <FileText className="w-3.5 h-3.5" />
              📋 기존 내역 수정 모드
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* 📜 과거 전체 상담 이력 수직 타임라인 버튼 */}
          <button
            type="button"
            onClick={() => setShowTimelineModal(true)}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="이 고객의 과거 전체 상담 이력 수직 타임라인을 확인합니다."
          >
            <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>📜 과거 상담 이력 ({historyCount}건)</span>
          </button>

          {/* 🔄 크고 가독성 명확한 전체 초기화 버튼 */}
          {onResetForm && (
            <button
              type="button"
              onClick={onResetForm}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="고객 정보 및 상담 메모를 모두 비우고 초기화합니다."
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>🔄 전체 초기화</span>
            </button>
          )}

          <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-[11px] border border-slate-200 font-mono">
            고객 ID: {customer.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>

      {/* 💡 입력 중 유사 등록 내역 감지 추천 카드 (🔵 파란색: 상담 내역 vs 🟢 초록색: 고객 정보 시각적 테마 완전 분리) */}
      {matchingSuggestion && (
        <div className={`m-4 p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs animate-fade-in transition-all ${
          matchingSuggestion.consultation
            ? 'bg-blue-50/95 border-blue-300 text-blue-950'
            : 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white mt-0.5 md:mt-0 shadow-xs ${
              matchingSuggestion.consultation ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              {matchingSuggestion.consultation ? (
                <FileText className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-xs ${
                  matchingSuggestion.consultation ? 'text-blue-900' : 'text-emerald-900'
                }`}>
                  {matchingSuggestion.consultation ? '🔍 기존 상담 내역 감지' : '👤 기존 등록 고객 감지'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                  matchingSuggestion.consultation ? 'bg-blue-200/80 text-blue-900' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {maskTempPhoneNumber(matchingSuggestion.customer.phone_number, '', true) || maskTempCarNumber(matchingSuggestion.customer.car_number, '') || '미등록 고객'}
                </span>
                {matchingSuggestion.consultation && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border shadow-3xs ${
                    getInquiryTypeBadgeStyle(matchingSuggestion.consultation.inquiry_type)
                  }`}>
                    📂 {matchingSuggestion.consultation.inquiry_type || '주차 문의'}
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${
                matchingSuggestion.consultation ? 'text-blue-800' : 'text-emerald-800'
              }`}>
                {matchingSuggestion.consultation
                  ? `입력하신 정보와 일치하는 기존 상담 내역이 조회되었습니다. 기존 내역을 불러오시겠습니까?`
                  : `입력하신 정보로 기존 등록된 고객 정보가 확인되었습니다. 고객 정보를 불러오시겠습니까?`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={onApplySuggestion}
              className={`px-3.5 py-1.5 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                matchingSuggestion.consultation
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {matchingSuggestion.consultation ? (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>📋 기존 상담 내역 불러오기</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>👤 고객 정보 불러오기</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onDismissSuggestion}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              ✨ 무시하고 신규 작성
            </button>
          </div>
        </div>
      )}

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">연락처</label>
          <div className="relative flex items-center">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={maskTempPhoneNumber(customer?.phone_number || '')}
              onChange={(e) => onChangeCustomerField('phone_number', e.target.value)}
              placeholder="010-1234-5678"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(maskTempPhoneNumber(customer?.phone_number || ''))}
              className="absolute right-2 text-blue-600 hover:text-blue-800 bg-blue-50 p-1 rounded cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">차량번호</label>
          <div className="relative flex items-center">
            <Car className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={maskTempCarNumber(customer?.car_number || '')}
              onChange={(e) => onChangeCustomerField('car_number', e.target.value)}
              placeholder="12가3456"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">차종 분류</label>
          <div className="relative flex items-center">
            <select
              value={customer?.car_type || ''}
              onChange={(e) => onChangeCustomerField('car_type', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              {STANDARD_CAR_TYPES.map((opt) => (
                <option key={opt.label} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">상세 모델명</label>
          <input
            type="text"
            value={customer?.car_detail || ''}
            onChange={(e) => onChangeCustomerField('car_detail', e.target.value)}
            placeholder="예: 현대 아반떼 CN7"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="text-xs text-slate-500 font-medium">환불 계좌 정보</label>
          <div className="flex gap-2">
            <select
              value={customer?.bank_name || ''}
              onChange={(e) => onChangeCustomerField('bank_name', e.target.value)}
              className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">은행 선택</option>
              <option value="국민은행">국민은행</option>
              <option value="신한은행">신한은행</option>
              <option value="우리은행">우리은행</option>
              <option value="카카오뱅크">카카오뱅크</option>
              <option value="토스뱅크">토스뱅크</option>
            </select>
            <input
              type="text"
              value={customer?.account_number || ''}
              onChange={(e) => onChangeCustomerField('account_number', e.target.value)}
              placeholder="계좌번호 (- 없이 입력)"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <input
              type="text"
              value={customer?.account_holder || ''}
              onChange={(e) => onChangeCustomerField('account_holder', e.target.value)}
              placeholder="예금주"
              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 상담 분류 항목 추가 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">이용자 구분</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setUserCategory('공유자')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                userCategory === '공유자' ? 'bg-white shadow-2xs text-blue-600 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              공유자
            </button>
            <button
              type="button"
              onClick={() => setUserCategory('사용자')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                userCategory === '사용자' ? 'bg-white shadow-2xs text-blue-600 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              사용자
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">문의 유형</label>
          <div className="relative flex items-center">
            <select
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="주차 문의">주차 문의</option>
              <option value="결제/환불">결제/환불</option>
              <option value="연장">연장</option>
              <option value="차량 변경">차량 변경</option>
              <option value="기타">기타</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">주차장 종류</label>
          <div className="relative flex items-center">
            <select
              value={parkingCategory}
              onChange={(e) => setParkingCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="월주차">월주차</option>
              <option value="일주차">일주차</option>
              <option value="거주자우선주차(공유주차)">거주자우선주차(공유주차)</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>

      {/* 🚗 주차 문의, 연장, 차량 변경 선택 시 동적 매칭 상세 폼 확장 */}
      {(inquiryType === '주차 문의' || inquiryType === '연장' || inquiryType === '차량 변경') && (
        <div className="mx-5 mb-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {inquiryType === '차량 변경'
                ? '💡 차량 변경 문의 접수: 아래에 변경 승인/확인을 위한 공유자(임대인) 연락처를 기입하세요.'
                : userCategory === '사용자' 
                  ? '💡 차주(사용자) 문의 접수: 아래에 매칭할 공유자(임대인) 연락처를 기입하세요.' 
                  : '💡 공유자(임대인) 문의 접수: 아래에 매칭할 차주(사용자) 정보를 기입하세요.'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1. 차주 연락처 입력 칸 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                <span>차주(사용자) 연락처</span>
                {userCategory === '사용자' && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">당사자(자동)</span>}
              </label>
              <div className="relative flex items-center">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  value={userCategory === '사용자' ? maskTempPhoneNumber(customer?.phone_number || '') : maskTempPhoneNumber(userPhone)}
                  onChange={(e) => {
                    if (userCategory !== '사용자') {
                      setUserPhone(e.target.value);
                    }
                  }}
                  disabled={userCategory === '사용자'}
                  placeholder="차주 번호 입력"
                  className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs font-mono outline-none transition-all ${
                    userCategory === '사용자' 
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                      : 'bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* 2. 공유자 연락처 입력 칸 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                <span>공유자(임대인) 연락처</span>
                {userCategory === '공유자' && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">당사자(자동)</span>}
              </label>
              <div className="relative flex items-center">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  value={userCategory === '공유자' ? maskTempPhoneNumber(customer?.phone_number || '') : maskTempPhoneNumber(ownerPhone)}
                  onChange={(e) => {
                    if (userCategory !== '공유자') {
                      setOwnerPhone(e.target.value);
                    }
                  }}
                  disabled={userCategory === '공유자'}
                  placeholder="공유자 번호 입력"
                  className={`w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs font-mono outline-none transition-all ${
                    userCategory === '공유자' 
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                      : 'bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                <span>🚗 희망 주차 시작일</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={parkingStartDate}
                  onChange={(e) => setParkingStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer font-mono font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pb-4" ref={recommendationRef}>
        <button
          type="button"
          onClick={() => setShowRecommendation(!showRecommendation)}
          className="w-full py-2 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 shadow-2xs flex items-center justify-between transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            어드민 추천 주차장 매물 조회 ({matchedSpots.length}건 입차 가능)
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showRecommendation ? 'rotate-180' : ''}`} />
        </button>

        {showRecommendation && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150">
            {matchedSpots.length === 0 ? (
              <p className="text-xs text-slate-500 p-2 text-center">조건에 적합한 추천 매물이 없습니다.</p>
            ) : (
              matchedSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-2xs hover:border-blue-300 transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      {spot.name}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {spot.address} | 시간당 {spot.price_per_hour.toLocaleString()}원
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRecommendedParking(spot);
                      setShowRecommendation(false);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    선택 적용
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 고객 과거 전체 상담 이력 수직 타임라인 모달 */}
      <CustomerHistoryTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        carNumber={customer?.car_number}
        phoneNumber={customer?.phone_number}
        customerName={customer?.name}
        consultations={consultations}
        agents={agents}
        onSelectConsultation={(cons) => {
          if (onSelectConsultation) onSelectConsultation(cons.id);
        }}
      />
    </div>
  );
};

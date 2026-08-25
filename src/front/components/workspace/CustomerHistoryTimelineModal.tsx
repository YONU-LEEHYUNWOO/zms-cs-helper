/**
 * ZMS CS Helper - 고객별 과거 전체 상담 이력 수직 타임라인 모달 (CustomerHistoryTimelineModal)
 * 
 * [주요 기능]
 * - 전화번호 / 차량번호 기반 과거 전체 상담 및 통화 이력을 역연대순 수직 타임라인으로 표출
 * - 상담원 담당자 배지 (👤 이현우 상담사), 세부 프로세스 단계 시그니처 컬러 연동
 * - 과거 90일 경과 보관건 포함 100% 통합 추적 지원
 * - Rule 8 준수: 최상위 백드롭 딤 클릭 닫기 지원 및 stopPropagation 연동
 */

import React, { useMemo } from 'react';
import {
  X, History, Clock, User, Phone, Car, Tag, FileText, CheckCircle2,
  AlertCircle, MessageSquare, ShieldAlert, ArrowRight, Sparkles, ChevronRight
} from 'lucide-react';
import { Consultation, InternalAgent } from '../../../backend/types';
import { getSubStatusBadgeStyle } from '../../../lib/utils/consultationArchive';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../../lib/utils/normalize';

interface CustomerHistoryTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  carNumber?: string;
  phoneNumber?: string;
  customerName?: string;
  consultations: Consultation[];
  agents?: InternalAgent[];
  onSelectConsultation?: (consultation: Consultation) => void;
}

export const CustomerHistoryTimelineModal: React.FC<CustomerHistoryTimelineModalProps> = ({
  isOpen,
  onClose,
  carNumber = '',
  phoneNumber = '',
  customerName = '',
  consultations = [],
  agents = [],
  onSelectConsultation,
}) => {
  if (!isOpen) return null;

  const cleanTargetPhone = phoneNumber.replace(/[^0-9]/g, '');
  const cleanTargetCar = carNumber.trim();

  // 매칭되는 고객 과거 상담 이력 필터링 (최신순 정렬)
  const matchedConsultations = useMemo(() => {
    return consultations.filter((c) => {
      const cCar = c.customers?.car_number || '';
      const cPhone = c.customers?.phone_number || '';
      
      const phoneMatch = cleanTargetPhone && cPhone.replace(/[^0-9]/g, '').includes(cleanTargetPhone);
      const carMatch = cleanTargetCar && cCar.includes(cleanTargetCar);

      return Boolean(phoneMatch || carMatch);
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [consultations, cleanTargetPhone, cleanTargetCar]);

  const displayCar = maskTempCarNumber(carNumber) || '차량번호 미등록';
  const displayPhone = maskTempPhoneNumber(phoneNumber) || '연락처 미등록';
  const displayName = customerName || (matchedConsultations[0]?.customers?.name) || '고객';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-lg">고객 과거 상담 수직 타임라인</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  총 {matchedConsultations.length}건
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                과거 상담사와의 소통 이력 및 처리 경과를 연대순으로 100% 추적합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Target Summary Card */}
        <div className="px-6 py-3 bg-blue-50/40 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <User className="w-4 h-4 text-blue-600" />
              <span>{displayName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Car className="w-4 h-4 text-slate-400" />
              <span>{displayCar}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{displayPhone}</span>
            </div>
          </div>
          
          {matchedConsultations.length > 0 && (
            <div className="text-slate-500 text-[11px]">
              최근 상담일: <span className="font-bold text-slate-700">{new Date(matchedConsultations[0].created_at).toLocaleString('ko-KR')}</span>
            </div>
          )}
        </div>

        {/* Vertical Timeline Body */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1 bg-slate-50/30">
          {matchedConsultations.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-sm">과거 상담 기록이 없습니다</p>
                <p className="text-xs text-slate-400 mt-1">해당 차량번호/연락처로 등록된 이전 상담 내역이 존재하지 않습니다.</p>
              </div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {matchedConsultations.map((item, index) => {
                const assignedAgentName = item.assigned_agent_name || '미배정';
                const createdDate = new Date(item.created_at);
                const formattedDate = createdDate.toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const badgeColorClass = getSubStatusBadgeStyle(item.sub_status || item.status);

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[31px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs text-blue-600 group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                    </div>

                    {/* Timeline Content Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColorClass}`}>
                            {item.sub_status || item.status}
                          </span>

                          {item.category && (
                            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Tag className="w-3 h-3 text-slate-400" />
                              {item.category}
                            </span>
                          )}

                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formattedDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>{assignedAgentName} 상담사</span>
                          </span>

                          {onSelectConsultation && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectConsultation(item);
                                onClose();
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                            >
                              <span>상세보기</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Consultation Content Notes */}
                      <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                        {item.consultation_notes ? (
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 font-medium whitespace-pre-wrap">
                            {item.consultation_notes}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">상세 상담 메모가 기록되지 않았습니다.</p>
                        )}
                      </div>

                      {/* Footer Info & Parking Spot */}
                      {item.parking_spot_name && (
                        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-600">🅿️ 주차장: {item.parking_spot_name}</span>
                          {item.hope_date && (
                            <span>이용 예정일: <strong className="text-slate-700">{item.hope_date}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            💡 클릭 시 해당 상담건을 메인 폼으로 불러와 즉시 확인할 수 있습니다.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

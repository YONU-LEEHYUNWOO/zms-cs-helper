/**
 * ZMS CS Helper - 고객 정보 & 상담 작성 폼 전용 Sub-Hook (useConsultationFormState)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/hooks/subhooks/useConsultationFormState.ts
 * - 고객 입력 필드 갱신, 기존 이력 자동 가로채기(Hijack) 방지 추천 매칭,
 *   신규 작성 폼 리셋 및 수동 매칭 적용 제어
 */

import { useState, useRef, useCallback } from 'react';
import { Customer, Consultation } from '../../../backend/types';
import { generateUUID } from '../../../lib/utils/uuid';
import { customerRepository } from '../../../backend/repositories/CustomerRepositoryImpl';

export function createFreshCustomer(): Customer {
  return {
    id: generateUUID(),
    phone_number: '',
    car_number: '',
    car_type: '',
    car_detail: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    is_blacklist: false,
    special_note: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function useConsultationFormState(
  consultations: Consultation[],
  customers: Customer[]
) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(createFreshCustomer);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isForceNewConsultation, setIsForceNewConsultation] = useState<boolean>(false);
  const [draftStatus, setDraftStatus] = useState<any>(null);
  const [newConsultationId, setNewConsultationId] = useState<string>(generateUUID());

  const [matchingSuggestion, setMatchingSuggestion] = useState<{
    customer: Customer;
    consultation?: Consultation;
  } | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdateCustomerField = useCallback((field: keyof Customer, value: any) => {
    setSelectedCustomer(prev => ({ ...prev, [field]: value }));

    if (field !== 'phone_number' && field !== 'car_number') return;
    const strVal = String(value || '').trim();
    if (strVal.length < 3) {
      setMatchingSuggestion(null);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      const match = await customerRepository.getCustomerByPhoneOrCar(strVal);
      if (match) {
        const matchCons =
          consultations.find((c) => c.customer_id === match.id && c.status !== '완료') ||
          consultations.find((c) => c.customer_id === match.id);

        const isStillValidCustomer = customers.some((c) => c.id === match.id);
        if (isStillValidCustomer || matchCons) {
          setMatchingSuggestion({
            customer: match,
            consultation: matchCons,
          });
          return;
        }
      }
      setMatchingSuggestion(null);
    }, 400);
  }, [consultations, customers]);

  const handleApplySuggestion = useCallback(() => {
    if (!matchingSuggestion) return;
    const { customer: matchCust, consultation: matchCons } = matchingSuggestion;
    setSelectedCustomer(matchCust);
    if (matchCons) {
      setSelectedConsultationId(matchCons.id);
      setNotes(matchCons.summary || matchCons.consultation_notes || '');
      setIsForceNewConsultation(false);
    } else {
      setSelectedConsultationId(null);
      setIsForceNewConsultation(true);
    }
    setMatchingSuggestion(null);
  }, [matchingSuggestion]);

  const handleDismissSuggestion = useCallback(() => {
    setSelectedCustomer(prev => ({
      ...prev,
      car_number: '',
      car_type: '',
      car_detail: '',
    }));
    setNotes('');
    setSelectedConsultationId(null);
    setIsForceNewConsultation(true);
    setMatchingSuggestion(null);
  }, []);

  const handleResetForm = useCallback(() => {
    setSelectedConsultationId(null);
    setSelectedCustomer(createFreshCustomer());
    setNotes('');
    setIsForceNewConsultation(false);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    setNewConsultationId(generateUUID());
  }, []);

  const handleStartNewConsultation = useCallback(() => {
    setSelectedCustomer(prev => ({
      ...prev,
      car_number: '',
      car_type: '',
      car_detail: '',
    }));
    setSelectedConsultationId(null);
    setNotes('');
    setIsForceNewConsultation(true);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    setNewConsultationId(generateUUID());
  }, []);

  return {
    selectedCustomer,
    setSelectedCustomer,
    selectedConsultationId,
    setSelectedConsultationId,
    notes,
    setNotes,
    isForceNewConsultation,
    setIsForceNewConsultation,
    draftStatus,
    setDraftStatus,
    newConsultationId,
    setNewConsultationId,
    matchingSuggestion,
    setMatchingSuggestion,
    handleUpdateCustomerField,
    handleApplySuggestion,
    handleDismissSuggestion,
    handleResetForm,
    handleStartNewConsultation,
  };
}

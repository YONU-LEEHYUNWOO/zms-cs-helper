/**
 * ZMS CS Helper - 상담 저장 및 세부 단계 변경 전용 Sub-Hook (useConsultationSaveHandler)
 * 
 * [역할 및 아키텍처 위치]
 * - src/front/hooks/subhooks/useConsultationSaveHandler.ts
 * - saveCustomer, saveConsultation, updateConsultationStatus 연동
 */

import React, { useCallback } from 'react';
import { Customer, Consultation, InternalAgent, ConsultationStatus } from '../../../backend/types';
import { generateUUID } from '../../../lib/utils/uuid';
import { getResolvedStatus } from '../../../lib/utils/consultationArchive';
import { customerRepository } from '../../../backend/repositories/CustomerRepositoryImpl';
import { consultationRepository } from '../../../backend/repositories/ConsultationRepositoryImpl';

export function useConsultationSaveHandler(
  selectedCustomer: Customer,
  selectedConsultationId: string | null,
  newConsultationId: string,
  activeConsultation: Consultation | null,
  currentAgentName: string,
  currentAgent: InternalAgent | null,
  agents: InternalAgent[],
  consultations: Consultation[],
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  setConsultations: React.Dispatch<React.SetStateAction<Consultation[]>>,
  setIsForceNewConsultation: (val: boolean) => void,
  setSelectedConsultationId: (id: string | null) => void,
  setDraftStatus: (status: any) => void,
  setMatchingSuggestion: (val: any) => void,
  setNewConsultationId: (id: string) => void,
  setSelectedCustomer: (cust: Customer) => void
) {
  const handleSaveLog = useCallback(async (updatedSummary: string, hopeDate?: string, extras?: Partial<Consultation>) => {
    let targetCustomer = { ...selectedCustomer };
    const phoneStr = (targetCustomer.phone_number || '').trim();
    const carStr = (targetCustomer.car_number || '').trim();

    if (phoneStr || carStr) {
      const match = await customerRepository.getCustomerByPhoneOrCar(phoneStr || carStr);
      if (match) {
        targetCustomer = { ...match, ...selectedCustomer, id: match.id };
      }
    }

    const hasIdentifier = !!(phoneStr || carStr);
    const savedCustomer = await customerRepository.saveCustomer(targetCustomer);
    targetCustomer = savedCustomer;

    const finalCustomerId = hasIdentifier ? targetCustomer.id : null;

    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === targetCustomer.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = targetCustomer;
        return next;
      }
      return [targetCustomer, ...prev];
    });

    const isEditingExisting = !!selectedConsultationId;
    const targetConsId = isEditingExisting ? selectedConsultationId : newConsultationId;

    const preservedAgentName = isEditingExisting ? (activeConsultation?.agent_name || currentAgentName) : currentAgentName;
    const matchedAgentObj = agents.find((a) => a.agent_name === preservedAgentName);
    const targetAgentId = matchedAgentObj?.id || currentAgent?.id || 'unassigned';

    const targetInquiryType = (extras?.inquiry_type || (activeConsultation && activeConsultation.inquiry_type) || '주차 문의').trim();
    const targetSubStatus = (extras?.sub_status || (activeConsultation && activeConsultation.sub_status) || '접수').trim();

    const resolvedStatus = getResolvedStatus({
      status: '접수',
      sub_status: targetSubStatus,
    } as any);

    const newCons: Consultation = {
      id: targetConsId,
      customer_id: finalCustomerId,
      agent_id: targetAgentId,
      car_number: targetCustomer.car_number || '',
      phone_number: targetCustomer.phone_number || '',
      summary: updatedSummary || '',
      hope_date: hopeDate || (activeConsultation && activeConsultation.hope_date) || new Date().toISOString().slice(0, 10),
      agent_name: preservedAgentName,
      inquiry_type: targetInquiryType,
      sub_status: targetSubStatus,
      status: resolvedStatus,
      created_at: (activeConsultation && activeConsultation.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parking_name: (extras?.parking_name || (activeConsultation && activeConsultation.parking_name) || ''),
      parking_type: (extras?.parking_type || (activeConsultation && activeConsultation.parking_type) || ''),
      region: (extras?.region || (activeConsultation && activeConsultation.region) || ''),
      user_type: (extras?.user_type || (activeConsultation && activeConsultation.user_type) || '사용자'),
      owner_phone: (extras?.owner_phone || (activeConsultation && activeConsultation.owner_phone) || undefined),
      user_phone: (extras?.user_phone || (activeConsultation && activeConsultation.user_phone) || undefined),
      parking_start_date: (extras?.parking_start_date === null ? undefined : (extras?.parking_start_date || (activeConsultation && activeConsultation.parking_start_date) || undefined)),
      is_archived: (extras?.is_archived !== undefined ? extras.is_archived : (activeConsultation && activeConsultation.is_archived) || false),
    };

    await consultationRepository.saveConsultation(newCons);

    const latestConsList = await consultationRepository.getConsultations();
    setConsultations(latestConsList);

    setIsForceNewConsultation(false);
    setSelectedConsultationId(newCons.id);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    setNewConsultationId(generateUUID());

    setSelectedConsultationId(targetConsId);
    setSelectedCustomer(targetCustomer);
  }, [
    selectedCustomer,
    selectedConsultationId,
    newConsultationId,
    activeConsultation,
    currentAgentName,
    currentAgent,
    agents,
    setCustomers,
    setConsultations,
    setIsForceNewConsultation,
    setSelectedConsultationId,
    setDraftStatus,
    setMatchingSuggestion,
    setNewConsultationId,
    setSelectedCustomer,
  ]);

  const handleChangeStatus = useCallback(async (status: ConsultationStatus, subStatus?: string) => {
    if (!activeConsultation?.id) return;
    setDraftStatus(status);
    const existingCons = consultations.find((c) => c.id === activeConsultation.id);
    if (existingCons) {
      await consultationRepository.updateConsultationStatus(activeConsultation.id, status, subStatus);
      setDraftStatus(null);
    }
  }, [activeConsultation, consultations, setDraftStatus]);

  const handleChangeSubStatus = useCallback(async (subStatus: string) => {
    if (!activeConsultation?.id) return;
    const existingCons = consultations.find((c) => c.id === activeConsultation.id);
    if (!existingCons) return;

    let targetStatus: ConsultationStatus = existingCons.status;
    if (subStatus === '접수') {
      targetStatus = '접수';
    } else if (subStatus === '결제완료' || subStatus === '처리완료') {
      targetStatus = '완료';
    } else {
      targetStatus = '해결중';
    }

    await consultationRepository.updateConsultationStatus(
      activeConsultation.id,
      targetStatus,
      subStatus
    );

    const updatedList = await consultationRepository.getConsultations();
    setConsultations(updatedList);
  }, [activeConsultation, consultations, setConsultations]);

  return {
    handleSaveLog,
    handleChangeStatus,
    handleChangeSubStatus,
  };
}

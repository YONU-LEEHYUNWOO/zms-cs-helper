import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { generateUUID } from '../../lib/utils/uuid';
import {
  Customer,
  InternalAgent,
  SavedTemplate,
  CallLog,
  Consultation,
  AgentTask,
  ParkingSpot,
  ConsultationStatus,
} from '../../backend/types';
import { customerRepository } from '../../backend/repositories/CustomerRepositoryImpl';
import { consultationRepository } from '../../backend/repositories/ConsultationRepositoryImpl';
import { agentTaskRepository } from '../../backend/repositories/AgentTaskRepositoryImpl';
import { consultationDomainService } from '../../backend/services/consultation/consultationService';

import { INITIAL_PARKING_SPOTS } from '../../lib/constants';
import { isOlderArchivedConsultation, getResolvedStatus } from '../../lib/utils/consultationArchive';


import { useTemplateState } from './subhooks/useTemplateState';
import { useAgentTaskState } from './subhooks/useAgentTaskState';
import { useInternalAgentState } from './subhooks/useInternalAgentState';
import { useConsultationFormState, createFreshCustomer } from './subhooks/useConsultationFormState';

import { useConsultationSaveHandler } from './subhooks/useConsultationSaveHandler';

export function useAppData(currentAgent: InternalAgent | null, currentAgentName: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [parkingSpots] = useState<ParkingSpot[]>(INITIAL_PARKING_SPOTS);

  // Subhooks
  const {
    templates,
    handleAddTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
  } = useTemplateState();
  const {
    tasks,
    fetchTasks,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
    handleReassignTask,
    handleEditTask,
  } = useAgentTaskState(currentAgentName);

  const {
    agents,
    handleAddAgent,
    handleSaveAgentProfile,
    handleRegisterNewAgent,
    handleToggleAgentStatus,
    handleUpdateAgentRole,
    handleDeleteAgent,
  } = useInternalAgentState(currentAgent);

  const {
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
  } = useConsultationFormState(consultations, customers);

  // 전 전체 상담 마스터 데이터 (90일 보관 여부 무관)
  const allConsultations = consultations;

  const activeConsultation: Consultation = useMemo(() => {
    if (selectedConsultationId) {
      const found = allConsultations.find((c) => c.id === selectedConsultationId);
      if (found) {
        const merged = { ...found, summary: notes || found.summary || found.consultation_notes || '' };
        return draftStatus ? { ...merged, status: draftStatus } : merged;
      }
    }

    return {
      id: newConsultationId,
      customer_id: selectedCustomer.id,
      car_number: selectedCustomer.car_number,
      phone_number: selectedCustomer.phone_number,
      user_type: '사용자',
      parking_type: '월주차',
      parking_name: '',
      inquiry_type: '주차 문의',
      status: draftStatus || '접수',
      sub_status: '접수',
      agent_name: currentAgentName,
      summary: notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [selectedConsultationId, allConsultations, selectedCustomer, currentAgentName, notes, draftStatus, newConsultationId]);

  const {
    handleSaveLog,
    handleChangeStatus,
    handleChangeSubStatus,
  } = useConsultationSaveHandler(
    selectedCustomer,
    selectedConsultationId,
    newConsultationId,
    activeConsultation,
    currentAgentName,
    currentAgent,
    agents,
    consultations,
    setCustomers,
    setConsultations,
    setIsForceNewConsultation,
    setSelectedConsultationId,
    setDraftStatus,
    setMatchingSuggestion,
    setNewConsultationId,
    setSelectedCustomer
  );

  // 📦 Phase 1.5: 90일 경과 완료건 보관 이력 필터 토글 상태
  const [showOlderArchive, setShowOlderArchive] = useState<boolean>(false);

  // 🛡️ 계정 간 실시간 편집 소프트 락 (Soft Lock) 상태 (consultationId -> { agentName, lockedAt })
  const [activeLocks, setActiveLocks] = useState<Record<string, { agentName: string; lockedAt: number }>>({});

  const acquireLock = useCallback((consultationId: string, agentName: string) => {
    if (!consultationId || !agentName) return;
    const now = Date.now();
    setActiveLocks((prev) => ({
      ...prev,
      [consultationId]: { agentName, lockedAt: now },
    }));

    if (isSupabaseConfigured() && supabase) {
      supabase.channel('public:consultation_locks').send({
        type: 'broadcast',
        event: 'lock_changed',
        payload: { consultationId, agentName, action: 'lock', timestamp: now },
      });
    }
  }, []);

  const releaseLock = useCallback((consultationId: string, agentName: string) => {
    if (!consultationId) return;
    setActiveLocks((prev) => {
      const copy = { ...prev };
      delete copy[consultationId];
      return copy;
    });

    if (isSupabaseConfigured() && supabase) {
      supabase.channel('public:consultation_locks').send({
        type: 'broadcast',
        event: 'lock_changed',
        payload: { consultationId, agentName, action: 'unlock', timestamp: Date.now() },
      });
    }
  }, []);

  const fetchCustomers = useCallback(() => {
    customerRepository.getAllCustomers().then((data) => {
      if (data) setCustomers(data);
    });
  }, []);

  useEffect(() => {
    fetchCustomers();

    let customerChannel: any = null;
    let lockChannel: any = null;

    if (isSupabaseConfigured() && supabase) {
      customerChannel = supabase
        .channel('public:customers_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          fetchCustomers();
        })
        .subscribe();

      lockChannel = supabase
        .channel('public:consultation_locks')
        .on('broadcast', { event: 'lock_changed' }, ({ payload }) => {
          if (!payload) return;
          const { consultationId, agentName, action, timestamp } = payload;
          if (action === 'lock') {
            setActiveLocks((prev) => ({
              ...prev,
              [consultationId]: { agentName, lockedAt: timestamp || Date.now() },
            }));
          } else if (action === 'unlock') {
            setActiveLocks((prev) => {
              const copy = { ...prev };
              delete copy[consultationId];
              return copy;
            });
          }
        })
        .subscribe();
    }

    return () => {
      if (customerChannel && supabase) supabase.removeChannel(customerChannel);
      if (lockChannel && supabase) supabase.removeChannel(lockChannel);
    };
  }, [fetchCustomers]);

  useEffect(() => {
    const unsubscribe = consultationRepository.subscribeConsultationRealtime((updatedData) => {
      if (Array.isArray(updatedData)) {
        setConsultations(updatedData);
      }
    });

    return () => unsubscribe();
  }, []);

  const isExistingConsultation = useMemo(() => {
    return !!selectedConsultationId && consultations.some((c) => c.id === selectedConsultationId);
  }, [selectedConsultationId, consultations]);

  const handleSelectConsultation = async (consId: string) => {
    const targetCons = allConsultations.find((c) => c.id === consId);
    if (!targetCons) return;
    
    setSelectedConsultationId(consId);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    
    const matchCustomer = customers.find((cust) => cust.id === targetCons.customer_id);
    if (matchCustomer) {
      setSelectedCustomer(matchCustomer);
    } else {
      const dbCustomer = await customerRepository.getCustomerById(targetCons.customer_id);
      if (dbCustomer) {
        setSelectedCustomer(dbCustomer);
        setCustomers((prev) => [...prev, dbCustomer]);
      } else {
        setSelectedCustomer(prev => ({ ...prev, id: targetCons.customer_id || prev.id, phone_number: targetCons.phone_number || prev.phone_number, car_number: targetCons.car_number || prev.car_number }));
      }
    }
    
    setNotes(targetCons.summary || targetCons.consultation_notes || '');
    setIsForceNewConsultation(false);
  };

  const handleChangeAssignedAgent = async (agentName: string) => {
    if (!activeConsultation?.id) return;
    const targetCons = consultations.find((c) => c.id === activeConsultation.id);
    if (!targetCons) return;
    if (targetCons) {
      await consultationRepository.saveConsultation({
        ...targetCons,
        agent_name: agentName,
        updated_at: new Date().toISOString()
      });
    }
  };

  const handleTakeoverConsultation = async (consId: string) => {
    await consultationDomainService.takeoverConsultationToCurrentAgent(consId, currentAgentName);
    await agentTaskRepository.reassignTasksByConsultationId(consId, currentAgentName, currentAgentName, 'takeover');
    fetchTasks();
    setSelectedConsultationId(consId);
  };

  const handleSelectRecommendedParking = async (spot: ParkingSpot) => {
    if (activeConsultation?.id) {
      const updated = {
        ...activeConsultation,
        parking_name: spot.name,
        region: spot.region,
        updated_at: new Date().toISOString(),
      };
      await consultationRepository.saveConsultation(updated);
    }
    alert(`[추천 매물 적용] ${spot.name} 주차장이 본 상담건에 매핑되었습니다.`);
  };

  const handleToggleBlacklist = async (customerId: string, note?: string) => {
    await customerRepository.toggleBlacklist(customerId, note);
    const refreshed = await customerRepository.getAllCustomers();
    setCustomers(refreshed);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    // 1. 고객 원장 삭제
    await customerRepository.deleteCustomer(customerId);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));

    // 2. 연결된 상담건도 동시 정돈
    const relatedCons = consultations.filter((c) => c.customer_id === customerId);
    for (const c of relatedCons) {
      await consultationRepository.deleteConsultation(c.id);
    }
    setConsultations((prev) => prev.filter((c) => c.customer_id !== customerId));

    if (selectedCustomer.id === customerId) {
      handleResetForm();
    }
  };

  const handleDeleteConsultation = async (consId: string) => {
    await consultationRepository.deleteConsultation(consId);
    setConsultations((prev) => prev.filter((c) => c.id !== consId));

    if (selectedConsultationId === consId) {
      const remaining = consultations.filter((c) => c.id !== consId);
      if (remaining.length > 0) {
        setSelectedConsultationId(remaining[0].id);
      } else {
        handleResetForm();
      }
    }
  };

  const handleIncomingCall = (callerNumber: string) => {
    console.log('[CTI] 수신 전화:', callerNumber);
    const targetCons = consultations.find((c) => c.phone_number === callerNumber);
    if (targetCons) {
      handleSelectConsultation(targetCons.id);
    } else {
      const matchCust = customers.find((c) => c.phone_number === callerNumber);
      if (matchCust) {
        setSelectedCustomer(matchCust);
        setSelectedConsultationId(null);
      } else {
        const fresh = createFreshCustomer();
        fresh.phone_number = callerNumber;
        setSelectedCustomer(fresh);
        setSelectedConsultationId(null);
      }
    }
  };

  // 📦 90일 경과 완료건 필터링 계산
  const activeConsultations = useMemo(() => {
    if (showOlderArchive) return allConsultations;
    return allConsultations.filter((c) => !isOlderArchivedConsultation(c));
  }, [allConsultations, showOlderArchive]);

  const olderArchiveCount = useMemo(() => {
    return allConsultations.filter((c) => isOlderArchivedConsultation(c)).length;
  }, [allConsultations]);

  const toggleShowOlderArchive = useCallback(() => {
    setShowOlderArchive((prev) => !prev);
  }, []);

  return {
    customers,
    agents,
    templates,
    callLogs,
    consultations: activeConsultations,
    allConsultations,
    showOlderArchive,
    setShowOlderArchive,
    olderArchiveCount,
    toggleShowOlderArchive,
    activeLocks,
    acquireLock,
    releaseLock,
    tasks,
    parkingSpots,
    selectedCustomer,
    selectedConsultationId,
    notes,
    setNotes,
    activeConsultation,
    isExistingConsultation,
    matchingSuggestion,
    handleApplySuggestion,
    handleDismissSuggestion,
    handleUpdateCustomerField,
    handleSelectConsultation,
    handleResetForm,
    handleStartNewConsultation,
    handleSaveLog,
    handleChangeStatus,
    handleChangeSubStatus,
    handleChangeAssignedAgent,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
    handleReassignTask,
    handleEditTask,
    handleTakeoverConsultation,
    handleSelectRecommendedParking,
    handleAddAgent,
    handleSaveAgentProfile,
    handleRegisterNewAgent,
    handleToggleAgentStatus,
    handleUpdateAgentRole,
    handleDeleteAgent,
    handleAddTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleToggleBlacklist,
    handleDeleteConsultation,
    handleDeleteCustomer,
    handleIncomingCall,
  };
}

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
import { consultationDomainService } from '../../backend/services/consultation/consultationService';

import { INITIAL_PARKING_SPOTS } from '../../lib/constants';
import { isOlderArchivedConsultation, getResolvedStatus } from '../../lib/utils/consultationArchive';


export function useAppData(currentAgent: InternalAgent | null, currentAgentName: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<InternalAgent[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [parkingSpots] = useState<ParkingSpot[]>(INITIAL_PARKING_SPOTS);

  // 📦 Phase 1.5: 90일 경과 완료건 보관 이력 필터 토글 상태
  const [showOlderArchive, setShowOlderArchive] = useState<boolean>(false);

  const fetchAgents = useCallback(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from('internal_agents')
        .select('*')
        .then(({ data, error }) => {
          if (!error && data) {
            const agentList = data as InternalAgent[];
            if (currentAgent && !agentList.find(a => a.agent_name === currentAgent.agent_name)) {
              agentList.unshift(currentAgent);
            }
            setAgents(agentList);
          } else if (currentAgent) {
            setAgents([currentAgent]);
          } else {
            setAgents([]);
          }
        });
    }
  }, [currentAgent]);

  const fetchTasks = useCallback(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from('agent_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .then(async ({ data, error }) => {
          if (!error && data) {
            if (data.length === 0) {
              const defaultInitialTasks: AgentTask[] = [
                {
                  id: generateUUID(),
                  task_title: '강남역 주차장 차단기 원격개방 리마인더',
                  agent_name: '이현우',
                  is_completed: false,
                  created_at: new Date().toISOString(),
                  tag: '리마인더',
                  due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                },
                {
                  id: generateUUID(),
                  task_title: '홍길동 고객님 월주차 결제 링크 재발송 건',
                  agent_name: '이현우',
                  is_completed: false,
                  created_at: new Date(Date.now() - 3600000).toISOString(),
                  tag: '결제환불확인',
                  due_date: new Date().toISOString().split('T')[0],
                },
                {
                  id: generateUUID(),
                  task_title: '정기권 차량 등록 정보 오탈자 검수 완료',
                  agent_name: '이현우',
                  is_completed: true,
                  created_at: new Date(Date.now() - 7200000).toISOString(),
                  tag: '개인메모',
                },
              ];
              await supabase.from('agent_tasks').upsert(defaultInitialTasks);
              setTasks(defaultInitialTasks);
              localStorage.setItem('local_agent_tasks', JSON.stringify(defaultInitialTasks));
            } else {
              setTasks(data as AgentTask[]);
              localStorage.setItem('local_agent_tasks', JSON.stringify(data));
            }
          }
        });
    } else {
      const cachedTasks = localStorage.getItem('local_agent_tasks');
      if (cachedTasks) {
        try {
          setTasks(JSON.parse(cachedTasks));
        } catch (e) {
          console.error('로컬 Tasks 로드 에러:', e);
        }
      }
    }
  }, []);

  const fetchCustomers = useCallback(() => {
    customerRepository.getAllCustomers().then((data) => {
      if (data) setCustomers(data);
    });
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchTasks();
    fetchCustomers();

    let agentChannel: any = null;
    let taskChannel: any = null;
    let customerChannel: any = null;

    if (isSupabaseConfigured() && supabase) {
      agentChannel = supabase
        .channel('public:internal_agents_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_agents' }, () => {
          fetchAgents();
        })
        .subscribe();

      taskChannel = supabase
        .channel('public:agent_tasks_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, () => {
          fetchTasks();
        })
        .subscribe();

      customerChannel = supabase
        .channel('public:customers_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          fetchCustomers();
        })
        .subscribe();
    }

    return () => {
      if (agentChannel && supabase) supabase.removeChannel(agentChannel);
      if (taskChannel && supabase) supabase.removeChannel(taskChannel);
      if (customerChannel && supabase) supabase.removeChannel(customerChannel);
    };
  }, [fetchAgents, fetchTasks, fetchCustomers]);

  useEffect(() => {
    const unsubscribe = consultationRepository.subscribeConsultationRealtime((updatedData) => {
      if (Array.isArray(updatedData)) {
        setConsultations(updatedData);
      }
    });

    return () => unsubscribe();
  }, []);

  const createFreshCustomer = (): Customer => ({
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
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(createFreshCustomer);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isForceNewConsultation, setIsForceNewConsultation] = useState<boolean>(false);
  const [draftStatus, setDraftStatus] = useState<ConsultationStatus | null>(null);
  const [newConsultationId, setNewConsultationId] = useState<string>(generateUUID());
  
  // 입력 중 유사 내역 추천 상태 (입력창 자동 가로채기 방지)
  const [matchingSuggestion, setMatchingSuggestion] = useState<{
    customer: Customer;
    consultation?: Consultation;
  } | null>(null);

  const activeConsultation: Consultation = useMemo(() => {
    if (selectedConsultationId) {
      const found = consultations.find((c) => c.id === selectedConsultationId);
      if (found) return draftStatus ? { ...found, status: draftStatus } : found;
    }

    // 선택된 기존 상담 ID가 없을 때는 무조건 신규 드래프트(newConsultationId) 반환 (기존 상담 자동 덮어쓰기 방지)
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
  }, [selectedConsultationId, consultations, selectedCustomer, currentAgentName, notes, draftStatus, newConsultationId]);

  const isExistingConsultation = useMemo(() => {
    return !!selectedConsultationId && consultations.some((c) => c.id === selectedConsultationId);
  }, [selectedConsultationId, consultations]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 인풋 타이핑 시 자동 가로채기(Hijack) 방지: DB 매칭만 감지하고 추천 배지로 제공
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
        
        // 💡 삭제된 찌꺼기 데이터 검증: 활성 상태의 고객 또는 상담건이 실제로 남아있는 경우에만 추천
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

  // 추천된 기존 고객/상담 내역 명시적 수동 선택 적용
  const handleApplySuggestion = useCallback(() => {
    if (!matchingSuggestion) return;
    const { customer: matchCust, consultation: matchCons } = matchingSuggestion;
    setSelectedCustomer(matchCust);
    if (matchCons) {
      setSelectedConsultationId(matchCons.id);
      setNotes(matchCons.summary || '');
      setIsForceNewConsultation(false);
    } else {
      setSelectedConsultationId(null);
      setIsForceNewConsultation(true);
    }
    setMatchingSuggestion(null);
  }, [matchingSuggestion]);

  // 추천 배지 닫기 (동일 연락처의 신규 차량/추가 문의 접수: 연락처 유지, 차량/메모 초기화)
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

  const handleSelectConsultation = async (consId: string) => {
    const targetCons = consultations.find((c) => c.id === consId);
    if (!targetCons) return;
    
    setSelectedConsultationId(consId);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    
    // First try local state
    const matchCustomer = customers.find((cust) => cust.id === targetCons.customer_id);
    if (matchCustomer) {
      setSelectedCustomer(matchCustomer);
    } else {
      // If not in local state (e.g. newly created by someone else), fetch from DB
      const dbCustomer = await customerRepository.getCustomerById(targetCons.customer_id);
      if (dbCustomer) {
        setSelectedCustomer(dbCustomer);
        setCustomers((prev) => [...prev, dbCustomer]); // Cache it
      } else {
        // Fallback
        setSelectedCustomer(prev => ({ ...prev, id: targetCons.customer_id || prev.id, phone_number: targetCons.phone_number || prev.phone_number, car_number: targetCons.car_number || prev.car_number }));
      }
    }
    
    setNotes(targetCons.summary || '');
    setIsForceNewConsultation(false);
  };

  const handleResetForm = () => {
    setSelectedConsultationId(null);
    setSelectedCustomer(createFreshCustomer());
    setNotes('');
    setIsForceNewConsultation(false);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    setNewConsultationId(generateUUID());
  };
  
  // 신규 상담 작성 모드 전환 (동일 고객의 추가 차량/문의 접수용: 연락처 유지, 차량/메모 초기화)
  const handleStartNewConsultation = () => {
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
  };

  const handleSaveLog = async (updatedSummary: string, hopeDate?: string, extras?: Partial<Consultation>) => {
    let targetCustomer = { ...selectedCustomer };
    const phoneStr = (targetCustomer.phone_number || '').trim();
    const carStr = (targetCustomer.car_number || '').trim();

    if (phoneStr || carStr) {
      const match = await customerRepository.getCustomerByPhoneOrCar(phoneStr || carStr);
      if (match) {
        targetCustomer = { ...match, ...selectedCustomer, id: match.id };
      }
    }

    // 전화번호와 차량번호는 빈 값으로 두어 CustomerRepository가 직접 처리
    // '미입력' placeholder 사용 금지 - UNIQUE 충돌 발생 원인

    // phone/car 식별자가 있을 때만 고객 저장 시도 (없으면 Supabase 저장 불가)
    // saveCustomer는 Supabase 연동 시 기존 ID로 갱신된 customer를 반환
    const hasIdentifier = !!(phoneStr || carStr);
    const savedCustomer = await customerRepository.saveCustomer(targetCustomer);
    targetCustomer = savedCustomer; // Supabase에서 반환된 정확한 ID 사용

    // 식별자가 없었으면 Supabase에 고객이 저장되지 않았으므로
    // consultation.customer_id를 null로 처리하여 FK 위반 방지
    const finalCustomerId = hasIdentifier ? targetCustomer.id : null;


    // Update local customers state
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === targetCustomer.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = targetCustomer;
        return next;
      }
      return [targetCustomer, ...prev];
    });

    // 💡 신규 상담 모드(selectedConsultationId === null)일 때는 무조건 newConsultationId 신규 발급으로 저장
    const isEditingExisting = !!selectedConsultationId;
    const targetConsId = isEditingExisting ? selectedConsultationId : newConsultationId;

    const preservedAgentName = isEditingExisting ? (activeConsultation?.agent_name || currentAgentName) : currentAgentName;
    const matchedAgentObj = agents.find((a) => a.agent_name === preservedAgentName);
    const targetAgentId = matchedAgentObj?.id || currentAgent?.id || 'unassigned';

    const targetInquiryType = (extras?.inquiry_type || (activeConsultation && activeConsultation.inquiry_type) || '주차 문의').trim();
    const targetSubStatus = (extras?.sub_status || (activeConsultation && activeConsultation.sub_status) || '접수').trim();

    // Rule 5.1 준수: status 대분류는 무조건 sub_status 기준의 실효 상태로 연동/매핑
    const resolvedStatus = getResolvedStatus({
      status: '접수',
      sub_status: targetSubStatus,
    } as any);

    const newCons: Consultation = {
      id: targetConsId,
      customer_id: finalCustomerId, // 검증된 FK: 식별자 없으면 null로 FK 위반 방지
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


    // 저장 직후 로컬 리스트에 즉각 반영하여 Realtime 지연 현상 및 꼬임 차단
    const latestConsList = await consultationRepository.getConsultations();
    setConsultations(latestConsList);

    // 저장 완료 후 새로운 상담 ID 갱신 및 선택 모드로 전환
    setIsForceNewConsultation(false);
    setSelectedConsultationId(newCons.id);
    setDraftStatus(null);
    setMatchingSuggestion(null);
    setNewConsultationId(generateUUID());

    setSelectedConsultationId(targetConsId);
    setSelectedCustomer(targetCustomer);
  };

  const handleChangeStatus = async (status: ConsultationStatus, subStatus?: string) => {
    if (!activeConsultation?.id) return;
    
    setDraftStatus(status);
    
    const existingCons = consultations.find(c => c.id === activeConsultation.id);
    if (existingCons) {
      await consultationRepository.updateConsultationStatus(activeConsultation.id, status, subStatus);
      setDraftStatus(null);
    }
  };

  /**
   * 세부 프로세스 단계(sub_status) 개별 변경 핸들러
   * - sub_status 선택 시 대분류 status(접수 / 해결중 / 완료)를 자동으로 동기화하여 DB 저장
   * - ProcessStepper 컴포넌트에서 직접 호출됨
   */
  const handleChangeSubStatus = async (subStatus: string) => {
    if (!activeConsultation?.id) return;
    const existingCons = consultations.find(c => c.id === activeConsultation.id);
    if (!existingCons) return;

    let targetStatus: ConsultationStatus = existingCons.status;
    if (subStatus === '접수') {
      targetStatus = '접수';
    } else if (subStatus === '결제완료' || subStatus === '처리완료') {
      targetStatus = '완료';
    } else {
      // 공유자_부재, 결제메시지_전송, 부서확인중 등 중간 단계는 '해결중'으로 자동 동기화
      targetStatus = '해결중';
    }

    await consultationRepository.updateConsultationStatus(
      activeConsultation.id,
      targetStatus,
      subStatus
    );

    // 변경 완료 후 즉각 DB로부터 갱신된 내역을 로컬 캐시에 동기화
    const updatedList = await consultationRepository.getConsultations();
    setConsultations(updatedList);
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

  const handleAddTask = (
    input: string | { task_title: string; agent_name?: string; tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관'; due_date?: string; consultation_id?: string },
    dueDateParam?: string
  ) => {
    let newTask: AgentTask;
    if (typeof input === 'string') {
      newTask = {
        id: generateUUID(),
        consultation_id: activeConsultation?.id,
        created_by: currentAgentName,
        agent_name: currentAgentName,
        task_title: input,
        tag: '개인메모',
        due_date: dueDateParam || undefined,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
    } else {
      newTask = {
        id: generateUUID(),
        consultation_id: input.consultation_id || activeConsultation?.id,
        created_by: currentAgentName,
        agent_name: input.agent_name || currentAgentName,
        task_title: input.task_title,
        tag: input.tag || '개인메모',
        due_date: input.due_date || undefined,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
    }

    if (isSupabaseConfigured() && supabase) {
      supabase.from('agent_tasks').upsert([newTask]).then(({ error }) => {
        if (error) console.error('[handleAddTask] Supabase DB 오류:', error.message);
      });
    }

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      localStorage.setItem('local_agent_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target && isSupabaseConfigured() && supabase) {
      supabase.from('agent_tasks').update({ is_completed: !target.is_completed }).eq('id', taskId).then();
    }

    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, is_completed: !t.is_completed } : t));
      localStorage.setItem('local_agent_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (isSupabaseConfigured() && supabase) {
      supabase.from('agent_tasks').delete().eq('id', taskId).then();
    }

    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      localStorage.setItem('local_agent_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleReassignTask = (taskId: string, newAgentName: string) => {
    if (isSupabaseConfigured() && supabase) {
      supabase.from('agent_tasks').update({ agent_name: newAgentName }).eq('id', taskId).then();
    }

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, agent_name: newAgentName } : t
      );
      localStorage.setItem('local_agent_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleEditTask = (
    taskId: string,
    updatedInput: {
      task_title: string;
      agent_name?: string;
      tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관';
      due_date?: string;
    }
  ) => {
    if (isSupabaseConfigured() && supabase) {
      supabase.from('agent_tasks').update({
        task_title: updatedInput.task_title,
        agent_name: updatedInput.agent_name,
        tag: updatedInput.tag,
        due_date: updatedInput.due_date,
      }).eq('id', taskId).then();
    }

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              task_title: updatedInput.task_title,
              agent_name: updatedInput.agent_name || t.agent_name,
              tag: updatedInput.tag || t.tag,
              due_date: updatedInput.due_date || undefined,
            }
          : t
      );
      localStorage.setItem('local_agent_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleTakeoverConsultation = async (consId: string) => {
    await consultationDomainService.takeoverConsultationToCurrentAgent(consId, currentAgentName);
    setTasks((prev) =>
      prev.map((t) => (t.consultation_id === consId ? { ...t, agent_name: currentAgentName } : t))
    );
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

  const handleAddAgent = async (agentData: any) => {
    // Moved to supabase auth
  };

  const handleSaveAgentProfile = async (agentData: Partial<InternalAgent>) => {
    if (!currentAgent) return;
    const updatedAgent: InternalAgent = {
      ...currentAgent,
      ...agentData,
    };

    // 1. 로컬스토리지 즉각 갱신 (페이지 새로고침 시 100% 지속 보장)
    if (updatedAgent.id) {
      localStorage.setItem(`zms_agent_profile_${updatedAgent.id}`, JSON.stringify(updatedAgent));
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        // 2. Supabase Auth 사용자 메타데이터 즉각 업데이트
        await supabase.auth.updateUser({
          data: {
            agent_name: updatedAgent.agent_name,
            team_name: updatedAgent.team_name,
            extension_number: updatedAgent.extension_number,
            phone_number: updatedAgent.phone_number,
          },
        });

        // 3. internal_agents 마스터 DB 테이블 영구 저장
        const { error } = await supabase
          .from('internal_agents')
          .upsert([{
            id: updatedAgent.id,
            email: (updatedAgent.email || '').toLowerCase().trim(),
            agent_name: updatedAgent.agent_name,
            team_name: updatedAgent.team_name || 'CS 1팀',
            extension_number: updatedAgent.extension_number || '',
            phone_number: updatedAgent.phone_number || '',
            role: updatedAgent.role || 'AGENT',
            agent_status: updatedAgent.agent_status || '활성화',
          }]);
        if (error) {
          console.error('[saveAgentProfile] Supabase 오류:', error.message);
        }

        // 4. 프로필 이름 변경 시 과거 작성했던 기존 상담 이력 및 TODO 업무의 agent_name/created_by도 일괄 즉시 일치화
        if (currentAgent.agent_name && currentAgent.agent_name !== updatedAgent.agent_name) {
          await supabase
            .from('consultations')
            .update({ agent_name: updatedAgent.agent_name })
            .eq('agent_name', currentAgent.agent_name);

          try {
            await supabase
              .from('agent_tasks')
              .update({ agent_name: updatedAgent.agent_name })
              .eq('agent_name', currentAgent.agent_name);
          } catch (e) {}
          
          setConsultations((prev) =>
            prev.map((c) => (c.agent_name === currentAgent.agent_name || c.agent_name === 'hwlee7167' ? { ...c, agent_name: updatedAgent.agent_name } : c))
          );

          setTasks((prev) => {
            const updated = prev.map((t) => {
              const matchesName = t.agent_name === currentAgent.agent_name || t.agent_name === 'hwlee7167';
              const matchesCreated = t.created_by === currentAgent.agent_name || t.created_by === 'hwlee7167';
              if (matchesName || matchesCreated) {
                return {
                  ...t,
                  agent_name: matchesName ? updatedAgent.agent_name : t.agent_name,
                  created_by: matchesCreated ? updatedAgent.agent_name : t.created_by,
                };
              }
              return t;
            });
            localStorage.setItem('local_agent_tasks', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (e) {
        console.error('[saveAgentProfile] Supabase 예외:', e);
      }
    }

    setAgents((prev) =>
      prev.map((a) => (a.id === updatedAgent.id || a.agent_name === currentAgent.agent_name ? updatedAgent : a))
    );
  };

  const handleRegisterNewAgent = async (newAgentData: {
    email: string;
    agent_name: string;
    team_name?: string;
    extension_number?: string;
    phone_number?: string;
    role?: 'AGENT' | 'LEADER' | 'ADMIN';
    password_hash?: string;
  }) => {
    let createdAgentId = generateUUID();
    const targetEmail = (newAgentData.email || '').toLowerCase().trim();
    const cleanAgentName = newAgentData.agent_name.trim();

    if (isSupabaseConfigured() && supabase) {
      // 1. 기존 DB에 동일 이메일/이름이 있는지 먼저 확인하여 ID 유지
      const { data: existingAgent } = await supabase
        .from('internal_agents')
        .select('*')
        .or(`email.eq.${targetEmail},agent_name.eq.${cleanAgentName}`)
        .maybeSingle();

      if (existingAgent) {
        createdAgentId = existingAgent.id;
      }

      // 2. internal_agents 마스터 DB에 무조건 최우선 저장하여 상담사 명단 표출 보장
      const newAgent: InternalAgent = {
        id: createdAgentId,
        email: targetEmail,
        agent_name: cleanAgentName,
        team_name: newAgentData.team_name || 'CS 1팀',
        extension_number: newAgentData.extension_number || '',
        phone_number: newAgentData.phone_number || '',
        role: newAgentData.role || 'AGENT',
        agent_status: '활성화',
        created_at: existingAgent?.created_at || new Date().toISOString(),
      };

      const { error: dbError } = await supabase.from('internal_agents').upsert([newAgent]);
      if (dbError) {
        console.error('[registerNewAgent] Supabase DB 오류:', dbError.message);
        throw new Error(`상담원 DB 저장 실패: ${dbError.message}`);
      }

      // 3. Supabase Auth 가입 연동 (실패하거나 이메일 컨펌 대기중이어도 DB 저장은 유지)
      try {
        const { data: authData } = await supabase.auth.signUp({
          email: targetEmail,
          password: newAgentData.password_hash || '12341234',
          options: {
            data: {
              agent_name: cleanAgentName,
              team_name: newAgentData.team_name || 'CS 1팀',
              extension_number: newAgentData.extension_number || '',
              phone_number: newAgentData.phone_number || '',
              role: newAgentData.role || 'AGENT',
            },
          },
        });

        if (authData?.user) {
          // Auth user ID와 DB user ID 동기화
          await supabase.from('internal_agents').update({ id: authData.user.id }).eq('email', targetEmail);
          newAgent.id = authData.user.id;
        }
      } catch (authException: any) {
        console.warn('[registerNewAgent] Supabase Auth signUp 경고 (DB 저장은 보장됨):', authException?.message);
      }

      setAgents((prev) => {
        const exists = prev.some((a) => a.id === newAgent.id || a.email === newAgent.email || a.agent_name === newAgent.agent_name);
        return exists ? prev.map((a) => (a.email === newAgent.email || a.agent_name === newAgent.agent_name ? newAgent : a)) : [...prev, newAgent];
      });

      fetchAgents();
      return newAgent;
    }

    const fallbackAgent: InternalAgent = {
      id: createdAgentId,
      email: targetEmail,
      agent_name: cleanAgentName,
      team_name: newAgentData.team_name || 'CS 1팀',
      extension_number: newAgentData.extension_number || '',
      phone_number: newAgentData.phone_number || '',
      role: newAgentData.role || 'AGENT',
      agent_status: '활성화',
      created_at: new Date().toISOString(),
    };
    setAgents((prev) => [...prev, fallbackAgent]);
    return fallbackAgent;
  };

  const handleToggleAgentStatus = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, agent_status: a.agent_status === '활성화' ? '비활성화' : ('활성화' as const) }
          : a
      )
    );
  };

  const handleUpdateAgentRole = async (agentId: string, newRole: 'AGENT' | 'LEADER' | 'ADMIN') => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('internal_agents')
          .update({ role: newRole })
          .eq('id', agentId);
        if (error) {
          console.error('[updateAgentRole] Supabase 오류:', error.message);
        }
      } catch (e) {
        console.error('[updateAgentRole] Supabase 예외:', e);
      }
    }
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, role: newRole } : a))
    );
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('internal_agents').delete().eq('id', agentId);
      if (!error) {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        console.error('[deleteAgent] 실패:', error.message);
      }
    }
  };

  const handleAddTemplate = (title: string, content: string, createdBy: string) => {
    const newTmpl: SavedTemplate = {
      id: `tmpl-${Date.now()}`,
      template_title: title,
      content,
      created_by: createdBy,
    };
    setTemplates((prev) => {
      const next = [...prev, newTmpl];
      localStorage.setItem('local_saved_templates', JSON.stringify(next));
      return next;
    });
  };

  const handleEditTemplate = (templateId: string, title: string, content: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) => (t.id === templateId ? { ...t, template_title: title, content } : t));
      localStorage.setItem('local_saved_templates', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== templateId);
      localStorage.setItem('local_saved_templates', JSON.stringify(next));
      return next;
    });
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
  const allConsultations = consultations;

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

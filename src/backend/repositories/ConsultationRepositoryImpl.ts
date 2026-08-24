/**
 * ZMS CS Helper - 중앙 마스터 상담 데이터베이스 리포지토리 구현체
 *
 * [Supabase 연동 버전]
 * - saveConsultation() 시 Supabase consultations 테이블에 upsert
 * - getConsultations() 시 Supabase에서 먼저 fetch, 실패 시 localStorage 폴백
 * - deleteConsultation() 시 Supabase에서도 삭제
 * - subscribeConsultations() 는 메모리 내 subscriber 패턴 유지 (Realtime은 추후 적용)
 */

import { Consultation } from '../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { generateUUID } from '../../lib/utils/uuid';
import { getResolvedStatus } from '../../lib/utils/consultationArchive';

export interface ConsultationRepository {
  getConsultations(): Promise<Consultation[]>;
  getConsultationById(id: string): Promise<Consultation | null>;
  saveConsultation(consultation: Consultation): Promise<Consultation>;
  deleteConsultation(id: string): Promise<void>;
  updateConsultationStatus(id: string, status: any, subStatus?: string): Promise<void>;
  updateAssignedAgent(id: string, agentName: string): Promise<void>;
  subscribeConsultations(callback: (consultations: Consultation[]) => void): () => void;
  subscribeConsultationRealtime(callback: (consultations: Consultation[]) => void): () => void;
}

export class ConsultationRepositoryImpl implements ConsultationRepository {
  private readonly STORAGE_KEY = 'zms_cs_master_v3_db';
  private subscribers: Array<(consultations: Consultation[]) => void> = [];
  // 메모리 캐시: 최신 상태 유지
  private cache: Consultation[] = [];

  constructor() {
    this.loadInitial();
  }

  /**
   * 초기 데이터 로드: Supabase 우선, 실패 시 localStorage 폴백
   */
  private async loadInitial(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.cache = (data as Consultation[]).map((c) => ({
            ...c,
            status: getResolvedStatus(c),
          }));
          // localStorage도 동기화
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
          this.notifySubscribers(this.cache);
          return;
        }
      } catch (e) {
        console.warn('[ConsultationRepo] Supabase 초기 로드 실패, localStorage 폴백:', e);
      }
    }

    // localStorage 폴백
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this.cache = JSON.parse(raw);
      } catch {
        this.cache = [];
      }
    } else {
      this.cache = [];
    }
    this.notifySubscribers(this.cache);
  }

  private notifySubscribers(consultations: Consultation[]): void {
    this.subscribers.forEach((cb) => cb(consultations));
  }

  async getConsultations(): Promise<Consultation[]> {
    // Supabase에서 실시간 재조회
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.cache = (data as Consultation[]).map((c) => ({
            ...c,
            status: getResolvedStatus(c),
          }));
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
          return this.cache;
        }
      } catch (e) {
        console.warn('[ConsultationRepo] getConsultations 폴백:', e);
      }
    }
    return this.cache;
  }

  async getConsultationById(id: string): Promise<Consultation | null> {
    return this.cache.find((c) => c.id === id) || null;
  }

  /**
   * 상담 저장 - Supabase에 upsert하고 로컬 캐시/localStorage도 업데이트
   */
  async saveConsultation(consultation: Consultation): Promise<Consultation> {
    const now = new Date().toISOString();
    const normalizedSubStatus = (consultation.sub_status || '').trim() || '접수';
    const normalizedInquiryType = (consultation.inquiry_type || '').trim() || '주차 문의';
    
    const preparedCons: Consultation = {
      ...consultation,
      sub_status: normalizedSubStatus,
      inquiry_type: normalizedInquiryType,
    };
    
    const resolvedStatus = getResolvedStatus(preparedCons);
    const toSave: Consultation = {
      ...preparedCons,
      status: resolvedStatus || '접수',
      updated_at: now,
      created_at: consultation.created_at || now,
    };

    // 1. Supabase upsert
    if (isSupabaseConfigured() && supabase) {
      try {
        // customer_id FK 무결성 검증:
        // Supabase customers 테이블에 실제로 존재하는 ID만 사용
        // 존재하지 않으면 null로 대체하여 FK 제약 위반 방지
        let verifiedCustomerId: string | null = toSave.customer_id || null;
        if (verifiedCustomerId) {
          const { data: custCheck, error: custErr } = await supabase
            .from('customers')
            .select('id')
            .eq('id', verifiedCustomerId)
            .maybeSingle();

          if (custErr || !custCheck) {
            console.warn(
              '[ConsultationRepo] customer_id가 DB에 없어 null로 대체:',
              verifiedCustomerId,
              custErr?.message
            );
            verifiedCustomerId = null;
          }
        }

        // consultations 테이블 스키마에 존재하는 컬럼만 upsert
        // (없는 컬럼을 포함하면 PostgREST 400 오류 발생)
        const { error } = await supabase.from('consultations').upsert(
          [{
            id: toSave.id,
            customer_id: verifiedCustomerId,  // 검증된 FK 값 사용
            call_log_id: toSave.call_log_id || null,
            user_type: toSave.user_type || '사용자',
            parking_type: toSave.parking_type || '월주차',
            parking_name: toSave.parking_name || null,
            product_number: (toSave as any).product_number || null,
            region: toSave.region || null,
            hope_date: toSave.hope_date || null,
            inquiry_type: toSave.inquiry_type,
            status: toSave.status,
            sub_status: toSave.sub_status,
            agent_name: toSave.agent_name || null,
            summary: toSave.summary || '',
            owner_phone: toSave.owner_phone || null,
            user_phone: toSave.user_phone || null,
            parking_start_date: toSave.parking_start_date || null,
            created_at: toSave.created_at,
            updated_at: toSave.updated_at,
            // 주의: agent_id, car_number, phone_number, is_archived 컬럼은
            // consultations 테이블에 없으므로 절대 포함하지 않음
          }],
          { onConflict: 'id' }
        );

        if (error) {
          console.error('[ConsultationRepo] Supabase upsert 오류:', JSON.stringify(error));
        } else {
          console.log('[ConsultationRepo] Supabase 저장 성공:', toSave.id, '/ customer_id:', verifiedCustomerId);
        }
      } catch (e) {
        console.error('[ConsultationRepo] Supabase upsert 예외:', e);
      }
    }


    // 2. 로컬 캐시 업데이트
    const idx = this.cache.findIndex((c) => c.id === toSave.id);
    if (idx >= 0) {
      this.cache = [...this.cache];
      this.cache[idx] = toSave;
    } else {
      this.cache = [toSave, ...this.cache];
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    this.notifySubscribers(this.cache);
    return toSave;
  }

  /**
   * 상담 삭제 - Supabase와 로컬 캐시 모두 삭제
   */
  async deleteConsultation(id: string): Promise<void> {
    // 1. Supabase 삭제
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('consultations').delete().eq('id', id);
        if (error) {
          console.error('[ConsultationRepo] Supabase 삭제 오류:', error.message);
        }
      } catch (e) {
        console.error('[ConsultationRepo] Supabase 삭제 예외:', e);
      }
    }

    // 2. 로컬 캐시 제거
    this.cache = this.cache.filter((c) => c.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    this.notifySubscribers(this.cache);
  }

  async updateConsultationStatus(id: string, status: any, subStatus?: string): Promise<void> {
    const item = this.cache.find((c) => c.id === id);
    if (item) {
      await this.saveConsultation({
        ...item,
        status,
        sub_status: subStatus || item.sub_status,
        updated_at: new Date().toISOString(),
      });
    }
  }

  async updateAssignedAgent(id: string, agentName: string): Promise<void> {
    const item = this.cache.find((c) => c.id === id);
    if (item) {
      await this.saveConsultation({
        ...item,
        agent_name: agentName,
        updated_at: new Date().toISOString(),
      });
    }
  }

  subscribeConsultations(callback: (consultations: Consultation[]) => void): () => void {
    this.subscribers.push(callback);
    // 즉시 현재 캐시 전달
    if (this.cache.length > 0) {
      callback(this.cache);
    }

    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  // Supabase Realtime 연동 메서드
  subscribeConsultationRealtime(callback: (consultations: Consultation[]) => void): () => void {
    // 1. 메모리 기반 로컬 구독 (즉각 반영용)
    const unsubLocal = this.subscribeConsultations(callback);

    // 2. Supabase가 연동된 경우 웹소켓 채널 구독
    if (isSupabaseConfigured() && supabase) {
      const channel = supabase
        .channel('public:consultations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'consultations' },
          async (payload) => {
            console.log('[ConsultationRepo] 실시간 변경 감지:', payload.eventType);
            // 전체 데이터를 다시 불러오거나 변경된 항목만 패치
            // 안전성을 위해 전체 리로드를 수행하여 캐시 갱신
            const updated = await this.getConsultations();
            this.notifySubscribers(updated);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[ConsultationRepo] Supabase Realtime 구독 완료');
          }
        });

      return () => {
        unsubLocal();
        supabase.removeChannel(channel);
      };
    }

    return unsubLocal;
  }

  // 강제 초기화
  public async initStorage(forceReset = false): Promise<void> {
    if (forceReset) {
      if (isSupabaseConfigured() && supabase) {
        try {
          // 1. Get all IDs first to avoid PostgREST bulk delete restrictions
          const { data: existingRows } = await supabase.from('consultations').select('id');
          if (existingRows && existingRows.length > 0) {
            const ids = existingRows.map((r: any) => r.id);
            // 2. Delete them using IN clause
            const { error: delErr } = await supabase.from('consultations').delete().in('id', ids);
            if (delErr) {
              console.error('[ConsultationRepo] Bulk delete failed', delErr);
            }
          }

          // Removed mock data insertion as mockData is deleted
        } catch (e) {
          console.error('Reset failed', e);
        }
      }
      localStorage.removeItem(this.STORAGE_KEY);
      this.cache = [];
      this.notifySubscribers(this.cache);
    } else {
      this.loadInitial();
    }
  }
}

export const consultationRepository = new ConsultationRepositoryImpl();

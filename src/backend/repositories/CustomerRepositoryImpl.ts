/**
 * ZMS CS Helper - 고객 원장 리포지토리 구현체
 *
 * [Supabase 연동 버전]
 * - saveCustomer(): phone_number 또는 car_number가 있을 때만 Supabase upsert
 * - getAllCustomers(): Supabase에서 먼저 fetch, 실패 시 localStorage 폴백
 */

import { ICustomerRepository } from './ICustomerRepository';
import { Customer } from '../types';
import { CLOUD_DB_CONFIG } from '../config/cloudDbConfig';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { generateUUID } from '../../lib/utils/uuid';

export class CustomerRepositoryImpl implements ICustomerRepository {
  private storageKey = CLOUD_DB_CONFIG.storage_keys.CUSTOMERS;
  private cache: Customer[] = [];

  constructor() {
    this.loadInitial();
  }

  private async loadInitial(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.cache = data as Customer[];
          localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
          return;
        }
      } catch (e) {
        console.warn('[CustomerRepo] Supabase 초기 로드 실패, localStorage 폴백:', e);
      }
    }

    const saved = localStorage.getItem(this.storageKey);
    this.cache = saved ? JSON.parse(saved) : [];
  }

  private getLocalCustomers(): Customer[] {
    return this.cache;
  }

  private setLocalCustomers(data: Customer[]): void {
    this.cache = data;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[CustomerRepository] LocalStorage 저장 실패:', e);
    }
  }

  async getAllCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          this.cache = data as Customer[];
          localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
          return this.cache;
        }
      } catch (e) {
        console.warn('[CustomerRepo] getAllCustomers 폴백:', e);
      }
    }
    return this.getLocalCustomers();
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return this.cache.find((c) => c.id === id) || null;
  }

  async getCustomerByPhoneOrCar(query: string): Promise<Customer | null> {
    const cleanQuery = query.replace(/[^0-9a-zA-Z가-힣]/g, '').toUpperCase();
    if (!cleanQuery) return null;

    // 먼저 로컬 캐시에서 탐색
    const local = this.cache.find((c) => {
      const cPhone = (c.phone_number || '').replace(/[^0-9]/g, '');
      const cCar = (c.car_number || '').replace(/\s+/g, '').toUpperCase();
      return cPhone.includes(cleanQuery) || cCar.includes(cleanQuery);
    });

    if (local) return local;

    // Supabase에서 재조회
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .or(`phone_number.ilike.%${cleanQuery}%,car_number.ilike.%${cleanQuery}%`)
          .limit(1);

        if (data && data.length > 0) return data[0] as Customer;
      } catch (e) {
        console.warn('[CustomerRepo] 조회 폴백:', e);
      }
    }

    return null;
  }

  /**
   * 고객 원장 저장
   * - phone_number OR car_number 중 하나라도 있어야 Supabase에 저장
   * - 둘 다 없으면 로컬 캐시에만 임시 저장
   */
  async saveCustomer(customer: Customer): Promise<Customer> {
    const rawPhone = (customer.phone_number || '').trim();
    const rawCar = (customer.car_number || '').trim();
    const hasPhone = Boolean(rawPhone);
    const hasCar = Boolean(rawCar);

    // 로컬 캐시 업데이트
    const idx = this.cache.findIndex((c) => c.id === customer.id);
    if (idx !== -1) {
      this.setLocalCustomers(this.cache.map((c, i) => (i === idx ? customer : c)));
    } else {
      this.setLocalCustomers([customer, ...this.cache]);
    }

    // 전화번호와 차량번호 둘 다 없으면 Supabase에 저장하지 않음
    // (NOT NULL + UNIQUE 제약으로 인해 저장 불가능)
    if (!hasPhone && !hasCar) {
      console.warn('[CustomerRepo] phone_number/car_number 모두 없어 Supabase 저장 건너뜀:', customer.id);
      return customer;
    }

    if (!isSupabaseConfigured() || !supabase) return customer;

    try {
      // 둘 중 하나가 없으면 UUID 기반 고유 placeholder 사용 (UNIQUE 충돌 방지)
      const uniqueSuffix = customer.id.slice(0, 8);
      const finalPhone = rawPhone || `no-phone-${uniqueSuffix}`;
      const finalCar = rawCar || `no-car-${uniqueSuffix}`;

      // 1. 기존 DB에 같은 phone_number 또는 car_number가 다른 ID로 존재하는지 확인
      //    존재하면 해당 기존 ID를 사용하여 중복 row 생성을 방지
      let resolvedId = customer.id;

      if (hasPhone) {
        const { data: existingPhone } = await supabase
          .from('customers')
          .select('id')
          .eq('phone_number', finalPhone)
          .neq('id', resolvedId)
          .maybeSingle();

        if (existingPhone) {
          resolvedId = existingPhone.id;
          customer.id = resolvedId; // 호출자에게 올바른 ID 반환
        }
      }

      if (!hasPhone && hasCar) {
        const { data: existingCar } = await supabase
          .from('customers')
          .select('id')
          .eq('car_number', finalCar)
          .neq('id', resolvedId)
          .maybeSingle();

        if (existingCar) {
          resolvedId = existingCar.id;
          customer.id = resolvedId;
        }
      }

      const toSave = {
        id: resolvedId,
        phone_number: finalPhone,
        car_number: finalCar,
        car_type: customer.car_type || null,
        car_detail: customer.car_detail || null,
        bank_name: customer.bank_name || null,
        account_number: customer.account_number || null,
        account_holder: customer.account_holder || null,
        is_blacklist: customer.is_blacklist ?? false,
        special_note: customer.special_note || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('customers')
        .upsert([toSave], { onConflict: 'id' });

      if (error) {
        console.error('[CustomerRepo] Supabase 저장 오류 상세:', JSON.stringify(error));
      } else {
        console.log('[CustomerRepo] Supabase 저장 성공:', finalPhone, '/', finalCar);
      }
    } catch (e) {
      console.error('[CustomerRepo] Supabase 저장 예외:', e);
    }

    return customer;
  }

  async toggleBlacklist(customerId: string, note?: string): Promise<boolean> {
    const target = this.cache.find((c) => c.id === customerId);
    if (!target) return false;

    const updatedCustomer: Customer = {
      ...target,
      is_blacklist: !target.is_blacklist,
      special_note: note || target.special_note || '블랙리스트 상태 변경됨',
      updated_at: new Date().toISOString(),
    };

    await this.saveCustomer(updatedCustomer);
    return true;
  }

  async deleteCustomer(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) {
          console.error('[CustomerRepo] Supabase 삭제 오류:', error.message);
        }
      } catch (e) {
        console.error('[CustomerRepo] Supabase 삭제 예외:', e);
      }
    }
    this.cache = this.cache.filter((c) => c.id !== id);
    this.setLocalCustomers(this.cache);
  }

  // 강제 초기화
  public async initStorage(forceReset = false): Promise<void> {
    if (forceReset) {
      if (isSupabaseConfigured() && supabase) {
        try {
          // 1. Get all IDs first
          const { data: existingRows } = await supabase.from('customers').select('id');
          if (existingRows && existingRows.length > 0) {
            const ids = existingRows.map((r: any) => r.id);
            // 2. Delete them using IN clause
            await supabase.from('customers').delete().in('id', ids);
          }

          // Removed mock data insertion
        } catch (e) {
          console.error('[CustomerRepo] Reset failed', e);
        }
      }
      localStorage.removeItem(this.storageKey);
      this.cache = [];
    } else {
      this.loadInitial();
    }
  }
}

export const customerRepository = new CustomerRepositoryImpl();

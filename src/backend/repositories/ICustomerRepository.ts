/**
 * ZMS CS Helper - 고객 원장 데이터 접근 리포지토리 인터페이스
 */

import { Customer } from '../types';

export interface ICustomerRepository {
  getAllCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | null>;
  getCustomerByPhoneOrCar(query: string): Promise<Customer | null>;
  saveCustomer(customer: Customer): Promise<Customer>;
  toggleBlacklist(customerId: string, note?: string): Promise<boolean>;
}

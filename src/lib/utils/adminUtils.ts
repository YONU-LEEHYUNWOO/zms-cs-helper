/**
 * ZMS CS Helper - 상담원 어드민 권한 검증 유틸리티 (adminUtils)
 * 
 * [역할]
 * - 로그인된 상담사 계정의 최고 관리자(ADMIN) 권한 보유 여부를 판별합니다.
 * - 데이터 마스터 관리자 및 어드민 패널 접근 가드로 활용됩니다.
 */

import { InternalAgent } from '../../backend/types';

/**
 * 해당 상담원 계정이 최고 관리자(ADMIN) 권한인지 확인
 */
export function isAdminAgent(agent: InternalAgent | null | undefined): boolean {
  if (!agent) return false;
  // 1. role 속성이 'ADMIN'인 경우
  if (agent.role === 'ADMIN') return true;
  // 2. 마스터 관리자 계정 이름 폴백 검증
  const cleanName = (agent.agent_name || '').trim();
  return cleanName === '관리자' || cleanName === '이현우' || cleanName.toLowerCase() === 'admin';
}

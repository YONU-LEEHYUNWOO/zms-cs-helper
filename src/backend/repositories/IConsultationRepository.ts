/**
 * ZMS CS Helper - 상담 데이터 접근 리포지토리 인터페이스
 * 
 * [서비스-리포지토리 패턴]
 * 개인 계정별 데이터 격리, 단일 중앙 DB 공유 검색, 
 * 상담사 계정간 실시간 이수관(Transfer/Takeover) 및 Realtime 리스너를 정의합니다.
 */

import { Consultation, ConsultationStatus } from '../types';

export interface IConsultationRepository {
  /**
   * 전체 중앙 DB 상담 마스터 목록 조회
   */
  getAllConsultations(): Promise<Consultation[]>;

  /**
   * 특정 상담 ID로 조회
   */
  getConsultationById(id: string): Promise<Consultation | null>;

  /**
   * 특정 상담원 계정 전용 상담 목록 조회 (개인 계정 뷰)
   */
  getConsultationsByAgent(agentName: string): Promise<Consultation[]>;

  /**
   * 중앙 DB 통합 검색 (전 상담원의 상담 이력 및 정보 공유 탐색)
   */
  searchAllMasterConsultations(query: string): Promise<Consultation[]>;

  /**
   * 상담 데이터 신규 저장 또는 업데이트 (중앙 DB Upsert)
   */
  saveConsultation(consultation: Consultation): Promise<Consultation>;

  /**
   * 상담사 계정간 소유권 변경 (이관/넘기기 및 가져오기/받아보기)
   */
  updateAssignedAgent(consultationId: string, newAgentName: string): Promise<boolean>;

  /**
   * 상담건 처리 상태 업데이트
   */
  updateConsultationStatus(
    consultationId: string,
    status: ConsultationStatus,
    subStatus?: string
  ): Promise<boolean>;

  /**
   * 중앙 DB Realtime 실시간 변경 감지 리스너 구독 (이수관 실시간 전파)
   */
  subscribeConsultationRealtime(callback: (consultations: Consultation[]) => void): () => void;
}

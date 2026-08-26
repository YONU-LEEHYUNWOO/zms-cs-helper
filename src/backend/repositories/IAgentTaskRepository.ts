/**
 * ZMS CS Helper - 업무 & TODO 리포지토리 인터페이스 (IAgentTaskRepository)
 *
 * [역할]
 * - 사내 다중 상담원 간 실시간 TODO 및 업무 이관 데이터 접근 및 영속화
 * - Supabase DB 연동 및 FK 무결성 검증, 2차 폴백 저장
 */

import { AgentTask } from '../types';

export interface IAgentTaskRepository {
  /**
   * 전체 TODO 마스터 목록 조회 (Supabase DB 우선, 로컬 폴백)
   */
  getAllTasks(): Promise<AgentTask[]>;

  /**
   * 특정 ID로 TODO 조회
   */
  getTaskById(id: string): Promise<AgentTask | null>;

  /**
   * TODO 신규 저장 / 업데이트 (Supabase DB Upsert + FK 검증)
   */
  saveTask(task: AgentTask): Promise<AgentTask>;

  /**
   * TODO 삭제
   */
  deleteTask(id: string): Promise<boolean>;

  /**
   * TODO 담당 상담사 변경 (업무 이관 연쇄 히스토리 기록)
   */
  reassignTask(taskId: string, newAgentName: string, operatorAgentName?: string): Promise<boolean>;

  /**
   * 상담건 이관 시 연관 TODO 담당자 일괄 변경 (연쇄 히스토리 기록)
   */
  reassignTasksByConsultationId(consultationId: string, newAgentName: string, operatorAgentName?: string): Promise<boolean>;

  /**
   * 실시간 변경 구독 설정
   */
  subscribeRealtime(callback: (tasks: AgentTask[]) => void): () => void;
}

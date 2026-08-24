/**
 * ZMS CS Helper - 상담 도메인 비즈니스 서비스
 * 
 * [설명] 상담사 계정간 상담건 및 일감 넘기기(Transfer), 받아보기/가져오기(Takeover)
 * 비즈니스 규칙을 처리하며 중앙 DB와 리포지토리를 연동합니다.
 */

import { Consultation, ConsultationStatus } from '../../types';
import { consultationRepository } from '../../repositories/ConsultationRepositoryImpl';

export class ConsultationDomainService {
  async updateConsultationStatus(id: string, status: ConsultationStatus): Promise<boolean> {
    const list = await consultationRepository.getConsultations();
    const item = list.find((c) => c.id === id);
    if (item) {
      await consultationRepository.saveConsultation({
        ...item,
        status,
        updated_at: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  async updateAssignedAgent(id: string, agentName: string): Promise<boolean> {
    const list = await consultationRepository.getConsultations();
    const item = list.find((c) => c.id === id);
    if (item) {
      await consultationRepository.saveConsultation({
        ...item,
        agent_name: agentName,
        updated_at: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * 다른 상담원의 상담건 및 일감을 내 계정으로 받아오기 (Takeover / Claim)
   */
  async takeoverConsultationToCurrentAgent(
    consultationId: string,
    currentAgentName: string
  ): Promise<boolean> {
    if (!consultationId || !currentAgentName) return false;

    // 리포지토리를 통해 중앙 DB의 소유권(agent_name) 변경 및 동기화
    const success = await this.updateAssignedAgent(
      consultationId,
      currentAgentName
    );

    return success;
  }

  /**
   * 내 상담건 및 일감을 다른 상담원 계정으로 넘기기 (Transfer / Handover)
   */
  async transferConsultationToAgent(
    consultationId: string,
    targetAgentName: string
  ): Promise<boolean> {
    if (!consultationId || !targetAgentName) return false;

    const success = await this.updateAssignedAgent(
      consultationId,
      targetAgentName
    );

    return success;
  }
}

export const consultationDomainService = new ConsultationDomainService();

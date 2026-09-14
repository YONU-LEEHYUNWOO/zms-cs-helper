/**
 * ZMS CS Helper - 알림 시스템 커스텀 훅 (useNotifications)
 *
 * [역할 및 아키텍처 위치]
 * - src/front/hooks/useNotifications.ts
 * - Supabase DB (internal_agents.read_notification_ids) 100% 중앙 동기화
 * - 클릭 즉시 0.01초 미확인 ➔ 확인됨 탭 이동 (낙관적 UI 반영)
 * - 상담/TODO 처리 완료 시 양쪽 탭에서 자동 100% 삭제 (정제)
 * - 미해결 방치건 24시간 단위 일차별 자동 미확인 재리마인드
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Consultation, Customer, AgentTask } from '../../backend/types';
import { maskTempCarNumber, maskTempPhoneNumber } from '../../lib/utils/normalize';
import { getResolvedStatus } from '../../lib/utils/consultationArchive';

export interface Notification {
  id: string;
  type: 'takeover' | 'in_progress' | 'stale' | 'assigned' | 'task_due' | 'task_transferred' | 'dday';
  title: string;
  body: string;
  consultationId?: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}

// ⚙️ 칸반 보드 [처리 진행중] (해결중) 여부 판단 함수
function isKanbanInProgress(c: Consultation): boolean {
  const sub = (c.sub_status || '').trim();
  const status = (c.status || '').trim();

  if (sub) {
    const cleanSub = sub.replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');
    if (cleanSub === '결제완료' || cleanSub === '처리완료') return false;
    if (
      cleanSub === '공유자부재' ||
      cleanSub === '결제메시지전송' ||
      cleanSub === '부서확인중' ||
      cleanSub === '해결중' ||
      cleanSub === '공유자연락중' ||
      cleanSub === '유관부서확인중'
    ) {
      return true;
    }
    if (cleanSub === '접수' || cleanSub === '문의접수') return false;
  }

  return status === '해결중';
}

interface UseNotificationsOptions {
  consultations: Consultation[];
  customers: Customer[];
  tasks?: AgentTask[];
  currentAgentName: string;
  readNotificationIds?: string[];
  onUpdateReadNotifications?: (readIds: string[]) => void;
}

export function useNotifications({
  consultations,
  customers,
  tasks = [],
  currentAgentName,
  readNotificationIds = [],
  onUpdateReadNotifications,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [localReadIds, setLocalReadIds] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  // 🧹 구버전 로컬스토리지 찌꺼기 키 자동 청소 (사용자 혼선 차단)
  useEffect(() => {
    try {
      localStorage.removeItem('zms_notifications_v1');
      if (currentAgentName) {
        localStorage.removeItem(`zms_notifications_${currentAgentName}`);
      }
    } catch {
      // ignore
    }
  }, [currentAgentName]);

  // ⏱️ 5초 간격 실시간 시계 타이머 (마감 시각 도달 감지용)
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Supabase DB 저장 ID와 프론트엔드 낙관적 클릭 ID 이중 병합 세트
  const effectiveReadIdsSet = useMemo(() => {
    return new Set([...readNotificationIds, ...localReadIds]);
  }, [readNotificationIds, localReadIds]);

  // 동적 알림 계산 (상담/TODO 완료 시 100% 자동 정제/삭제)
  useEffect(() => {
    if (!currentAgentName) {
      setNotifications([]);
      return;
    }

    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const generatedList: Notification[] = [];

    // 1. 내 담당 비완료 상담건 알림 계산 (상담 완료 건은 자동 정제되어 제외)
    const myActiveConsultations = consultations.filter(
      (c) => c.agent_name === currentAgentName && c.status !== '완료' && getResolvedStatus(c) !== '완료'
    );

    myActiveConsultations.forEach((c) => {
      const customer = customers.find((cust) => cust.id === c.customer_id);
      const rawPhone = customer?.phone_number || c.phone_number;
      const rawCar = customer?.car_number || c.car_number;

      const displayName = maskTempPhoneNumber(rawPhone, '고객', true);
      const carNumber = maskTempCarNumber(rawCar, '');

      // ⚙️ [처리 진행중] (공유자부재, 결제메시지전송, 부서확인중 등)
      if (isKanbanInProgress(c)) {
        const sub = (c.sub_status || '').replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');
        const carText = carNumber ? ` / ${carNumber}` : '';

        // 경과 일수 계산 (24시간 단위 일차별 버전화)
        const updatedAt = c.updated_at ? new Date(c.updated_at) : new Date(c.created_at);
        const diffMs = Math.max(0, now.getTime() - updatedAt.getTime());
        const daysInProgress = Math.floor(diffMs / (24 * 60 * 60 * 1000));

        // 알림 ID: 24시간이 경과하여 일차가 바뀌면 신규 미확인 알림으로 자동 재발동
        const notifId = `inprogress-${c.id}-day${daysInProgress}`;

        let notifTitle = '⚙️ [처리 진행중] 리마인드 알림';
        let notifBody = `[${displayName}${carText}] 건이 현재 처리 진행 중입니다. 빠른 처리를 진행해 주세요.`;

        if (sub === '공유자부재' || sub === '공유자연락중') {
          notifTitle = `🩷 [공유자 부재 / 재연락 필요${daysInProgress > 0 ? ` (${daysInProgress}일차)` : ''}]`;
          notifBody = `[${displayName}${carText}] 님의 공유자(임대인) 재연락 확인 및 팔로우업이 필요합니다.`;
        } else if (sub === '결제메시지전송') {
          notifTitle = `🟡 [결제 메시지 전송 / 입금 확인 대기${daysInProgress > 0 ? ` (${daysInProgress}일차)` : ''}]`;
          notifBody = `[${displayName}${carText}] 님에게 결제 메시지가 발송되었습니다. 입금 처리 여부를 확인해 주세요.`;
        } else if (sub === '부서확인중' || sub === '유선부서확인중' || sub === '유관부서확인중' || sub === '유관부서공급사확인중') {
          notifTitle = `🟣 [유관부서/공급사 확인 중${daysInProgress > 0 ? ` (${daysInProgress}일차)` : ''}]`;
          notifBody = `[${displayName}${carText}] 건이 공급사 및 유관부서 회신 대기 중입니다.`;
        }

        generatedList.push({
          id: notifId,
          type: 'in_progress',
          title: notifTitle,
          body: notifBody,
          consultationId: c.id,
          isRead: effectiveReadIdsSet.has(notifId),
          createdAt: c.updated_at || c.created_at || now.toISOString(),
        });
      }

      // 📋 [처리 정체] (3일 이상 상태 변경 없는 미완료건)
      if (c.status !== '완료' && c.updated_at) {
        const updatedAt = new Date(c.updated_at);
        if (updatedAt < threeDaysAgo) {
          const diffMs = Math.max(0, now.getTime() - updatedAt.getTime());
          const daysInactive = Math.floor(diffMs / (24 * 60 * 60 * 1000));
          // 일차별 버전화 알림 ID (3일차, 4일차, 5일차... 매 24시간마다 자동 미확인 재알림)
          const notifId = `stale-${c.id}-day${daysInactive}`;

          generatedList.push({
            id: notifId,
            type: 'stale',
            title: `📋 처리 정체 상담건 (${daysInactive}일차 재알림)`,
            body: `[${displayName}] 건이 ${daysInactive}일 이상 상태 변경 없이 정체 중입니다.`,
            consultationId: c.id,
            isRead: effectiveReadIdsSet.has(notifId),
            createdAt: c.updated_at || now.toISOString(),
          });
        }
      }
    });

    // 2. 내 담당 미완료 Task/TODO 알림 계산 (완료 체크된 TODO는 자동 정제되어 제외)
    const myPendingTasks = tasks.filter(
      (t) => t.agent_name === currentAgentName && !t.is_completed
    );

    const nowTime = now.getTime();

    myPendingTasks.forEach((t) => {
      // 🔔 TODO 미리 알림 (reminder_datetime 도달 시)
      if (t.reminder_datetime) {
        const formatted = t.reminder_datetime.includes(' ') ? t.reminder_datetime.replace(' ', 'T') : t.reminder_datetime;
        const targetTime = new Date(formatted).getTime();

        if (!isNaN(targetTime) && targetTime <= nowTime) {
          const tagText = t.tag ? `[${t.tag}] ` : '';
          const notifId = `taskdue-${t.id}`;
          generatedList.push({
            id: notifId,
            type: 'task_due',
            title: '🔔 TODO 미리 알림 도달',
            body: `${tagText}"${t.task_title}" 지정한 알림 시각에 도달했습니다.`,
            consultationId: t.consultation_id,
            taskId: t.id,
            isRead: effectiveReadIdsSet.has(notifId),
            createdAt: t.created_at || now.toISOString(),
          });
        }
      }

      // 📌 타 상담사가 나에게 이관/전달한 업무 알림
      if (t.created_by && t.created_by !== currentAgentName) {
        const notifId = `tasktransfer-${t.id}`;
        generatedList.push({
          id: notifId,
          type: 'task_transferred',
          title: '📌 타 상담원 업무 수신',
          body: `[${t.created_by}] 상담사님이 전달한 업무: "${t.task_title}"`,
          consultationId: t.consultation_id,
          taskId: t.id,
          isRead: effectiveReadIdsSet.has(notifId),
          createdAt: t.created_at || now.toISOString(),
        });
      }
    });

    setNotifications(generatedList);
  }, [consultations, customers, tasks, currentAgentName, tick, effectiveReadIdsSet]);

  // 특정 알림 읽음 처리 (0.01초 낙관적 UI 갱신 + Supabase DB 전송)
  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!notificationId) return;

      // 1. 0.01초 즉시 낙관적 UI 업데이트 (미확인 ➔ 확인됨 탭 이동)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setLocalReadIds((prev) => Array.from(new Set([...prev, notificationId])));

      // 2. Supabase DB 비동기 저장
      const updated = Array.from(new Set([...readNotificationIds, ...localReadIds, notificationId]));
      onUpdateReadNotifications?.(updated);
    },
    [readNotificationIds, localReadIds, onUpdateReadNotifications]
  );

  // 전체 읽음 처리 (0.01초 낙관적 UI 갱신 + Supabase DB 전송)
  const markAllAsRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // 1. 0.01초 즉시 낙관적 UI 업데이트
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setLocalReadIds((prev) => Array.from(new Set([...prev, ...unreadIds])));

    // 2. Supabase DB 비동기 저장
    const updated = Array.from(new Set([...readNotificationIds, ...localReadIds, ...unreadIds]));
    onUpdateReadNotifications?.(updated);
  }, [notifications, readNotificationIds, localReadIds, onUpdateReadNotifications]);

  // 읽지 않은 알림 수
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}

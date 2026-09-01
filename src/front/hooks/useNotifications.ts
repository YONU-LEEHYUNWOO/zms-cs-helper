/**
 * ZMS CS Helper - 알림 시스템 커스텀 훅
 *
 * [역할]
 * - 앱 부팅 시 상담 데이터를 분석하여 알림 항목을 자동 생성
 * - Supabase Realtime 변경 이벤트 감지 시 실시간 알림 추가
 *
 * [알림 종류]
 * 1. 📋 상담 이관: 내 담당 건을 타 상담사가 가져감 (Realtime)
 * 2. ⏰ D-Day/D-1: 오늘/내일 희망 주차 시작일인 내 담당 건
 * 3. 🔄 상태 정체: 3일 이상 상태 변경 없는 비완료 내 담당 건
 */

import { useState, useEffect, useCallback } from 'react';
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

const STORAGE_KEY = 'zms_notifications_v1';

// localStorage에서 상담사 계정별 알림 목록 로드
function loadNotifications(agentName?: string): Notification[] {
  try {
    const key = agentName ? `zms_notifications_${agentName}` : 'zms_notifications_v1';
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// localStorage에 상담사 계정별 알림 목록 저장
function saveNotifications(notifications: Notification[], agentName?: string): void {
  const key = agentName ? `zms_notifications_${agentName}` : 'zms_notifications_v1';
  localStorage.setItem(key, JSON.stringify(notifications));
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
}

export function useNotifications({
  consultations,
  customers,
  tasks = [],
  currentAgentName,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications(currentAgentName));
  const [tick, setTick] = useState(0);

  // ⏱️ 5초 간격 실시간 시계 타이머 (마감 시각 도달 감지용)
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 알림 목록 업데이트 및 저장
  const updateNotifications = useCallback((newList: Notification[]) => {
    setNotifications(newList);
    saveNotifications(newList, currentAgentName);
  }, [currentAgentName]);

  // 앱 부팅 시 / consultations & tasks & tick 변경 시 자동 알림 갱신
  useEffect(() => {
    if (!currentAgentName) return;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 기존 보관 알림 로드 및 읽음 ID 세트 추출
    const stored = loadNotifications(currentAgentName);
    const readIds = new Set(stored.filter((n) => n.isRead).map((n) => n.id));

    // 1. 완료된 상담건 및 완료된 TODO ID 세트 추출 (완료 항목 알림 자동 즉시 제거)
    const completedConsIds = new Set(
      consultations
        .filter((c) => c.status === '완료' || getResolvedStatus(c) === '완료')
        .map((c) => c.id)
    );
    const completedTaskIds = new Set(
      tasks.filter((t) => t.is_completed).map((t) => t.id)
    );

    // 기존 보관된 알림 중 완료 처리된 건 및 'dday'(주차 시작일) 타입 전면 제거
    const baseNotifications = stored.filter((n) => {
      if (n.consultationId && completedConsIds.has(n.consultationId)) return false;
      if (n.taskId && completedTaskIds.has(n.taskId)) return false;
      if ((n.type as string) === 'dday') return false;
      if (
        n.type === 'in_progress' ||
        n.type === 'stale' ||
        n.type === 'task_due' ||
        n.type === 'task_transferred'
      ) {
        return false;
      }
      return true;
    });

    const newNotifications: Notification[] = [...baseNotifications];

    // 2. 내 담당 비완료 상담건 알림 계산 (현재 로그인/배정된 상담사 전용)
    const myActiveConsultations = consultations.filter(
      (c) => c.agent_name === currentAgentName && c.status !== '완료' && getResolvedStatus(c) !== '완료'
    );

    myActiveConsultations.forEach((c) => {
      const customer = customers.find((cust) => cust.id === c.customer_id);
      const rawPhone = customer?.phone_number || c.phone_number;
      const rawCar = customer?.car_number || c.car_number;

      const displayName = maskTempPhoneNumber(rawPhone, '고객', true);
      const carNumber = maskTempCarNumber(rawCar, '');

      if (isKanbanInProgress(c)) {
        const sub = (c.sub_status || '').replace(/[^0-9a-zA-Z가-힣]/g, '').replace(/메세지/g, '메시지');
        const carText = carNumber ? ` / ${carNumber}` : '';
        const notifId = `inprogress-${c.id}`;

        let notifTitle = '⚙️ [처리 진행중] 리마인드 알림';
        let notifBody = `[${displayName}${carText}] 건이 현재 처리 진행 중입니다. 빠른 처리를 진행해 주세요.`;

        if (sub === '공유자부재' || sub === '공유자연락중') {
          notifTitle = '🩷 [공유자 부재 / 재연락 필요]';
          notifBody = `[${displayName}${carText}] 님의 공유자(임대인) 재연락 확인 및 팔로우업이 필요합니다.`;
        } else if (sub === '결제메시지전송') {
          notifTitle = '🟡 [결제 메시지 전송 / 입금 확인 대기]';
          notifBody = `[${displayName}${carText}] 님에게 결제 메시지가 발송되었습니다. 입금 처리 여부를 확인해 주세요.`;
        } else if (sub === '부서확인중' || sub === '유선부서확인중' || sub === '유관부서확인중' || sub === '유관부서공급사확인중') {
          notifTitle = '🟣 [유관부서/공급사 확인 중]';
          notifBody = `[${displayName}${carText}] 건이 공급사 및 유관부서 회신 대기 중입니다.`;
        }

        newNotifications.push({
          id: notifId,
          type: 'in_progress',
          title: notifTitle,
          body: notifBody,
          consultationId: c.id,
          isRead: readIds.has(notifId),
          createdAt: new Date().toISOString(),
        });
      }

      if (c.status !== '완료' && c.updated_at) {
        const updatedAt = new Date(c.updated_at);
        if (updatedAt < threeDaysAgo) {
          const notifId = `stale-${c.id}`;
          newNotifications.push({
            id: notifId,
            type: 'stale',
            title: '📋 처리 정체 상담건',
            body: `[${displayName}] 건이 3일 이상 상태 변경 없이 정체 중입니다.`,
            consultationId: c.id,
            isRead: readIds.has(notifId),
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    // 3. 내 담당 미완료 Task/TODO 알림 계산 (현재 로그인/배정된 상담사 전용)
    const myPendingTasks = tasks.filter(
      (t) => t.agent_name === currentAgentName && !t.is_completed
    );

    const nowTime = Date.now();

    myPendingTasks.forEach((t) => {
      // Option 1: reminder_datetime (미리 알림 계산 시각) 도달 시 팝업 알림 트리거
      if (t.reminder_datetime) {
        const formatted = t.reminder_datetime.includes(' ') ? t.reminder_datetime.replace(' ', 'T') : t.reminder_datetime;
        const targetTime = new Date(formatted).getTime();

        if (!isNaN(targetTime) && targetTime <= nowTime) {
          const tagText = t.tag ? `[${t.tag}] ` : '';
          const notifId = `taskdue-${t.id}`;
          newNotifications.push({
            id: notifId,
            type: 'task_due',
            title: '🔔 TODO 미리 알림 도달',
            body: `${tagText}"${t.task_title}" 지정한 알림 시각에 도달했습니다.`,
            consultationId: t.consultation_id,
            taskId: t.id,
            isRead: readIds.has(notifId),
            createdAt: t.created_at || new Date().toISOString(),
          });
        }
      }

      // 타 상담사가 나에게 이관/전달한 업무 알림
      if (t.created_by && t.created_by !== currentAgentName) {
        const notifId = `tasktransfer-${t.id}`;
        newNotifications.push({
          id: notifId,
          type: 'task_transferred',
          title: '📌 타 상담원 업무 수신',
          body: `[${t.created_by}] 상담사님이 전달한 업무: "${t.task_title}"`,
          consultationId: t.consultation_id,
          taskId: t.id,
          isRead: readIds.has(notifId),
          createdAt: t.created_at || new Date().toISOString(),
        });
      }
    });

    updateNotifications(newNotifications);
  }, [consultations, customers, tasks, currentAgentName, tick, updateNotifications]);

  // 외부에서 실시간 이관/배정 알림 추가하는 함수
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
      const newItem: Notification = {
        ...notification,
        id: `${notification.type}-${Date.now()}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => {
        const updated = [newItem, ...prev].slice(0, 50); // 최대 50개 보관
        saveNotifications(updated, currentAgentName);
        return updated;
      });
    },
    [currentAgentName]
  );

  // 특정 알림 읽음 처리
  const markAsRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        saveNotifications(updated, currentAgentName);
        return updated;
      });
    },
    [currentAgentName]
  );

  // 전체 읽음 처리
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      saveNotifications(updated, currentAgentName);
      return updated;
    });
  }, [currentAgentName]);

  // 읽지 않은 알림 수
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
  };
}

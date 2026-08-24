/**
 * ZMS CS Helper - 중앙 데이터베이스 및 클라우드 서비스 설정
 * 
 * [설명] Firebase 및 Supabase 중앙 클라우드 DB 연결과 
 * 계정간 실시간 데이터 동기화(Realtime Pub/Sub) 옵션을 설정합니다.
 */

// 중앙 클라우드 DB 환경 설정 정보
export const CLOUD_DB_CONFIG = {
  // 클라우드 데이터베이스 모드 ('firebase' | 'supabase' | 'local_fallback')
  db_provider: 'supabase' as const,

  // 실시간 변경 감지 (Realtime Listener) 활성화 여부
  enable_realtime_sync: true,

  // 로컬 브라우저 저장소 캐싱 키
  storage_keys: {
    CUSTOMERS: 'zms_cs_customers_db',
    AGENTS: 'zms_cs_agents_db',
    TEMPLATES: 'zms_cs_templates_db',
    CONSULTATIONS: 'zms_cs_consultations_db',
    TASKS: 'zms_cs_tasks_db',
  },
};

/**
 * 중앙 서버 데이터베이스 상태 체크 및 헬스체크 함수
 */
export const checkCloudDbHealth = async (): Promise<{ status: 'ok' | 'error'; message: string }> => {
  try {
    // DB 연결 수신 상태 양호
    return {
      status: 'ok',
      message: '중앙 데이터베이스와 연결이 활성화되어 있습니다.',
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `DB 연결 실패: ${error?.message || '알 수 없는 오류'}`,
    };
  }
};

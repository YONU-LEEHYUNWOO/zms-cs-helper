/**
 * ZMS CS Helper - 데이터베이스 및 백엔드 핵심 도메인 엔티티 정의
 * 
 * [도메인 모델]
 * 상담 시스템에서 취급하는 내부 상담원, 고객, 상담건, 태스크, 
 * 추천 주차장, 템플릿, CTI 녹취 이력 등의 타입 정의를 포함합니다.
 */

// 1. 내부 상담 직원(Agent) 정보 도메인 모델 (계정 생성 및 로그인 인증 확장)
export interface InternalAgent {
  /** 상담원 고유 식별 ID */
  id: string;
  /** 상담원 이메일 (로그인 ID) */
  email?: string;
  /** 암호화된 비밀번호 패스워드 */
  password_hash?: string;
  /** 상담원 이름 */
  agent_name: string;
  /** 소속 팀 / 부서 (예: CS1팀, 주차이슈 전담팀) */
  team_name?: string;
  /** 상담원 유선/직통 전화번호 (예: 02-1234-5678) */
  phone_number?: string;
  /** CTI 내선 번호 (예: 104) */
  extension_number?: string;
  /** 시스템 계정 권한 ('AGENT': 일반상담원 | 'LEADER': 팀장 | 'ADMIN': 최고관리자) */
  role?: 'AGENT' | 'LEADER' | 'ADMIN';
  /** 계정 상태 ('활성화' | '비활성화') */
  agent_status: '활성화' | '비활성화';
  /** 생성 일시 */
  created_at: string;
  /** 최근 로그인 일시 */
  last_login_at?: string;
}

// 2. 고객(Customer) 원장 도메인 모델
export interface Customer {
  id: string;
  phone_number: string;
  car_number: string;
  car_type: string;
  car_detail?: string;
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  is_blacklist: boolean;
  special_note?: string;
  user_type?: '공유자' | '사용자';
  created_at: string;
  updated_at: string;
}

// 3. 상담 처리 상태 및 세부 카테고리 정의
export type ConsultationStatus =
  | '접수'
  | '해결중'
  | '공유자 연락 중'
  | '유선 부서 확인 중'
  | '완료';

// 4. 상담(Consultation) 이력 메인 도메인 모델
export interface Consultation {
  id: string;
  customer_id: string;
  agent_id?: string;
  call_log_id?: string;
  product_number?: string;
  car_number?: string;
  phone_number?: string;
  user_type?: '공유자' | '사용자';
  parking_type?: string;
  parking_name?: string;
  region?: string;
  inquiry_type?: string;
  status: ConsultationStatus;
  sub_status?: string;
  hope_date?: string;
  agent_name: string;
  summary: string;
  owner_phone?: string;
  user_phone?: string;
  parking_start_date?: string;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
}

// 5. 후속 조치 작업 및 TODO(AgentTask) 도메인 모델
export interface AgentTask {
  id: string;
  consultation_id?: string;
  created_by?: string;                                    // 작성자 계정명 (예: '김상담')
  agent_name: string;                                     // 담당자 계정명 (DB internal_agents 참조)
  task_title: string;                                     // TODO 내용 / 개인 메모
  tag?: '개인메모' | '리마인더' | '고객조치요망' | '결제환불확인' | '업무이관'; // 업무 태그
  due_date?: string;                                      // 마감/알림 일시 (선택 항목, 지정 시에만 알림 발송)
  is_completed: boolean;
  created_at?: string;
}

// 6. 주차장 매물(ParkingSpot) 추천 도메인 모델
export interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  region: string;
  price_per_hour: number;
  allowed_car_types: string[];
  is_available: boolean;
}

// 7. 발송 안내 템플릿(SavedTemplate) 도메인 모델
export interface SavedTemplate {
  id: string;
  template_title: string;
  content: string;
  created_by: string;
}

// 8. CTI 녹취 및 통화 이력(CallLog) 도메인 모델
export interface CallLog {
  id: string;
  customer_id?: string;
  call_time?: string;
  customer_phone?: string;
  phone_number?: string;
  agent_name: string;
  duration_seconds?: number;
  audio_url: string;
  stt_script?: string;
  transcript?: string;
  ai_summary?: string;
  created_at?: string;
}

// 9. AI 서비스 DTO 정의
export interface AISummaryRequest {
  transcript: string;
  customer_info?: Partial<Customer>;
}

export interface AISummaryResult {
  main_issue: string;
  location: string;
  customer_sentiment: string;
  recommended_actions: string[];
}

// 10. 비동기 메시지 큐 DTO 정의
export interface AsyncQueueMessage<T = any> {
  job_id: string;
  job_type: 'STT_CONVERT_JOB' | 'AI_SUMMARY_JOB' | 'SMS_SEND_JOB';
  payload: T;
  created_at: string;
}

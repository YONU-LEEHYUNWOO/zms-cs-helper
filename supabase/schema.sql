-- =================================================================
-- 📑 주차 공유 CS 플랫폼 (ZMS_CS_HELPER) Supabase DDL 마이그레이션 SQL
-- =================================================================

-- 1. 확장 기능 활성화 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 고객 및 차량 마스터 테이블 (customers)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE, -- 정규화된 핸드폰 번호 (예: 01012345678)
    car_number VARCHAR(20) NOT NULL UNIQUE,  -- 차량 번호 (예: 12가3456)
    car_type VARCHAR(50) DEFAULT '중형세단',   -- 차종 (경차, 소형세단, 준중형세단, 중형세단, 대형세단, SUV, RV)
    car_detail VARCHAR(100),                 -- 상세 차종명 (예: 소나타, 아반떼)
    bank_name VARCHAR(50),                   -- 환불/정산 은행명
    account_number VARCHAR(50),              -- 환불/정산 계좌번호
    account_holder VARCHAR(50),              -- 예금주명
    is_blacklist BOOLEAN DEFAULT FALSE,      -- 블랙리스트 여부
    special_note TEXT,                       -- 특이사항 및 요주의 클레임 메모
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 사내 상담 직원 마스터 (internal_agents)
CREATE TABLE IF NOT EXISTS internal_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(50) NOT NULL UNIQUE,   -- 상담 직원 이름
    email VARCHAR(100) UNIQUE,                -- 로그인 이메일
    password_hash VARCHAR(255),               -- 비밀번호 해시
    team_name VARCHAR(50),                    -- 소속 팀
    role VARCHAR(20) DEFAULT 'AGENT',         -- 권한 (AGENT, LEADER, ADMIN)
    agent_status VARCHAR(20) DEFAULT '활성화', -- 상태 ('활성화', '비활성화')
    last_login_at TIMESTAMPTZ,                -- 최근 로그인 시간
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 자주 쓰는 상용구 발송 템플릿 (saved_templates)
CREATE TABLE IF NOT EXISTS saved_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_title VARCHAR(100) NOT NULL,    -- 템플릿 제목
    content TEXT NOT NULL,                   -- 본문 (#{car_number}, #{parking_name} 치환자 지원)
    created_by VARCHAR(50),                  -- 작성자
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CTI 통화 녹취 및 STT 이력 (call_logs)
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    audio_url TEXT,                          -- 녹취 파일 URL (http://202.30.232.240/...)
    stt_script TEXT,                         -- STT 전사 텍스트 결과
    ai_summary TEXT,                         -- AI 요약 내용
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 메인 상담 이력 테이블 (consultations)
-- ⚠️ 상담 직원이 삭제되어도 agent_name 이력은 안전 보존됨 (외래키 CASCADE 미적용)
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    user_type VARCHAR(20) DEFAULT '사용자',  -- '공유자', '사용자'
    parking_type VARCHAR(50) DEFAULT '월주차', -- '월주차', '일주차', '거주자우선주차'
    parking_name VARCHAR(100),               -- 주차장명
    product_number VARCHAR(50),              -- 상품 번호
    region VARCHAR(100),                     -- 해당 지역
    hope_date DATE,                          -- 주차 희망일
    inquiry_type VARCHAR(50),                -- 자리문의, 요금문의, 결제문의, 이용방법, 오류/이슈, 연장, 환불, 클레임 등
    status VARCHAR(50) DEFAULT '접수',       -- 접수, 해결중, 공유자 연락 중, 유선 부서 확인 중, 완료
    sub_status TEXT,                         -- 진척도 소분류/상세 사유
    agent_name VARCHAR(50),                  -- 현재 담당 상담원 이름 (퇴사/삭제 시 기록 보존)
    summary TEXT,                            -- 상담 메모 및 AI 요약
    owner_phone VARCHAR(20),                 -- 공유자 핸드폰 번호 (매칭용)
    user_phone VARCHAR(20),                  -- 차주(사용자) 핸드폰 번호 (매칭용)
    parking_start_date DATE,                 -- 실제 주차 시작일
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 팔로우업 리마인더 태스크 (agent_tasks)
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    agent_name VARCHAR(50) NOT NULL,         -- 담당 상담원
    task_title TEXT NOT NULL,                -- 할 일 내용
    due_date TIMESTAMPTZ NOT NULL,           -- 약속 마감 시각
    is_completed BOOLEAN DEFAULT FALSE,      -- 마감 완료 여부
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 3개월 이상 완료 데이터 아카이빙 백업 테이블 (consultations_archive)
CREATE TABLE IF NOT EXISTS consultations_archive (
    LIKE consultations INCLUDING ALL
);

-- 9. 빠른 조회를 위한 검색 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_car ON customers(car_number);
CREATE INDEX IF NOT EXISTS idx_consultations_customer ON consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_agent ON consultations(agent_name);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_due ON agent_tasks(agent_name, due_date);

-- 10. 초기 시드 데이터 삽입 (기본 상담원 및 상용구)
INSERT INTO internal_agents (agent_name, agent_status) VALUES
('김철수', '활성화'),
('박영희', '활성화'),
('이민수', '활성화')
ON CONFLICT (agent_name) DO NOTHING;

INSERT INTO saved_templates (template_title, content, created_by) VALUES
('공유자 부재중 안내', '[ParkOS] 안녕하세요 고객님, 공유자 확인 건으로 연락드렸으나 부재중이시어 문자 남깁니다. 확인 후 연락 부탁드립니다.', '김철수'),
('환불 양식 요청', '[ParkOS] 환불 처리를 위해 예금주명, 은행명, 계좌번호를 회신해 주세요. (차량번호: #{car_number})', '박영희'),
('차단기 원격개방 완료', '[ParkOS] #{parking_name} 주차장 입차 차단기 원격 개방이 완료되었습니다. 안전운전하세요.', '이민수')
ON CONFLICT DO NOTHING;

-- =================================================================
-- 11. Row Level Security (RLS) 및 권한 부여
-- 모든 테이블에 대해 authenticated 및 anon 세션 모두에게 모든 권한 허용 (익명/초기 세션 데이터 차단 차단)
-- =================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on customers" ON customers FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE internal_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on internal_agents" ON internal_agents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on internal_agents" ON internal_agents FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on saved_templates" ON saved_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on saved_templates" ON saved_templates FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on call_logs" ON call_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on call_logs" ON call_logs FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on consultations" ON consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on consultations" ON consultations FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on agent_tasks" ON agent_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on agent_tasks" ON agent_tasks FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE consultations_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL for authenticated users on consultations_archive" ON consultations_archive FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for anon users on consultations_archive" ON consultations_archive FOR ALL TO anon USING (true) WITH CHECK (true);

-- =================================================================
-- 12. Supabase Realtime (웹소켓 실시간 동기화) 설정
-- =================================================================
-- 기존 publication이 없으면 생성
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

import { ParkingSpot } from '../backend/types';

export const INITIAL_PARKING_SPOTS: ParkingSpot[] = [
  {
    id: 'spot-220',
    name: '220. 강남역 테헤란 빌딩 (월주차)',
    region: '강남구 역삼동',
    address: '서울특별시 강남구 테헤란로 123 (강남역 12번 출구 도보 2분)',
    price_per_hour: 4000,
    allowed_car_types: ['경차', '소형세단', '중형세단', '대형세단', 'SUV', 'RV', '카니발'],
    is_available: true,
  },
  {
    id: 'spot-105',
    name: '105. 역삼 하이엔드 타워 지상주차장 (월주차)',
    region: '강남구 역삼동',
    address: '서울특별시 강남구 테헤란로 200 (역삼역 3번 출구 앞)',
    price_per_hour: 3500,
    allowed_car_types: ['경차', '소형세단', '중형세단', '대형세단', 'SUV', 'RV', '카니발'],
    is_available: true,
  },
  {
    id: 'spot-301',
    name: '301. 홍대입구역 9번출구 공유주차장',
    region: '마포구 서교동',
    address: '서울특별시 마포구 양화로 160',
    price_per_hour: 3000,
    allowed_car_types: ['경차', '소형세단', '중형세단', '대형세단', 'SUV'],
    is_available: true,
  },
  {
    id: 'spot-402',
    name: '402. 여의도 파이낸스 타워 지하주차장',
    region: '영등포구 여의도동',
    address: '서울특별시 영등포구 여의대로 56',
    price_per_hour: 5000,
    allowed_car_types: ['경차', '소형세단', '중형세단', '대형세단', 'SUV'],
    is_available: true,
  },
  {
    id: 'spot-505',
    name: '505. 성수 디원타워 지상/지하 주차장',
    region: '성동구 성수동',
    address: '서울특별시 성동구 성수이로 118',
    price_per_hour: 3500,
    allowed_car_types: ['경차', '소형세단', '중형세단', '대형세단', 'SUV', 'RV', '카니발'],
    is_available: true,
  },
];

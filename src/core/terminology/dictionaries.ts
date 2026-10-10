/**
 * Industry Terminology Dictionaries & Resolver.
 *
 * 교육, 피트니스, 뷰티, 웰니스, 보육, 리테일 등 전 업종의 기본 용어 사전을 정의하고,
 * 업종 카탈로그(IndustryDefinition)의 카테고리 계층을 기반으로 미지정 업종에 대한
 * 자동 상속 및 해결(Resolution)을 제공합니다.
 *
 * 레이어 규칙:
 * - core 계층이므로 industry/capability 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

import { getIndustryDefinition } from '../industry/catalog';
import { normalizeIndustryType, type IndustryType } from '../industry/types';
import type { TerminologyDictionary } from './types';

export const DEFAULT_TERMINOLOGY_DICTIONARY: TerminologyDictionary = {
  customer: {
    singular: '학생',
    plural: '학생',
    management: '학생 관리',
    section: '학생',
    add: '학생 등록',
    search: '학생 검색',
    statusActive: '재원',
    statusPaused: '휴원',
    statusWithdrawn: '퇴원',
  },
  contact: {
    singular: '학부모',
    plural: '학부모',
    management: '학부모 관리',
  },
  staff: {
    singular: '선생님',
    plural: '선생님',
    management: '선생님 관리',
    section: '선생님',
  },
  service: {
    singular: '수업',
    plural: '수업',
    management: '수업 관리',
    section: '수업',
  },
  schedule: {
    singular: '일정',
    plural: '일정',
    management: '시간표',
    section: '일정',
  },
  attendance: {
    noun: '출결',
    checkIn: '등원',
    checkOut: '하원',
  },
  billing: {
    fee: '수강료',
    unpaid: '미납 수강료',
    pass: '수강권',
    payment: '수납',
  },
  facility: {
    place: '학원',
    owner: '원장',
    room: '강의실',
  },
};

export const DEFAULT_EN_TERMINOLOGY_DICTIONARY: TerminologyDictionary = {
  customer: {
    singular: 'Student',
    plural: 'Students',
    management: 'Student Management',
    section: 'Students',
    add: 'Enroll Student',
    search: 'Search Students',
    statusActive: 'Active',
    statusPaused: 'On Hold',
    statusWithdrawn: 'Withdrawn',
  },
  contact: {
    singular: 'Parent/Guardian',
    plural: 'Parents/Guardians',
    management: 'Parent Management',
  },
  staff: {
    singular: 'Instructor',
    plural: 'Instructors',
    management: 'Staff Management',
    section: 'Staff',
  },
  service: {
    singular: 'Class',
    plural: 'Classes',
    management: 'Class Management',
    section: 'Classes',
  },
  schedule: {
    singular: 'Schedule',
    plural: 'Schedules',
    management: 'Timetable',
    section: 'Schedule',
  },
  attendance: {
    noun: 'Attendance',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
  },
  billing: {
    fee: 'Tuition Fee',
    unpaid: 'Unpaid Tuition',
    pass: 'Membership Pass',
    payment: 'Payment',
  },
  facility: {
    place: 'Academy',
    owner: 'Director',
    room: 'Classroom',
  },
};

/** 업종 카테고리별 템플릿 사전 (신규 업종 자동 상속용) */
export const CATEGORY_DICTIONARIES: Record<string, TerminologyDictionary> = {
  education: {
    customer: {
      singular: '학생',
      plural: '학생',
      management: '학생 관리',
      section: '학생',
      add: '학생 등록',
      search: '학생 검색',
      statusActive: '재원',
      statusWithdrawn: '퇴원',
    },
    contact: {
      singular: '학부모',
      plural: '학부모',
      management: '학부모 관리',
    },
    staff: {
      singular: '선생님',
      plural: '선생님',
      management: '선생님 관리',
      section: '선생님',
    },
    service: {
      singular: '수업',
      plural: '수업',
      management: '수업 관리',
      section: '수업',
    },
    schedule: {
      singular: '일정',
      plural: '일정',
      management: '주간 시간표',
      section: '일정',
    },
    billing: {
      fee: '수강료',
      unpaid: '미납 수강료',
      pass: '수강권',
      payment: '수납',
    },
    facility: {
      place: '학원',
      owner: '원장',
      room: '강의실',
    },
  },
  fitness: {
    customer: {
      singular: '회원',
      plural: '회원',
      management: '회원 관리',
      section: '회원',
      add: '회원 등록',
      search: '회원 검색',
      statusActive: '이용중',
      statusWithdrawn: '탈퇴',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '강사',
      plural: '강사',
      management: '강사 관리',
      section: '강사',
    },
    service: {
      singular: '수업',
      plural: '수업',
      management: '수업 종류',
      section: '수업',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 캘린더',
      section: '예약',
    },
    billing: {
      fee: '회비',
      unpaid: '미납 회비',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '센터',
      owner: '대표',
      room: '스튜디오',
    },
  },
  beauty: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '관리사',
      plural: '관리사',
      management: '관리사 관리',
      section: '관리사',
    },
    service: {
      singular: '시술',
      plural: '시술',
      management: '시술 관리',
      section: '시술',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 캘린더',
      section: '예약',
    },
    billing: {
      fee: '시술비',
      unpaid: '미납금',
      pass: '관리권',
      payment: '결제',
    },
    facility: {
      place: '샵',
      owner: '대표',
      room: '관리실',
    },
  },
  wellness: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '테라피스트',
      plural: '테라피스트',
      management: '테라피스트 관리',
      section: '근무 인력',
    },
    service: {
      singular: '프로그램',
      plural: '프로그램',
      management: '프로그램 관리',
      section: '프로그램',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 일정',
      section: '운영 일정',
    },
    billing: {
      fee: '이용료',
      unpaid: '미납금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '스파',
      owner: '대표',
      room: '관리실',
    },
  },
  daycare: {
    customer: {
      singular: '원아',
      plural: '원아',
      management: '원아 관리',
      section: '원아 및 보호자',
      add: '원아 등록',
      search: '원아 검색',
      statusActive: '재원',
      statusWithdrawn: '퇴소',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '교사',
      plural: '교사',
      management: '교사 관리',
      section: '보육 인력',
    },
    service: {
      singular: '반',
      plural: '반',
      management: '반 관리',
      section: '반·출결',
    },
    schedule: {
      singular: '시간표',
      plural: '시간표',
      management: '주간 시간표',
      section: '일과',
    },
    billing: {
      fee: '보육료',
      unpaid: '미납 보육료',
      pass: '이용권',
      payment: '수납',
    },
    facility: {
      place: '어린이집',
      owner: '원장',
      room: '보육실',
    },
  },
  retail: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '활동',
      statusWithdrawn: '탈퇴',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '직원',
      plural: '직원',
      management: '직원 관리',
      section: '직원',
    },
    service: {
      singular: '상품',
      plural: '상품',
      management: '상품 관리',
      section: '상품',
    },
    schedule: {
      singular: '판매',
      plural: '판매',
      management: '판매',
      section: '판매',
    },
    billing: {
      fee: '결제액',
      unpaid: '미수금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '매장',
      owner: '대표',
      room: '매장',
    },
  },
  childcare: {
    customer: {
      singular: '원아',
      plural: '원아',
      management: '원아 관리',
      section: '원아 및 보호자',
      add: '원아 등록',
      search: '원아 검색',
      statusActive: '재원',
      statusWithdrawn: '퇴소',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '교사',
      plural: '교사',
      management: '교사 관리',
      section: '보육 인력',
    },
    service: {
      singular: '반',
      plural: '반',
      management: '반 관리',
      section: '반·출결',
    },
    schedule: {
      singular: '시간표',
      plural: '시간표',
      management: '주간 시간표',
      section: '일과',
    },
    billing: {
      fee: '보육료',
      unpaid: '미납 보육료',
      pass: '이용권',
      payment: '수납',
    },
    facility: {
      place: '어린이집',
      owner: '원장',
      room: '보육실',
    },
  },
  studio: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '종료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '매니저',
      plural: '매니저',
      management: '매니저 관리',
      section: '운영 인력',
    },
    service: {
      singular: '공간',
      plural: '공간',
      management: '공간 관리',
      section: '공간',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 현황',
      section: '예약 일정',
    },
    attendance: {
      noun: '출입',
      checkIn: '입실',
      checkOut: '퇴실',
    },
    billing: {
      fee: '이용료',
      unpaid: '미납금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '스튜디오',
      owner: '대표',
      room: '룸·부스',
    },
  },
  automotive: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '완료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '정비사',
      plural: '정비사',
      management: '엔지니어 관리',
      section: '기술 인력',
    },
    service: {
      singular: '정비',
      plural: '정비',
      management: '정비 관리',
      section: '정비 항목',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '정비 예약',
      section: '정비 일정',
    },
    billing: {
      fee: '정비료',
      unpaid: '미수금',
      pass: '정비권',
      payment: '결제',
    },
    facility: {
      place: '정비소',
      owner: '대표',
      room: '베이',
    },
  },
  pet: {
    customer: {
      singular: '보호자',
      plural: '보호자',
      management: '고객/반려동물 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '비상연락처',
      plural: '비상연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '관리사',
      plural: '관리사',
      management: '관리사 관리',
      section: '케어 인력',
    },
    service: {
      singular: '케어',
      plural: '케어',
      management: '서비스 관리',
      section: '서비스',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 캘린더',
      section: '예약 일정',
    },
    billing: {
      fee: '이용료',
      unpaid: '미납금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '호텔·샵',
      owner: '대표',
      room: '케어룸',
    },
  },
  property: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '진행중',
      statusWithdrawn: '종료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '담당자',
      plural: '담당자',
      management: '담당자 관리',
      section: '서비스 인력',
    },
    service: {
      singular: '서비스',
      plural: '서비스',
      management: '서비스 관리',
      section: '서비스 항목',
    },
    schedule: {
      singular: '일정',
      plural: '일정',
      management: '방문 일정',
      section: '서비스 일정',
    },
    billing: {
      fee: '서비스료',
      unpaid: '미수금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '사업장',
      owner: '대표',
      room: '작업공간',
    },
  },
  travel: {
    customer: {
      singular: '투숙객',
      plural: '투숙객',
      management: '투숙객 관리',
      section: '고객',
      add: '투숙객 등록',
      search: '투숙객 검색',
      statusActive: '투숙중',
      statusWithdrawn: '체크아웃',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '매니저',
      plural: '매니저',
      management: '매니저 관리',
      section: '운영 인력',
    },
    service: {
      singular: '객실',
      plural: '객실',
      management: '객실 관리',
      section: '객실',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '숙박 예약',
      section: '숙박 일정',
    },
    attendance: {
      noun: '입퇴실',
      checkIn: '체크인',
      checkOut: '체크아웃',
    },
    billing: {
      fee: '숙박료',
      unpaid: '미수금',
      pass: '숙박권',
      payment: '결제',
    },
    facility: {
      place: '게스트하우스',
      owner: '대표',
      room: '객실',
    },
  },
  food: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '방문',
      statusWithdrawn: '종료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '직원',
      plural: '직원',
      management: '직원 관리',
      section: '매장 인력',
    },
    service: {
      singular: '메뉴',
      plural: '메뉴',
      management: '메뉴 관리',
      section: '메뉴',
    },
    schedule: {
      singular: '주문·예약',
      plural: '주문·예약',
      management: '예약 관리',
      section: '운영 일정',
    },
    billing: {
      fee: '결제액',
      unpaid: '미수금',
      pass: '쿠폰',
      payment: '결제',
    },
    facility: {
      place: '매장',
      owner: '대표',
      room: '홀·테이블',
    },
  },
  lesson: {
    customer: {
      singular: '수강생',
      plural: '수강생',
      management: '수강생 관리',
      section: '수강생',
      add: '수강생 등록',
      search: '수강생 검색',
      statusActive: '수강중',
      statusWithdrawn: '수료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '강사',
      plural: '강사',
      management: '강사 관리',
      section: '강사진',
    },
    service: {
      singular: '레슨',
      plural: '레슨',
      management: '레슨 관리',
      section: '레슨',
    },
    schedule: {
      singular: '레슨 일정',
      plural: '레슨 일정',
      management: '레슨 시간표',
      section: '일정',
    },
    attendance: {
      noun: '출결',
      checkIn: '출석',
      checkOut: '종료',
    },
    billing: {
      fee: '레슨비',
      unpaid: '미납 레슨비',
      pass: '레슨권',
      payment: '수납',
    },
    facility: {
      place: '스튜디오',
      owner: '대표',
      room: '레슨실',
    },
  },
  consulting: {
    customer: {
      singular: '내담자',
      plural: '내담자',
      management: '내담자 관리',
      section: '내담자',
      add: '내담자 등록',
      search: '내담자 검색',
      statusActive: '상담중',
      statusWithdrawn: '종결',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '상담사',
      plural: '상담사',
      management: '상담사 관리',
      section: '전문 인력',
    },
    service: {
      singular: '상담',
      plural: '상담',
      management: '상담 프로그램',
      section: '프로그램',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '상담 일정',
      section: '상담 일정',
    },
    billing: {
      fee: '상담료',
      unpaid: '미납금',
      pass: '상담권',
      payment: '결제',
    },
    facility: {
      place: '센터',
      owner: '대표',
      room: '상담실',
    },
  },
  healthcare: {
    customer: {
      singular: '환자',
      plural: '환자',
      management: '환자 관리',
      section: '환자',
      add: '환자 등록',
      search: '환자 검색',
      statusActive: '진료중',
      statusWithdrawn: '완료',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '의료진',
      plural: '의료진',
      management: '의료진 관리',
      section: '의료진',
    },
    service: {
      singular: '진료',
      plural: '진료',
      management: '진료 관리',
      section: '진료과목',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '진료 예약',
      section: '진료 일정',
    },
    billing: {
      fee: '진료비',
      unpaid: '미수금',
      pass: '진료권',
      payment: '수납',
    },
    facility: {
      place: '클리닉',
      owner: '원장',
      room: '진료실',
    },
  },
};

/** 전용 모듈 업종별 커스텀 사전 (기존 ModuleLabels와 100% 일치) */
export const INDUSTRY_DICTIONARIES: Record<string, TerminologyDictionary> = {
  piano: {
    customer: {
      singular: '학생',
      plural: '학생',
      management: '학생 관리',
      section: '학생',
      add: '학생 등록',
      search: '학생 검색',
      statusActive: '재원',
      statusPaused: '휴원',
      statusWithdrawn: '퇴원',
    },
    contact: {
      singular: '학부모',
      plural: '학부모',
      management: '학부모 관리',
    },
    staff: {
      singular: '선생님',
      plural: '선생님',
      management: '선생님 관리',
      section: '선생님',
    },
    service: {
      singular: '반',
      plural: '반',
      management: '반 관리',
      section: '반',
    },
    schedule: {
      singular: '일정',
      plural: '일정',
      management: '주간 시간표',
      section: '일정',
    },
    attendance: {
      noun: '출결',
      checkIn: '등원',
      checkOut: '하원',
    },
    billing: {
      fee: '수강료',
      unpaid: '미납 수강료',
      pass: '회차권',
      payment: '수납',
    },
    facility: {
      place: '학원',
      owner: '원장',
      room: '연습실',
    },
  },
  pilates: {
    customer: {
      singular: '회원',
      plural: '회원',
      management: '회원 관리',
      section: '회원',
      add: '회원 등록',
      search: '회원 검색',
      statusActive: '이용중',
      statusPaused: '휴회',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '강사',
      plural: '강사',
      management: '강사 관리',
      section: '강사',
    },
    service: {
      singular: '수업',
      plural: '수업',
      management: '수업 종류',
      section: '수업',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 캘린더',
      section: '예약',
    },
    attendance: {
      noun: '출석',
      checkIn: '출석',
      checkOut: '퇴실',
    },
    billing: {
      fee: '이용료',
      unpaid: '미납금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '스튜디오',
      owner: '대표',
      room: '스튜디오',
    },
  },
  gym: {
    customer: {
      singular: '회원',
      plural: '회원',
      management: '회원 관리',
      section: '회원 및 보호자',
      add: '회원 등록',
      search: '회원 검색',
      statusActive: '수련중',
      statusWithdrawn: '퇴관',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '강사',
      plural: '강사',
      management: '강사 관리',
      section: '지도진',
    },
    service: {
      singular: '수업반',
      plural: '수업반',
      management: '수업반 관리',
      section: '수업 및 출결',
    },
    schedule: {
      singular: '시간표',
      plural: '시간표',
      management: '주간 시간표',
      section: '수업 일정',
    },
    billing: {
      fee: '회비',
      unpaid: '미납 회비',
      pass: '회원권',
      payment: '결제',
    },
    facility: {
      place: '체육관',
      owner: '관장',
      room: '수련실',
    },
  },
  daycare: {
    customer: {
      singular: '원아',
      plural: '원아',
      management: '원아 관리',
      section: '원아 및 보호자',
      add: '원아 등록',
      search: '원아 검색',
      statusActive: '재원',
      statusWithdrawn: '퇴소',
    },
    contact: {
      singular: '보호자',
      plural: '보호자',
      management: '보호자 관리',
    },
    staff: {
      singular: '교사',
      plural: '교사',
      management: '교사 관리',
      section: '보육 인력',
    },
    service: {
      singular: '반',
      plural: '반',
      management: '반 관리',
      section: '반·출결',
    },
    schedule: {
      singular: '시간표',
      plural: '시간표',
      management: '주간 시간표',
      section: '일과',
    },
    billing: {
      fee: '보육료',
      unpaid: '미납 보육료',
      pass: '이용권',
      payment: '수납',
    },
    facility: {
      place: '어린이집',
      owner: '원장',
      room: '보육실',
    },
  },
  skin_clinic: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '관리사',
      plural: '관리사',
      management: '관리사 관리',
      section: '관리사',
    },
    service: {
      singular: '시술',
      plural: '시술',
      management: '시술',
      section: '시술',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 캘린더',
      section: '예약',
    },
    billing: {
      fee: '시술비',
      unpaid: '미납금',
      pass: '관리권',
      payment: '결제',
    },
    facility: {
      place: '피부관리실',
      owner: '원장',
      room: '관리실',
    },
  },
  retail: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '활동',
      statusWithdrawn: '탈퇴',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '직원',
      plural: '직원',
      management: '직원 관리',
      section: '직원',
    },
    service: {
      singular: '상품',
      plural: '상품',
      management: '상품 관리',
      section: '상품',
    },
    schedule: {
      singular: '판매',
      plural: '판매',
      management: '판매',
      section: '판매',
    },
    billing: {
      fee: '결제액',
      unpaid: '미수금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '매장',
      owner: '대표',
      room: '매장',
    },
  },
  skin: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '관리사',
      plural: '관리사',
      management: '관리사 관리',
      section: '관리사',
    },
    service: {
      singular: '시술',
      plural: '시술',
      management: '시술',
      section: '시술',
    },
    schedule: {
      singular: '예약',
      plural: '예약',
      management: '예약 캘린더',
      section: '예약',
    },
    billing: {
      fee: '시술비',
      unpaid: '미납금',
      pass: '관리권',
      payment: '결제',
    },
    facility: {
      place: '피부관리실',
      owner: '원장',
      room: '관리실',
    },
  },
  sauna_jjimjilbang: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '직원',
      plural: '직원',
      management: '직원 관리',
      section: '근무 인력',
    },
    service: {
      singular: '시설',
      plural: '시설',
      management: '시설 관리',
      section: '시설',
    },
    schedule: {
      singular: '일정',
      plural: '일정',
      management: '일정',
      section: '운영 일정',
    },
    billing: {
      fee: '이용료',
      unpaid: '미납금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '사우나',
      owner: '대표',
      room: '시설',
    },
  },
  bath: {
    customer: {
      singular: '고객',
      plural: '고객',
      management: '고객 관리',
      section: '고객',
      add: '고객 등록',
      search: '고객 검색',
      statusActive: '이용중',
      statusWithdrawn: '만료',
    },
    contact: {
      singular: '연락처',
      plural: '연락처',
      management: '연락처 관리',
    },
    staff: {
      singular: '직원',
      plural: '직원',
      management: '직원 관리',
      section: '근무 인력',
    },
    service: {
      singular: '시설',
      plural: '시설',
      management: '시설 관리',
      section: '시설',
    },
    schedule: {
      singular: '일정',
      plural: '일정',
      management: '일정',
      section: '운영 일정',
    },
    billing: {
      fee: '이용료',
      unpaid: '미납금',
      pass: '이용권',
      payment: '결제',
    },
    facility: {
      place: '사우나',
      owner: '대표',
      room: '시설',
    },
  },
  // 다업종 프리셋 카테고리 매핑
  study_cafe: CATEGORY_DICTIONARIES.studio,
  shared_office: CATEGORY_DICTIONARIES.studio,
  space_rental: CATEGORY_DICTIONARIES.studio,
  locker_storage: CATEGORY_DICTIONARIES.studio,
  guesthouse: CATEGORY_DICTIONARIES.travel,
  small_hotel: CATEGORY_DICTIONARIES.travel,
  auto_repair: CATEGORY_DICTIONARIES.automotive,
  self_carwash: CATEGORY_DICTIONARIES.automotive,
  cleaning_service: CATEGORY_DICTIONARIES.property,
  pet_hotel: CATEGORY_DICTIONARIES.pet,
  pet_grooming: CATEGORY_DICTIONARIES.pet,
  equipment_rental: CATEGORY_DICTIONARIES.studio,
  craft_repair: CATEGORY_DICTIONARIES.studio,
  tattoo_studio: CATEGORY_DICTIONARIES.beauty,
  photo_studio: CATEGORY_DICTIONARIES.studio,
  barber_shop: CATEGORY_DICTIONARIES.beauty,
  hair_salon: CATEGORY_DICTIONARIES.beauty,
  nail_salon: CATEGORY_DICTIONARIES.beauty,
  massage_spa: CATEGORY_DICTIONARIES.wellness,
  yoga_studio: CATEGORY_DICTIONARIES.fitness,
  pt_fitness: CATEGORY_DICTIONARIES.fitness,
  indoor_golf: CATEGORY_DICTIONARIES.fitness,
  swim_school: CATEGORY_DICTIONARIES.fitness,
  climbing_activity: CATEGORY_DICTIONARIES.fitness,
  boxing_mma: CATEGORY_DICTIONARIES.fitness,
  convenience_store: CATEGORY_DICTIONARIES.retail,
  pet_supplies: CATEGORY_DICTIONARIES.retail,
  apparel_store: CATEGORY_DICTIONARIES.retail,
  cafe: CATEGORY_DICTIONARIES.food,
  restaurant: CATEGORY_DICTIONARIES.food,
};

/**
 * 피아노/학원 외 일반 사업장용 중립 기본 사전.
 * 비학원 업종에 학원·원장·학생·수강료 용어가 잘못 노출되는 것을 방지합니다.
 */
export const GENERIC_BUSINESS_TERMINOLOGY_DICTIONARY: TerminologyDictionary = {
  customer: {
    singular: '고객',
    plural: '고객',
    management: '고객 관리',
    section: '고객',
    add: '고객 등록',
    search: '고객 검색',
    statusActive: '이용중',
    statusPaused: '정지',
    statusWithdrawn: '종료',
  },
  contact: {
    singular: '연락처',
    plural: '연락처',
    management: '연락처 관리',
  },
  staff: {
    singular: '직원',
    plural: '직원',
    management: '직원 관리',
    section: '직원',
  },
  service: {
    singular: '서비스',
    plural: '서비스',
    management: '서비스 관리',
    section: '서비스',
  },
  schedule: {
    singular: '일정',
    plural: '일정',
    management: '일정',
    section: '일정',
  },
  attendance: {
    noun: '출입',
    checkIn: '입실',
    checkOut: '퇴실',
  },
  billing: {
    fee: '이용료',
    unpaid: '미납금',
    pass: '이용권',
    payment: '결제',
  },
  facility: {
    place: '사업장',
    owner: '대표',
    room: '공간',
  },
};

/**
 * 업종 ID(또는 alias)에 기반하여 최적의 용어 사전을 반환합니다.
 *
 * 해결 순서:
 * 1. industry 값이 없으면 DEFAULT_TERMINOLOGY_DICTIONARY
 * 2. 원시 문자열(rawKey) 또는 정규화된 업종 전용 사전 매칭
 * 3. 카탈로그 정의의 category에 매핑된 사전 (education, fitness, beauty, wellness, childcare, studio, automotive 등)
 * 4. 교육/학원 관련 업종이면 DEFAULT_TERMINOLOGY_DICTIONARY (학원/원장/학생/수강료)
 * 5. 그 외 일반 업종은 GENERIC_BUSINESS_TERMINOLOGY_DICTIONARY (사업장/대표/고객/이용료)
 */
export function getTerminologyDictionary(
  industry: IndustryType | string | null | undefined,
  locale: 'ko' | 'en' = 'ko'
): TerminologyDictionary {
  if (locale === 'en') {
    return DEFAULT_EN_TERMINOLOGY_DICTIONARY;
  }

  if (!industry) {
    return DEFAULT_TERMINOLOGY_DICTIONARY;
  }

  const rawKey = String(industry).trim();
  if (INDUSTRY_DICTIONARIES[rawKey]) {
    return INDUSTRY_DICTIONARIES[rawKey];
  }

  const normalized = normalizeIndustryType(industry);
  if (normalized && INDUSTRY_DICTIONARIES[normalized]) {
    return INDUSTRY_DICTIONARIES[normalized];
  }

  // 카탈로그 정의의 category 매핑 사전
  const lookupKey = normalized ?? rawKey;
  const definition = getIndustryDefinition(lookupKey);
  const cat = definition?.category;
  if (cat && CATEGORY_DICTIONARIES[cat]) {
    return CATEGORY_DICTIONARIES[cat];
  }
  if (cat === 'childcare' && CATEGORY_DICTIONARIES.daycare) {
    return CATEGORY_DICTIONARIES.daycare;
  }

  // 명시적 교육/학원 업종이면 DEFAULT_TERMINOLOGY_DICTIONARY
  if (rawKey === 'piano' || rawKey === 'academy' || cat === 'education') {
    return DEFAULT_TERMINOLOGY_DICTIONARY;
  }

  // 피아노/학원 외 일반 업종의 경우 학원 전용 용어 노출을 방지하는 중립 사전 반환
  return GENERIC_BUSINESS_TERMINOLOGY_DICTIONARY;
}


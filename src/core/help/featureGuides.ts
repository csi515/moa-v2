import {
  PIN_ATTENDANCE_DIRECTOR_COPY,
  PIN_ATTENDANCE_PARENT_COPY,
} from '@/core/attendance/attendanceNotifyCopy';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import {
  buildBillingSection,
  buildClassesSection,
  buildCustomerSection,
  buildGuideSection,
  buildStaffSection,
  type FeatureGuideSection,
} from './guideBuilders';

export type { FeatureGuideItem, FeatureGuideSection } from './guideBuilders';

/** 공통 — 모든 업종 */
const COMMON_FINANCE: FeatureGuideSection = {
  id: 'finance',
  title: '재무',
  description: '사업장 수입·지출을 한곳에서 관리합니다.',
  items: [
    {
      id: 'finance',
      title: '재무 요약',
      summary: '이번 달 수입·지출·손익을 한눈에 봅니다.',
    },
    {
      id: 'income',
      title: '수입 관리',
      summary: '수강료 외 수입(교재 판매, 기타)을 기록합니다.',
    },
    {
      id: 'expenses',
      title: '지출 관리',
      summary: '임대료·인건비·소모품 등 지출을 기록합니다.',
    },
    {
      id: 'payroll',
      title: '강사 정산',
      summary: '강사별 지급 기준(수업·출근·근무시간·월급)으로 금액을 계산·확정하고 지출로 등록합니다.',
      howTo: '강사 정보에 정산 방식·지급 기준을 넣은 뒤, 수납(재무) > 강사정산에서 월별 실적을 확인하고 정산 확정 → 지출 등록하세요. 출근·근무시간은 자동 집계가 없어 정산 시 직접 입력합니다.',
    },
  ],
};

const COMMON_SETTINGS: FeatureGuideSection = {
  id: 'settings',
  title: '설정',
  description: '사업장 기본 정보와 기능 on/off를 다룹니다.',
  items: [
    {
      id: 'settings',
      title: '사업장 설정',
      summary: '상호·연락처·계좌·출입(핀번호) 사용 여부를 설정합니다.',
      howTo: '출입 관리를 쓰면 PIN 출석 메뉴가 열리고, 끄면 메뉴가 숨겨집니다.',
    },
    {
      id: 'attendance',
      title: '출입 관리 (핀번호)',
      summary: '회원마다 PIN을 주고, 키패드로 출석(입실)을 남깁니다.',
      howTo: PIN_ATTENDANCE_DIRECTOR_COPY.helpHowTo,
    },
  ],
};

/** 공통 — 학부모 안내장 (전 업종) */
const COMMON_NOTICES: FeatureGuideSection = {
  id: 'notices',
  title: '안내장',
  description: '학부모(보호자) 포털에 안내장·가정통신문을 게시합니다.',
  items: [
    {
      id: 'notices',
      title: '안내장 · 가정통신문',
      summary: '전체·반·개별 대상으로 안내를 작성해 포털에 게시합니다.',
      howTo:
        '작성 후 「포털에 게시」하면 학부모 앱의 안내 탭에 표시됩니다. 알림은 앱 푸시로만 전달되며 카카오·문자는 보내지 않습니다.',
    },
  ],
};

const PIANO_GUIDE: FeatureGuideSection[] = [
  buildGuideSection({
    id: 'home',
    title: '홈',
    description: '오늘 일정·출결·상담·미납을 빠르게 확인합니다.',
    items: [
      {
        id: 'dashboard',
        title: '홈',
        summary: '오늘 필요한 업무 요약과 바로가기를 봅니다.',
      },
    ],
  }),
  buildCustomerSection({
    title: '학생',
    description: '등록 학생과 보호자 연락처를 관리합니다.',
    customerItem: {
      id: 'students',
      title: '학생 관리',
      summary: '학생 등록, 재원/휴원/퇴원, 담당 강사·반을 관리합니다.',
    },
    parentItem: {
      id: 'parents',
      title: '학부모 관리',
      summary: '학부모 연락처와 연결된 학생을 관리합니다.',
    },
  }),
  buildGuideSection({
    id: 'schedule',
    title: '일정',
    description: '수업 시간표·반·캘린더·커리큘럼을 관리합니다.',
    items: [
      {
        id: 'timetable',
        title: '주간 시간표',
        summary: '요일별 수업 일정을 한 화면에서 확인합니다.',
      },
      {
        id: 'classes',
        title: '반/수업 관리',
        summary: '수업 반(요일·시간·정원·강사)을 만듭니다.',
      },
      {
        id: 'calendar',
        title: '캘린더',
        summary: '휴강·행사 등 사업장 일정을 표시합니다.',
      },
      {
        id: 'curriculum',
        title: '커리큘럼·진도',
        summary: '레벨별 커리큘럼과 학생 진도를 관리합니다.',
      },
    ],
  }),
  buildGuideSection({
    id: 'attendance',
    title: '수업',
    description: '출입·오늘 수업·보강을 처리합니다.',
    items: [
      {
        id: 'attendance',
        title: '출입 관리',
        summary: 'PIN으로 출석(입실)을 기록하고 당일 현황을 봅니다.',
        howTo:
          '설정에서 PIN 출석을 켠 뒤 키오스크에서 처리합니다. 연결된 학부모는 앱 안내에서 출석 알림을 확인할 수 있습니다. 오늘 수업의 직접 출석은 이 PIN 출석 알림과 다릅니다.',
      },
      {
        id: 'lessons',
        title: '오늘 수업',
        summary: '출석·수업 노트·과제를 한 화면에서 저장합니다.',
        howTo: '오늘 수업 학생을 선택한 뒤 출석·노트·과제·다음곡을 한 화면에서 저장합니다. 과제는 학부모 앱에, 다음곡은 커리큘럼 진도에 반영됩니다.',
      },
      {
        id: 'assignments',
        title: '주간 과제',
        summary: '학생별 주간 연습 과제를 관리합니다.',
      },
      {
        id: 'makeups',
        title: '보강 수업',
        summary: '결석한 학생의 보강 일정을 시간·연습실·강사와 함께 잡습니다.',
        howTo:
          '일정 등록 시 강사·연습실 충돌이 있으면 확인 후 저장할 수 있습니다. 등록 즉시 학부모 포털 알림과 앱 푸시가 전달됩니다.',
      },
      {
        id: 'practice-rooms',
        title: '연습실 예약',
        summary: '학생별 연습실 사용 시간을 잡고 수업·보강과 충돌을 확인합니다.',
        howTo: '일정 > 연습실에서 예약합니다. 학부모 일정 탭과 앱 푸시로 안내됩니다.',
      },
    ],
  }),
  buildGuideSection({
    id: 'consultation',
    title: '상담',
    description: '상담 예약·기록·가능 시간을 관리합니다.',
    items: [
      {
        id: 'consultations',
        title: '상담',
        summary: '예약 관리, 상담 기록, 상담 가능 시간을 한곳에서 처리합니다.',
        howTo: '설정 → 부가 → 상담 가능시간 → 예약 슬롯 동기화 → 공개 페이지에서 학부모가 신청 → 예약 관리에서 확정',
      },
    ],
  }),
  buildBillingSection({
    description: '수강료 청구·회차권·미납을 관리합니다.',
    tuitionTitle: '수강료 및 수납',
    tuitionSummary:
      '월회비 학생의 청구서를 만들고 입금을 기록합니다. 설정에서 교재·연주회비를 월 청구에 합산할 수 있습니다. 회차권 학생은 월 청구에서 제외됩니다.',
    unpaidSummary: '미납 학생을 모아 보고 연락·수납을 이어갑니다.',
  }),
  buildGuideSection({
    id: 'passes',
    title: '회차권',
    description: '횟수제 회차권을 발급·차감합니다.',
    items: [
      {
        id: 'passes',
        title: '회차권 관리',
        summary: '학생별 회차권을 등록하고 잔여 횟수를 확인합니다.',
        howTo:
          '학생 수강 형태를 회차권으로 두고 「회차권」메뉴에서 발급하세요. 수업 출석 시 1회 자동 차감됩니다.',
      },
    ],
  }),
  buildGuideSection({
    id: 'extras',
    title: '추가 기능',
    description: '자주 쓰지 않는 운영·교육 메뉴입니다. 사이드바 하단에서 열 수 있습니다.',
    items: [
      {
        id: 'practice',
        title: '연습 기록',
        summary: '학생·학부모가 남긴 연습 시간과 내용을 확인하고 피드백합니다.',
        howTo: '학부모가 앱에서 연습 일지를 올리면 여기서 확인·평가할 수 있습니다.',
      },
      {
        id: 'textbooks',
        title: '교재 판매',
        summary: '교재 판매·재고·수납을 관리합니다. 미납 교재는 월 청구 합산 옵션으로 월회비와 함께 청구할 수 있습니다.',
      },
      // resources(교재·곡 자료): 당분간 안내에서도 숨김 — 기능 코드는 유지
      {
        id: 'recitals',
        title: '연주회·콩쿠르',
        summary: '연주회·콩쿠르 참가와 영상 현황을 관리합니다.',
      },
      {
        id: 'achievements',
        title: '시험·등급',
        summary: '급수·콩쿠르·시험 결과를 학생별로 기록합니다.',
      },
      {
        id: 'reports',
        title: '학습 리포트',
        summary: '월간 학습 리포트를 작성해 학부모 포털에 게시합니다.',
        howTo: '게시하면 학부모 홈·리포트 탭에서 확인할 수 있습니다.',
      },
      {
        id: 'teachers',
        title: '선생님 관리',
        summary: '강사 정보·시급/월급·담당 반을 관리합니다.',
      },
      {
        id: 'enrollment-requests',
        title: '등록 요청',
        summary:
          '성인 자가가입(Customer Join)과 학부모 자녀 등록(Guardian Enrollment)을 구분해 승인합니다.',
        howTo:
          '자녀 연결은 「학부모 자녀 등록」에서, 본인 계정 가입은 「수강생 자가가입」에서 처리합니다. 이미 학생으로 등록된 경우는 학생 상세의 학부모 연결 QR을 사용하세요.',
      },
    ],
  }),
  buildGuideSection({
    id: 'parent-portal-piano',
    title: '학부모 포털',
    description:
      '학부모가 앱에서 과제·진도·연습·안내·출석 알림을 확인합니다. 카카오·문자는 보내지 않습니다.',
    items: [
      {
        id: 'parent-home',
        title: '홈·과제·진도',
        summary: '수업 피드백, 주간 과제, 진도·연습 일지, 학습 리포트를 봅니다.',
        howTo: '하단 메뉴와 홈 바로가기로 과제·진도·리포트로 이동합니다.',
      },
      {
        id: 'parent-push',
        title: '출석·앱 알림',
        summary: PIN_ATTENDANCE_PARENT_COPY.helpSummary,
        howTo: PIN_ATTENDANCE_PARENT_COPY.helpHowTo,
      },
    ],
  }),
  COMMON_NOTICES,
  COMMON_FINANCE,
  COMMON_SETTINGS,
];

const PILATES_GUIDE: FeatureGuideSection[] = [
  {
    id: 'schedule',
    title: '예약·수업',
    description: '회원 예약과 수업 종류를 관리합니다.',
    items: [
      {
        id: 'bookings',
        title: '예약 캘린더',
        summary: '날짜·시간별로 회원 예약을 잡고 상태를 바꿉니다.',
        howTo: '예약 → 날짜 선택 → 회원·수업을 고르면 됩니다.',
      },
      {
        id: 'services',
        title: '수업 종류',
        summary: '그룹·개인 등 수업 상품(시간·가격)을 등록합니다.',
      },
    ],
  },
  {
    id: 'customers',
    title: '회원·강사',
    description: '회원과 강사 정보를 관리합니다.',
    items: [
      {
        id: 'members',
        title: '회원 관리',
        summary: '회원 등록·연락처·상태를 관리합니다.',
      },
      {
        id: 'instructors',
        title: '강사 관리',
        summary: '강사 정보와 담당 수업을 관리합니다.',
      },
      {
        id: 'attendance',
        title: '출입 관리',
        summary: 'PIN으로 출석(입실)을 기록합니다. (설정에서 켠 경우에만, 퇴실 PIN 없음)',
      },
    ],
  },
  COMMON_NOTICES,
  COMMON_FINANCE,
  COMMON_SETTINGS,
];

const GYM_GUIDE: FeatureGuideSection[] = [
  buildCustomerSection({
    title: '회원·보호자',
    description: '등록 회원과 보호자 연락처, 수업 레벨을 관리합니다.',
    customerItem: {
      id: 'students',
      title: '회원 관리',
      summary: '회원 등록, 재적/휴원/퇴원, 담당 강사·반·수업 레벨을 관리합니다.',
      howTo: '회원 등록 시 보호자 연락처와 PIN을 함께 설정할 수 있습니다.',
    },
    parentItem: {
      id: 'parents',
      title: '보호자 관리',
      summary: '보호자 연락처와 연결된 회원을 관리합니다.',
    },
  }),
  buildClassesSection({
    title: '수업·출결·차량',
    description: '수업반, 시간표, PIN 출입, 차량 운행을 다룹니다.',
    items: [
      {
        id: 'classes',
        title: '수업반 관리',
        summary: '연령·레벨별 수업반(요일·시간·정원·강사)을 만듭니다.',
      },
      {
        id: 'timetable',
        title: '주간 시간표',
        summary: '요일별 수업 일정을 한 화면에서 확인합니다.',
      },
      {
        id: 'attendance',
        title: '출입 관리',
        summary: 'PIN으로 출석(입실)을 기록하고 당일 현황을 봅니다. (퇴실 PIN 없음)',
      },
      {
        id: 'shuttle',
        title: '차량 운행',
        summary: '학부모 차량 운행 신청을 확인하고 픽업·하원 운행을 확정·완료합니다.',
        howTo:
          '회원에 셔틀 주소가 있으면 신청 시 자동으로 채워집니다. 학부모 포털의 「차량」 메뉴에서도 신청할 수 있습니다.',
      },
    ],
  }),
  buildBillingSection({
    description: '수강료 청구·미납을 관리합니다.',
    tuitionTitle: '수강료 및 수납',
    tuitionSummary: '월 수강료 청구서를 만들고 입금을 기록합니다.',
    unpaidSummary: '미납 회원을 모아 보고 연락·수납을 이어갑니다.',
  }),
  buildStaffSection({
    title: '지도진',
    description: '강사와 체육관 일정을 관리합니다.',
    teacherTitle: '강사 관리',
    teacherSummary: '강사 정보와 담당 반을 관리합니다.',
    calendarTitle: '체육관 캘린더',
    calendarSummary: '대회·행사·휴관 일정을 기록합니다.',
  }),
  COMMON_NOTICES,
  COMMON_FINANCE,
  COMMON_SETTINGS,
];

const DAYCARE_GUIDE: FeatureGuideSection[] = [
  buildCustomerSection({
    title: '원아·보호자',
    description: '등록 원아와 보호자 연락처, 연령반을 관리합니다.',
    customerItem: {
      id: 'students',
      title: '원아 관리',
      summary: '원아 등록, 재원/휴원/퇴원, 담당 교사·반·연령반을 관리합니다.',
      howTo: '원아 등록 시 보호자 연락처, 알레르기·특이사항, 등하원 PIN을 함께 설정할 수 있습니다.',
    },
    parentItem: {
      id: 'parents',
      title: '보호자 관리',
      summary: '보호자 연락처와 연결된 원아를 관리합니다.',
    },
  }),
  buildClassesSection({
    title: '반·등하원',
    description: '반 편성, 시간표, PIN 등하원을 다룹니다.',
    items: [
      {
        id: 'classes',
        title: '반 관리',
        summary: '연령별 반(요일·시간·정원·교사)을 만듭니다.',
      },
      {
        id: 'timetable',
        title: '주간 시간표',
        summary: '요일별 일과·수업 일정을 한 화면에서 확인합니다.',
      },
      {
        id: 'attendance',
        title: '등·하원 관리',
        summary: 'PIN으로 등원을 기록하고, 알레르기 표시·하원 메모를 남깁니다. (PIN 하원 없음)',
        howTo:
          '현황에서 원아별 특이사항을 확인하고, 당일 세션에 하원·전달 메모를 작성할 수 있습니다. PIN 등원이 저장되면 연결된 보호자는 앱 안내에서 출석 알림을 확인할 수 있습니다.',
      },
    ],
  }),
  {
    id: 'care',
    title: '보육 기록',
    description: '알림장·투약·아동 기록·사고로 보호자와 하루 생활을 공유합니다.',
    items: [
      {
        id: 'journals',
        title: '알림장',
        summary: '원아별 식사·낮잠·활동·건강과 선생님 한마디를 남깁니다.',
        howTo: '날짜를 고른 뒤 원아를 선택해 알림장을 작성합니다. 보호자 포털에서 바로 확인할 수 있습니다.',
      },
      {
        id: 'medications',
        title: '투약 관리',
        summary: '보호자 투약 의뢰를 접수하고 투약 완료를 기록합니다.',
        howTo:
          '원에서 직접 등록하거나, 보호자가 포털에서 의뢰한 건을 확인한 뒤 투약하면 「투약 완료」로 표시합니다.',
      },
      {
        id: 'child-records',
        title: '아동 기록·사고',
        summary: '예방접종 확인, 올해 건강검진, 알레르기, 귀가 동의와 사고 내용을 남깁니다.',
        howTo:
          '보육의 「기록」에서 빠진 원아를 눌러 확인하고, 사고는 저장하면 보호자에게 알립니다. 사진은 받지 않습니다.',
      },
      {
        id: 'compliance-logs',
        title: '보건증·안전·보존식·열람',
        summary: '보건증 만료, 안전점검, 보존식 시각, CCTV 열람 신청을 보육 기록에 모읍니다.',
        howTo:
          '보육의 「기록」-「운영」에서 확인합니다. 만료 30일 전부터 경고가 뜨고, 점검 화면은 인쇄합니다.',
      },
      {
        id: 'consultations',
        title: '상담 이력',
        summary: '보호자 상담 내용을 남겨 둡니다.',
      },
      {
        id: 'parent-portal-care',
        title: '보호자 포털 (알림장·투약)',
        summary: '보호자가 앱에서 알림장을 보고 투약 의뢰·등하원·안내장을 확인합니다.',
        howTo:
          '보호자 계정으로 로그인하면 어린이집 전용 메뉴(알림장·투약·안내·등하원·보육료)가 보입니다.',
      },
    ],
  },
  buildBillingSection({
    description: '보육료 청구·미납을 관리합니다.',
    tuitionTitle: '보육료 및 수납',
    tuitionSummary: '월 보육료 청구서를 만들고 입금을 기록합니다.',
    unpaidSummary: '미납 원아를 모아 보고 연락·수납을 이어갑니다.',
  }),
  buildStaffSection({
    title: '보육 인력',
    description: '교사와 원 일정을 관리합니다.',
    teacherTitle: '교사 관리',
    teacherSummary: '교사 정보와 담당 반을 관리합니다.',
    calendarTitle: '원 캘린더',
    calendarSummary: '행사·휴원·체험학습 일정을 기록합니다.',
  }),
  COMMON_NOTICES,
  COMMON_FINANCE,
  COMMON_SETTINGS,
];

const GUIDE_BY_INDUSTRY: Partial<Record<IndustryType, FeatureGuideSection[]>> = {
  piano: PIANO_GUIDE,
  pilates: PILATES_GUIDE,
  gym: GYM_GUIDE,
  daycare: DAYCARE_GUIDE,
};

const INTRO_BY_INDUSTRY: Partial<Record<IndustryType, { title: string; body: string }>> = {
  piano: {
    title: '피아노학원 기능 안내',
    body: '학생·수업·수납·교육 기록을 중심으로 학원을 운영하는 메뉴입니다. 아래에서 각 기능이 무엇을 하는지 확인해 보세요.',
  },
  pilates: {
    title: '필라테스 스튜디오 기능 안내',
    body: '회원 예약·수업 종류·강사·재무를 중심으로 스튜디오를 운영하는 메뉴입니다. 아래에서 각 기능이 무엇을 하는지 확인해 보세요.',
  },
  gym: {
    title: '체육관 기능 안내',
    body: '회원·수업반·출결·차량 운행·수강료를 중심으로 체육관을 운영하는 메뉴입니다. 아래에서 각 기능이 무엇을 하는지 확인해 보세요.',
  },
  daycare: {
    title: '어린이집 기능 안내',
    body: '원아·연령반·등하원·알림장·투약·가정통신문·보육료를 중심으로 어린이집을 운영하는 메뉴입니다. 아래에서 각 기능이 무엇을 하는지 확인해 보세요.',
  },
};

const GENERIC_INTRO = {
  title: '사업장 기능 안내',
  body: '설정·계정 등 공통 기능을 사용할 수 있습니다. 업종 전용 업무 기능은 순차적으로 제공됩니다.',
};

const GENERIC_GUIDE: FeatureGuideSection[] = [COMMON_SETTINGS];

export function getIndustryFeatureGuide(industry: IndustryType | string | null | undefined): {
  intro: { title: string; body: string };
  sections: FeatureGuideSection[];
} {
  const type = normalizeIndustryType(industry);
  return {
    intro: (type && INTRO_BY_INDUSTRY[type]) || GENERIC_INTRO,
    sections: (type && GUIDE_BY_INDUSTRY[type]) || GENERIC_GUIDE,
  };
}

/** 성인 수강생(본인) 포털 이용 안내 */
const ADULT_STUDENT_PORTAL_SECTIONS: FeatureGuideSection[] = [
  {
    id: 'adult-home',
    title: '홈',
    description: '이용권·미납·오늘 출결·최근 알림을 한눈에 봅니다.',
    items: [
      {
        id: 'adult-pass',
        title: '이용권·미납',
        summary: '잔여 이용권과 사업장이 발송한 청구서의 미납만 표시됩니다.',
        howTo: '초안(미발송) 청구서는 보이지 않습니다. 청구서를 눌러 계좌·현금영수증을 확인하세요.',
      },
      {
        id: 'adult-alerts',
        title: '청구·잔여 알림',
        summary: '청구서 도착·이용권 잔여 부족 시 홈 상단에 안내가 뜹니다.',
      },
    ],
  },
  {
    id: 'adult-schedule-attendance',
    title: '일정·출결',
    description: '이번 주 수업과 출입 기록을 확인합니다.',
    items: [
      {
        id: 'adult-schedule',
        title: '일정',
        summary: '오늘·이번 주 수업과 연습실 예약을 모아서 봅니다.',
      },
      {
        id: 'adult-attendance',
        title: '출결',
        summary: '출석·보강 등 출결 기록을 확인합니다.',
        howTo: '키오스크·PIN 출석은 사업장에서 기능을 켠 경우에만 사용할 수 있습니다.',
      },
    ],
  },
  {
    id: 'adult-practice',
    title: '연습실',
    description: '피아노학원에서만 표시됩니다.',
    items: [
      {
        id: 'adult-practice-book',
        title: '예약·취소',
        summary: '날짜별 빈 시간을 골라 예약하고, 내 예약을 취소할 수 있습니다.',
        howTo: '취소는 되돌릴 수 없으니 확인 후 진행하세요. 충돌·운영시간 밖은 예약되지 않습니다.',
      },
    ],
  },
  {
    id: 'adult-notices-billing',
    title: '알림·수납',
    description: '사업장 안내와 청구·납부 안내입니다. 앱 안에서 확인하고, 알림 허용 시 휴대폰 알림을 받을 수 있습니다.',
    items: [
      {
        id: 'adult-notices',
        title: '알림함',
        summary: '홈의 최근 알림과 계정 탭에서 안내·청구·출결 알림을 확인합니다.',
        howTo:
          '카카오·문자는 보내지 않습니다. 앱 안내함에서 확인할 수 있고, 알림 권한을 허용하면 휴대폰 알림도 받을 수 있습니다.',
      },
      {
        id: 'adult-billing',
        title: '청구서 납부',
        summary: '계좌이체·현장 결제(카드·지역사랑상품권 등)로 정산합니다. 앱 자동결제는 없습니다.',
        howTo: '청구서 상세에서 계좌번호를 복사하거나, 현금영수증 발행을 요청할 수 있습니다.',
      },
    ],
  },
];

export function getAdultStudentPortalGuide(industry?: IndustryType | string | null): {
  intro: { title: string; body: string };
  sections: FeatureGuideSection[];
} {
  const type = industry ? normalizeIndustryType(industry) : null;
  const sections =
    type === 'piano'
      ? ADULT_STUDENT_PORTAL_SECTIONS
      : ADULT_STUDENT_PORTAL_SECTIONS.filter((s) => s.id !== 'adult-practice');

  return {
    intro: {
      title: '성인 수강생 이용 안내',
      body: '본인 계정으로 일정·출결·청구·알림을 확인합니다. 자녀 연결은 학부모 포털을 이용하세요.',
    },
    sections,
  };
}

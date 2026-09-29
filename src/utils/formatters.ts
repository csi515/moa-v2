import { AttendanceStatus, InvoiceStatus, StudentStatus } from '../types';

export function formatNumberWithCommas(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('ko-KR');
}

export function parseNumberFromFormatted(str: string): number {
  if (!str) return 0;
  const clean = String(str).replace(/[^0-9]/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₩0';
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function formatWon(amount: number): string {
  if (isNaN(amount)) return '0원';
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

export function formatKoreanDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[d.getDay()];
    return `${y}년 ${m}월 ${day}일 (${dayName})`;
  } catch {
    return dateStr;
  }
}

export function formatPhone(phone?: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export function getAttendanceBadge(status: AttendanceStatus): { label: string; bg: string; text: string; dot: string } {
  switch (status) {
    case 'present':
      return { label: '출석', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'absent':
      return { label: '결석', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' };
    case 'late':
      return { label: '지각', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'early_leave':
      return { label: '조퇴', bg: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' };
    case 'make_up':
      return { label: '보강', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' };
    default:
      return { label: '미체크', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };
  }
}

export function getInvoiceStatusBadge(status: InvoiceStatus): { label: string; bg: string; text: string } {
  switch (status) {
    case 'paid':
      return { label: '납부 완료', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', text: 'text-emerald-700' };
    case 'partial':
      return { label: '일부 납부', bg: 'bg-amber-50 text-amber-700 border border-amber-200', text: 'text-amber-700' };
    case 'unpaid':
      return { label: '미납', bg: 'bg-rose-50 text-rose-700 border border-rose-200', text: 'text-rose-700' };
    case 'overdue':
      return { label: '연체', bg: 'bg-rose-100 text-rose-800 border border-rose-300', text: 'text-rose-800' };
    case 'cancelled':
      return { label: '취소', bg: 'bg-slate-100 text-slate-600 border border-slate-200', text: 'text-slate-600' };
    default:
      return { label: '-', bg: 'bg-slate-100 text-slate-700 border border-slate-200', text: 'text-slate-700' };
  }
}

export function getStudentStatusBadge(status: StudentStatus): { label: string; bg: string; text: string } {
  switch (status) {
    case 'active':
      return { label: '재원', bg: 'bg-blue-50 text-blue-700 border border-blue-200', text: 'text-blue-700' };
    case 'leave':
      return { label: '휴원', bg: 'bg-amber-50 text-amber-700 border border-amber-200', text: 'text-amber-700' };
    case 'withdrawn':
      return { label: '퇴원', bg: 'bg-slate-100 text-slate-600 border border-slate-200', text: 'text-slate-600' };
    default:
      return { label: '-', bg: 'bg-slate-100 text-slate-700 border border-slate-200', text: 'text-slate-700' };
  }
}

export function getLevelColor(level?: string): string {
  if (!level) return 'bg-slate-100 text-slate-700';
  if (level.includes('세반') || level === '혼합반' || level === '방과후') {
    return 'bg-sky-100 text-sky-800 border-sky-200';
  }
  if (level === '어린이') return 'bg-sky-100 text-sky-800 border-sky-200';
  if (level === '초급') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (level === '중급') return 'bg-amber-100 text-amber-900 border-amber-200';
  if (level === '고급' || level === '선수반') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (level === '성인' || level === '시니어') return 'bg-slate-100 text-slate-800 border-slate-200';
  if (level.includes('바이엘')) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (level.includes('체르니 100')) return 'bg-teal-100 text-teal-800 border-teal-200';
  if (level.includes('체르니 30')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (level.includes('소나티네') || level.includes('명곡')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (level.includes('콩쿠르') || level.includes('입시')) return 'bg-pink-100 text-pink-800 border-pink-200';
  if (level.includes('성인')) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function getExpenseCategoryLabel(category?: string): string {
  switch (category) {
    case 'rent':
      return '임대료';
    case 'utility':
      return '관리비/공과금';
    case 'piano_tuning':
      return '피아노 조율/수리';
    case 'textbook':
      return '교재/악보 구입';
    case 'snacks':
      return '간식/비품';
    case 'teacher_salary':
      return '강사료';
    case 'salary':
      return '인건비/급여';
    case 'instructor_fee':
      return '강사료';
    case 'other':
      return '기타 운영비';
    default:
      return category || '기타';
  }
}


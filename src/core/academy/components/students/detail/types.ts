import React from 'react';
import {
  User,
  BookOpen,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Piano,
  Video,
  FileText,
  Clock,
} from 'lucide-react';

export type DetailTab =
  | 'info'
  | 'classes'
  | 'attendance'
  | 'tuition'
  | 'textbooks'
  | 'consultations'
  | 'practice'
  | 'videos'
  | 'memo'
  | 'charts';

export interface DetailTabCounts {
  enrolledClasses: number;
  attRate: number;
  invoiceCount: number;
  salesCount: number;
  consultationCount: number;
  practiceCount: number;
  videoCount: number;
}

export interface DetailTabConfigItem {
  id: DetailTab;
  label: string;
  icon: React.ReactNode;
  group: 'primary' | 'more';
}

const iconClass = 'w-3.5 h-3.5';

/**
 * 학생 상세 탭
 * - primary: 정보 · 수업 · 출결 · 상담 · 수납
 * - more: 활동(메모) · 연습 · 연주영상 · 교재
 */
export function getDetailTabConfig(counts: DetailTabCounts): DetailTabConfigItem[] {
  return [
    {
      id: 'info',
      label: '정보',
      icon: React.createElement(User, { className: iconClass }),
      group: 'primary',
    },
    {
      id: 'classes',
      label: `수업 (${counts.enrolledClasses})`,
      icon: React.createElement(Clock, { className: iconClass }),
      group: 'primary',
    },
    {
      id: 'attendance',
      label: `출결 (${counts.attRate}%)`,
      icon: React.createElement(CheckCircle2, { className: iconClass }),
      group: 'primary',
    },
    {
      id: 'consultations',
      label: `상담 (${counts.consultationCount})`,
      icon: React.createElement(MessageSquare, { className: iconClass }),
      group: 'primary',
    },
    {
      id: 'tuition',
      label: `수납 (${counts.invoiceCount})`,
      icon: React.createElement(CreditCard, { className: iconClass }),
      group: 'primary',
    },
    {
      id: 'memo',
      label: '활동',
      icon: React.createElement(FileText, { className: iconClass }),
      group: 'more',
    },
    {
      id: 'practice',
      label: `연습 (${counts.practiceCount})`,
      icon: React.createElement(Piano, { className: iconClass }),
      group: 'more',
    },
    {
      id: 'videos',
      label: `연주영상 (${counts.videoCount})`,
      icon: React.createElement(Video, { className: iconClass }),
      group: 'more',
    },
    {
      id: 'textbooks',
      label: `교재 (${counts.salesCount})`,
      icon: React.createElement(BookOpen, { className: iconClass }),
      group: 'more',
    },
  ];
}

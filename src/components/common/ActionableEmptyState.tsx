import React from 'react';
import { CalendarPlus, CheckCircle2, UserPlus, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/EmptyState';

const ICONS: Record<string, LucideIcon> = {
  users: UserPlus,
  calendar: CalendarPlus,
  check: CheckCircle2,
};

type Action = { label: string; onClick: () => void };

type Props = {
  title: string;
  description: string;
  iconName: string;
  actionButton?: Action;
  guide?: React.ComponentProps<typeof EmptyState>['guide'];
};

/** EmptyState thin wrapper — 가이드·CTA 계약을 공유한다. */
export function ActionableEmptyState({ title, description, iconName, actionButton, guide }: Props) {
  const Icon = ICONS[iconName] ?? CheckCircle2;
  return (
    <EmptyState
      icon={<Icon className="h-7 w-7" />}
      title={title}
      description={description}
      action={actionButton}
      guide={guide}
      variant={guide ? 'hero' : 'standard'}
    />
  );
}

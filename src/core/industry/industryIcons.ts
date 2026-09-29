import type { ComponentType } from 'react';
import {
  Activity,
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  Car,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  PawPrint,
  Piano,
  Plane,
  Scissors,
  Sparkles,
  Stethoscope,
  Utensils,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { IndustryCategory, IndustryType } from './types';

export const CATEGORY_ICONS: Record<IndustryCategory, LucideIcon> = {
  education: GraduationCap,
  fitness: Dumbbell,
  beauty: Scissors,
  wellness: Sparkles,
  childcare: Baby,
  consulting: Users,
  healthcare: Stethoscope,
  lesson: BookOpen,
  studio: Camera,
  pet: PawPrint,
  automotive: Car,
  property: Home,
  professional: Briefcase,
  event: Heart,
  travel: Plane,
  food: Utensils,
  other: Building2,
};

/** 자주 쓰는 업종 아이콘 (없으면 Building2) */
export const INDUSTRY_ICONS: Partial<Record<IndustryType, ComponentType<{ className?: string }>>> = {
  piano: Piano,
  pilates: Activity,
  gym: Dumbbell,
  daycare: Baby,
  academy: GraduationCap,
  hair_salon: Scissors,
  skin_clinic: Sparkles,
};

export { Building2 as DEFAULT_INDUSTRY_ICON };

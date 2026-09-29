import type {
  Achievement,
  CurriculumItem,
  CurriculumLevel,
  LearningReport,
  StudentCurriculumProgress,
  WeeklyAssignment,
} from '../../types/education';
import type { Parent, Student } from '../../types';
import type { GuardianRelationship, ParentStudentLink } from '../../core/parent/types';
import { STORAGE_KEYS } from '../adapters';
import { generateEntityId, getItem, setItem, type StorageApi } from './helpers';
import { weekStartIsoLocal } from '@/shared/utils/localDate';

/** 보호자 링크 + 교육(커리큘럼·과제·리포트) 도메인 */
export function createParentEducationStorage(api: StorageApi) {
  return {
    getParentStudentLinks(): ParentStudentLink[] {
      const links = getItem<ParentStudentLink[]>(STORAGE_KEYS.PARENT_STUDENT_LINKS, []);
      if (links.length === 0) {
        (api.migrateLegacyParentLinks as () => void)();
        return getItem<ParentStudentLink[]>(STORAGE_KEYS.PARENT_STUDENT_LINKS, []);
      }
      return links;
    },

    saveParentStudentLinks(links: ParentStudentLink[]): void {
      setItem(STORAGE_KEYS.PARENT_STUDENT_LINKS, links);
      (api.rebuildParentStudentIdsFromLinks as () => void)();
    },

    linkParentToStudent(params: {
      parentId: string;
      studentId: string;
      relationship: GuardianRelationship;
      isPrimary?: boolean;
    }): ParentStudentLink {
      const list = (api.getParentStudentLinks as () => ParentStudentLink[])();
      const now = new Date().toISOString();
      const existingIdx = list.findIndex(
        (l) => l.parentId === params.parentId && l.studentId === params.studentId
      );

      if (params.isPrimary) {
        for (const link of list) {
          if (link.studentId === params.studentId) link.isPrimary = false;
        }
      }

      let saved: ParentStudentLink;
      if (existingIdx >= 0) {
        saved = {
          ...list[existingIdx],
          relationship: params.relationship,
          isPrimary: params.isPrimary ?? list[existingIdx].isPrimary,
          updatedAt: now,
        };
        list[existingIdx] = saved;
      } else {
        saved = {
          id: `${params.parentId}:${params.studentId}`,
          parentId: params.parentId,
          studentId: params.studentId,
          relationship: params.relationship,
          isPrimary:
            params.isPrimary ?? list.filter((l) => l.studentId === params.studentId).length === 0,
          createdAt: now,
          updatedAt: now,
        };
        list.push(saved);
      }

      (api.saveParentStudentLinks as (l: ParentStudentLink[]) => void)(list);
      return saved;
    },

    unlinkParentFromStudent(parentId: string, studentId: string): void {
      const list = (api.getParentStudentLinks as () => ParentStudentLink[])().filter(
        (l) => !(l.parentId === parentId && l.studentId === studentId)
      );
      (api.saveParentStudentLinks as (l: ParentStudentLink[]) => void)(list);
    },

    rebuildParentStudentIdsFromLinks(): void {
      const links = getItem<ParentStudentLink[]>(STORAGE_KEYS.PARENT_STUDENT_LINKS, []);
      const parents = (api.getParents as () => Parent[])();
      const byParent = new Map<string, string[]>();
      for (const link of links) {
        const arr = byParent.get(link.parentId) || [];
        if (!arr.includes(link.studentId)) arr.push(link.studentId);
        byParent.set(link.parentId, arr);
      }
      let changed = false;
      const updated = parents.map((p) => {
        const ids = byParent.get(p.id) || [];
        const same =
          ids.length === p.studentIds.length && ids.every((id) => p.studentIds.includes(id));
        if (!same) {
          changed = true;
          return { ...p, studentIds: ids };
        }
        return p;
      });
      if (changed) setItem(STORAGE_KEYS.PARENTS, updated);
    },

    migrateLegacyParentLinks(): void {
      const existing = getItem<ParentStudentLink[]>(STORAGE_KEYS.PARENT_STUDENT_LINKS, []);
      if (existing.length > 0) return;

      const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
      const parents = getItem<Parent[]>(STORAGE_KEYS.PARENTS, []);
      const links: ParentStudentLink[] = [];
      const now = new Date().toISOString();

      for (const student of students) {
        let parent: Parent | undefined;
        if (student.parentId) {
          parent = parents.find((p) => p.id === student.parentId);
        }
        if (!parent && student.parentPhone) {
          parent = parents.find((p) => p.phone === student.parentPhone);
        }
        if (!parent && (student.parentName || student.parentPhone)) {
          parent = (api.saveParent as (p: Omit<Parent, 'id' | 'createdAt'> & { id?: string }) => Parent)({
            name: student.parentName || '학부모',
            phone: student.parentPhone || '',
            studentIds: [],
          });
          if (!parents.find((p) => p.id === parent!.id)) {
            parents.push(parent);
          }
        }
        if (!parent) continue;

        links.push({
          id: `${parent.id}:${student.id}`,
          parentId: parent.id,
          studentId: student.id,
          relationship: 'other',
          isPrimary: true,
          createdAt: now,
        });
      }

      if (links.length > 0) {
        setItem(STORAGE_KEYS.PARENT_STUDENT_LINKS, links);
        (api.rebuildParentStudentIdsFromLinks as () => void)();
      }
    },

    createOrLinkParent(params: {
      studentId: string;
      existingParentId?: string;
      name?: string;
      phone?: string;
      email?: string;
      relationship: GuardianRelationship;
      isPrimary?: boolean;
    }): Parent {
      let parent: Parent | undefined;

      if (params.existingParentId) {
        parent = (api.getParents as () => Parent[])().find((p) => p.id === params.existingParentId);
        if (!parent) throw new Error('선택한 학부모를 찾을 수 없습니다.');
      } else {
        if (!params.name?.trim() || !params.phone?.trim()) {
          throw new Error('학부모 이름과 전화번호를 입력해 주세요.');
        }
        parent = (api.getParents as () => Parent[])().find((p) => p.phone === params.phone!.trim());
        if (!parent) {
          parent = (api.saveParent as (p: Omit<Parent, 'id' | 'createdAt'> & { id?: string }) => Parent)({
            name: params.name.trim(),
            phone: params.phone.trim(),
            email: params.email?.trim() || undefined,
            studentIds: [],
          });
        } else {
          const updates: Partial<Parent> = {};
          if (params.email?.trim() && params.email !== parent.email) updates.email = params.email.trim();
          if (params.name?.trim() && params.name !== parent.name) updates.name = params.name.trim();
          if (Object.keys(updates).length > 0) {
            parent = (api.saveParent as (p: Omit<Parent, 'id' | 'createdAt'> & { id?: string }) => Parent)({
              ...parent,
              ...updates,
            });
          }
        }
      }

      (api.linkParentToStudent as (p: {
        parentId: string;
        studentId: string;
        relationship: GuardianRelationship;
        isPrimary?: boolean;
      }) => void)({
        parentId: parent.id,
        studentId: params.studentId,
        relationship: params.relationship,
        isPrimary: params.isPrimary,
      });

      return (api.getParents as () => Parent[])().find((p) => p.id === parent!.id) || parent;
    },

    syncStudentGuardians(
      studentId: string,
      entries: Array<{
        existingParentId?: string;
        name?: string;
        phone?: string;
        email?: string;
        relationship: GuardianRelationship;
        isPrimary?: boolean;
      }>
    ): Parent[] {
      const parents: Parent[] = [];
      const targetParentIds = new Set<string>();

      for (const entry of entries) {
        const parent = (api.createOrLinkParent as (p: typeof entries[0] & { studentId: string }) => Parent)({
          studentId,
          ...entry,
        });
        parents.push(parent);
        targetParentIds.add(parent.id);
      }

      const currentLinks = (api.getParentStudentLinks as () => ParentStudentLink[])().filter(
        (l) => l.studentId === studentId
      );
      for (const link of currentLinks) {
        if (!targetParentIds.has(link.parentId)) {
          (api.unlinkParentFromStudent as (p: string, s: string) => void)(link.parentId, studentId);
        }
      }

      const remaining = (api.getParentStudentLinks as () => ParentStudentLink[])().filter(
        (l) => l.studentId === studentId
      );
      if (remaining.length > 0 && !remaining.some((l) => l.isPrimary)) {
        const first = remaining[0];
        (api.linkParentToStudent as (p: {
          parentId: string;
          studentId: string;
          relationship: GuardianRelationship;
          isPrimary?: boolean;
        }) => void)({
          parentId: first.parentId,
          studentId,
          relationship: first.relationship,
          isPrimary: true,
        });
      }

      (api.rebuildParentStudentIdsFromLinks as () => void)();
      return parents;
    },

    getStudentsForParent(parentCustomerId: string): Student[] {
      const studentIds = new Set(
        (api.getParentStudentLinks as () => ParentStudentLink[])()
          .filter((l) => l.parentId === parentCustomerId)
          .map((l) => l.studentId)
      );
      if (studentIds.size === 0) {
        const parent = (api.getParents as () => Parent[])().find((p) => p.id === parentCustomerId);
        if (parent) parent.studentIds.forEach((id) => studentIds.add(id));
      }
      return (api.getStudents as () => Student[])().filter((s) => studentIds.has(s.id));
    },

    ensureParentFromStudent(
      student: Student,
      options?: { parentEmail?: string; relationship?: GuardianRelationship }
    ): Parent {
      return (api.createOrLinkParent as (p: {
        studentId: string;
        existingParentId?: string;
        name?: string;
        phone?: string;
        email?: string;
        relationship: GuardianRelationship;
        isPrimary?: boolean;
      }) => Parent)({
        studentId: student.id,
        existingParentId: student.parentId,
        name: student.parentName,
        phone: student.parentPhone,
        email: options?.parentEmail,
        relationship: options?.relationship || 'other',
        isPrimary: true,
      });
    },

    syncParentsFromStudents(): Parent[] {
      (api.migrateLegacyParentLinks as () => void)();
      (api.rebuildParentStudentIdsFromLinks as () => void)();
      return (api.getParents as () => Parent[])();
    },

    getCurriculumLevels(): CurriculumLevel[] {
      return getItem<CurriculumLevel[]>(STORAGE_KEYS.CURRICULUM_LEVELS, []);
    },

    saveCurriculumLevel(level: Omit<CurriculumLevel, 'id'> & { id?: string }): CurriculumLevel {
      const list = (api.getCurriculumLevels as () => CurriculumLevel[])();
      const saved = level.id
        ? { ...list.find((l) => l.id === level.id)!, ...level, id: level.id }
        : { ...level, id: generateEntityId('clv') };
      const idx = list.findIndex((l) => l.id === saved.id);
      if (idx >= 0) list[idx] = saved;
      else list.push(saved);
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setItem(STORAGE_KEYS.CURRICULUM_LEVELS, list);
      return saved;
    },

    getCurriculumItems(levelId?: string): CurriculumItem[] {
      const items = getItem<CurriculumItem[]>(STORAGE_KEYS.CURRICULUM_ITEMS, []);
      return levelId ? items.filter((i) => i.levelId === levelId) : items;
    },

    saveCurriculumItem(item: Omit<CurriculumItem, 'id'> & { id?: string }): CurriculumItem {
      const list = (api.getCurriculumItems as () => CurriculumItem[])();
      const saved = item.id
        ? { ...list.find((i) => i.id === item.id)!, ...item, id: item.id }
        : { ...item, id: generateEntityId('cit') };
      const idx = list.findIndex((i) => i.id === saved.id);
      if (idx >= 0) list[idx] = saved;
      else list.push(saved);
      setItem(STORAGE_KEYS.CURRICULUM_ITEMS, list);
      return saved;
    },

    getCurriculumProgress(studentId?: string): StudentCurriculumProgress[] {
      const list = getItem<StudentCurriculumProgress[]>(STORAGE_KEYS.CURRICULUM_PROGRESS, []);
      return studentId ? list.filter((p) => p.studentId === studentId) : list;
    },

    saveCurriculumProgress(
      prog: Omit<StudentCurriculumProgress, 'id'> & { id?: string }
    ): StudentCurriculumProgress {
      const list = (api.getCurriculumProgress as () => StudentCurriculumProgress[])();
      const saved = prog.id
        ? { ...list.find((p) => p.id === prog.id)!, ...prog, id: prog.id }
        : { ...prog, id: generateEntityId('cpr') };
      const idx = list.findIndex(
        (p) => p.studentId === saved.studentId && p.curriculumItemId === saved.curriculumItemId
      );
      if (idx >= 0) list[idx] = saved;
      else list.push(saved);
      setItem(STORAGE_KEYS.CURRICULUM_PROGRESS, list);
      return saved;
    },

    seedDefaultCurriculum(): void {
      if ((api.getCurriculumLevels as () => CurriculumLevel[])().length > 0) return;
      const levels: { name: string; songs: string[] }[] = [
        { name: '바이엘 상', songs: ['바이엘 1-10', '바이엘 11-20', '바이엘 21-30'] },
        { name: '체르니 100', songs: ['체르니 100 No.1', '체르니 100 No.5', '체르니 100 No.10'] },
        { name: '체르니 30', songs: ['체르니 30 No.1', '체르니 30 No.6', '체르니 30 No.11'] },
      ];
      levels.forEach((lv, li) => {
        const level = (api.saveCurriculumLevel as (l: Omit<CurriculumLevel, 'id'> & { id?: string }) => CurriculumLevel)({
          name: lv.name,
          sortOrder: li,
          description: `${lv.name} 표준 곡목`,
        });
        lv.songs.forEach((title, si) => {
          (api.saveCurriculumItem as (i: Omit<CurriculumItem, 'id'> & { id?: string }) => CurriculumItem)({
            levelId: level.id,
            title,
            sortOrder: si,
            required: true,
          });
        });
      });
    },

    getWeeklyAssignments(studentId?: string): WeeklyAssignment[] {
      const list = getItem<WeeklyAssignment[]>(STORAGE_KEYS.WEEKLY_ASSIGNMENTS, []);
      return studentId ? list.filter((a) => a.studentId === studentId) : list;
    },

    getCurrentWeekStart(): string {
      return weekStartIsoLocal();
    },

    saveWeeklyAssignment(
      assignment: Omit<WeeklyAssignment, 'id' | 'items'> & {
        id?: string;
        items?: WeeklyAssignment['items'];
      }
    ): WeeklyAssignment {
      const list = (api.getWeeklyAssignments as () => WeeklyAssignment[])();
      const items = assignment.items || [];
      const saved: WeeklyAssignment = assignment.id
        ? {
            ...list.find((a) => a.id === assignment.id)!,
            ...assignment,
            id: assignment.id,
            items,
          }
        : {
            ...assignment,
            id: generateEntityId('wasg'),
            items,
            status: assignment.status || 'assigned',
          };
      const idx = list.findIndex((a) => a.id === saved.id);
      if (idx >= 0) list[idx] = saved;
      else list.unshift(saved);
      setItem(STORAGE_KEYS.WEEKLY_ASSIGNMENTS, list);
      return saved;
    },

    confirmAssignmentItem(assignmentId: string, itemId: string): boolean {
      const list = (api.getWeeklyAssignments as () => WeeklyAssignment[])();
      const aIdx = list.findIndex((a) => a.id === assignmentId);
      if (aIdx < 0) return false;
      const items = list[aIdx].items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              parentConfirmed: true,
              parentConfirmedAt: new Date().toISOString(),
              completed: true,
              completedAt: new Date().toISOString(),
            }
          : it
      );
      list[aIdx] = { ...list[aIdx], items, status: 'submitted' };
      setItem(STORAGE_KEYS.WEEKLY_ASSIGNMENTS, list);
      return true;
    },

    getAchievements(studentId?: string): Achievement[] {
      const list = getItem<Achievement[]>(STORAGE_KEYS.ACHIEVEMENTS, []);
      return studentId ? list.filter((a) => a.studentId === studentId) : list;
    },

    saveAchievement(ach: Omit<Achievement, 'id'> & { id?: string }): Achievement {
      const list = (api.getAchievements as () => Achievement[])();
      const saved = ach.id
        ? { ...list.find((a) => a.id === ach.id)!, ...ach, id: ach.id }
        : { ...ach, id: generateEntityId('ach') };
      const idx = list.findIndex((a) => a.id === saved.id);
      if (idx >= 0) list[idx] = saved;
      else list.unshift(saved);
      setItem(STORAGE_KEYS.ACHIEVEMENTS, list);
      return saved;
    },

    deleteAchievement(id: string): boolean {
      const filtered = (api.getAchievements as () => Achievement[])().filter((a) => a.id !== id);
      if (filtered.length === (api.getAchievements as () => Achievement[])().length) return false;
      setItem(STORAGE_KEYS.ACHIEVEMENTS, filtered);
      return true;
    },

    getLearningReports(studentId?: string, publishedOnly = false): LearningReport[] {
      let list = getItem<LearningReport[]>(STORAGE_KEYS.LEARNING_REPORTS, []);
      if (studentId) list = list.filter((r) => r.studentId === studentId);
      if (publishedOnly) list = list.filter((r) => r.status === 'published');
      return list.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    },

    generateLearningReport(studentId: string, yearMonth: string, staffId?: string): LearningReport {
      const student = (api.getStudents as () => Student[])().find((s) => s.id === studentId);
      const attendance = (api.getAttendance as () => { studentId: string; date: string; status: string }[])().filter(
        (a) => a.studentId === studentId && a.date.startsWith(yearMonth)
      );
      const present = attendance.filter((a) => a.status === 'present' || a.status === 'make_up').length;
      const attendanceRate =
        attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;
      const practiceMinutes = (api.getPracticeRecords as () => { studentId: string; date: string; minutes: number }[])()
        .filter((p) => p.studentId === studentId && p.date.startsWith(yearMonth))
        .reduce((s, p) => s + p.minutes, 0);
      const lessonsCount = (api.getLessonRecords as () => { studentId: string; date: string }[])().filter(
        (l) => l.studentId === studentId && l.date.startsWith(yearMonth)
      ).length;
      const songsCompleted = (api.getCurriculumProgress as (id?: string) => StudentCurriculumProgress[])(
        studentId
      ).filter((p) => p.status === 'completed' && (p.completedAt || '').startsWith(yearMonth)).length;

      return (api.saveLearningReport as (r: Omit<LearningReport, 'id'> & { id?: string }) => LearningReport)({
        studentId,
        staffId,
        yearMonth,
        status: 'draft',
        summary: `${student?.name || '원생'} ${yearMonth} 학습 리포트`,
        attendanceRate,
        practiceMinutes,
        lessonsCount,
        songsCompleted,
      });
    },

    saveLearningReport(report: Omit<LearningReport, 'id'> & { id?: string }): LearningReport {
      const list = getItem<LearningReport[]>(STORAGE_KEYS.LEARNING_REPORTS, []);
      const saved = report.id
        ? { ...list.find((r) => r.id === report.id)!, ...report, id: report.id }
        : { ...report, id: generateEntityId('lrp') };
      const idx = list.findIndex(
        (r) => r.studentId === saved.studentId && r.yearMonth === saved.yearMonth
      );
      if (idx >= 0) list[idx] = saved;
      else list.unshift(saved);
      setItem(STORAGE_KEYS.LEARNING_REPORTS, list);
      return saved;
    },

    publishLearningReport(id: string): LearningReport | null {
      const list = (api.getLearningReports as () => LearningReport[])();
      const idx = list.findIndex((r) => r.id === id);
      if (idx < 0) return null;
      list[idx] = { ...list[idx], status: 'published', publishedAt: new Date().toISOString() };
      setItem(STORAGE_KEYS.LEARNING_REPORTS, list);
      return list[idx];
    },
  };
}

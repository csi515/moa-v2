import { useMemo, useState, type FormEvent } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStaffGrants, useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { useModuleLabels } from '@/core/labels';
import { getIndustryAccent, usesClassBasedSchedule } from '@/core/industry/industryUi';
import type { AppNotification } from '@/types';
import { encodeNoticeTarget, parseNoticeTarget } from '../noticeTarget';
import { getNoticeTargetModeLabel, noticeAccentClasses } from '../noticeUi';
import { buildNoticeTemplates, getNoticePlaceWords } from '../noticeTemplates';
import { filterParentNotices, resolveNoticeRecipients } from '../noticeHelpers';
import { flushAndConfirmNoticePublish } from '../flushAndConfirmNoticePublish';
import type { NoticeTargetMode, ParentNoticeKind } from '../types';

type StatusFilter = 'ALL' | 'pending' | 'sent';

export function useParentNoticeState() {
  const { showToast, openConfirmDialog } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const accent = getIndustryAccent(industry);
  const tone = noticeAccentClasses(accent.icon);
  const classBased = usesClassBasedSchedule(industry);
  const { isStaff, scopeStudents, scopeClasses, getMyStudentIds } = useStaffScope();
  const { allow } = useStaffGrants();
  const canWriteNotices = allow('notices');
  const refreshKey = useStorageRefresh();
  const { placeWord, feeWord } = getNoticePlaceWords(industry);
  const templates = useMemo(
    () => buildNoticeTemplates(placeWord, feeWord),
    [placeWord, feeWord]
  );

  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((s) => s.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const classes = useMemo(
    () => (isStaff ? scopeClasses(StorageService.getClasses()) : StorageService.getClasses()),
    [isStaff, scopeClasses, refreshKey]
  );
  const notices = useMemo(() => {
    const all = filterParentNotices(StorageService.getNotifications());
    if (!isStaff) return all;
    const studentIds = new Set<string>(
      Array.from(getMyStudentIds(StorageService.getStudents()) as Set<string>)
    );
    const classIds = new Set<string>(classes.map((item) => item.id));
    return all.filter((item) => noticeTargetsStaff(item, studentIds, classIds));
  }, [isStaff, getMyStudentIds, classes, refreshKey]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppNotification | null>(null);
  const [form, setForm] = useState({
    kind: 'announcement' as ParentNoticeKind,
    title: '',
    message: '',
    targetMode: (isStaff ? 'student' : 'all') as NoticeTargetMode,
    classId: '',
    studentId: '',
  });

  const filtered = useMemo(() => {
    return notices
      .filter((n) => (statusFilter === 'ALL' ? true : (n.status || 'pending') === statusFilter))
      .filter((n) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [notices, statusFilter, searchQuery]);

  const recipientPreview = useMemo(() => {
    const id = form.targetMode === 'class' ? form.classId : form.studentId;
    return resolveNoticeRecipients(students, form.targetMode, id || undefined);
  }, [students, form.targetMode, form.classId, form.studentId]);

  const targetModeOptions = useMemo(() => {
    const opts: { value: NoticeTargetMode; label: string }[] = [];
    if (!isStaff) opts.push({ value: 'all', label: '전체' });
    if (classBased) opts.push({ value: 'class', label: labels.service.singular });
    opts.push({ value: 'student', label: '개별' });
    return opts;
  }, [classBased, labels.service.singular, isStaff]);

  const openCreate = () => {
    if (!canWriteNotices) return;
    setEditing(null);
    setForm({
      kind: 'announcement',
      title: '',
      message: '',
      targetMode: isStaff ? 'student' : 'all',
      classId: classes[0]?.id || '',
      studentId: students[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: AppNotification) => {
    if (!canWriteNotices) return;
    const parsed = parseNoticeTarget(item.targetGroup);
    const mode: NoticeTargetMode =
      parsed.mode === 'none' || (parsed.mode === 'class' && !classBased)
        ? 'all'
        : parsed.mode;
    setEditing(item);
    setForm({
      kind: (item.type === 'announcement' ? 'announcement' : 'notice') as ParentNoticeKind,
      title: item.title,
      message: item.message,
      targetMode: mode,
      classId: parsed.mode === 'class' ? parsed.id || '' : classes[0]?.id || '',
      studentId:
        parsed.mode === 'student'
          ? parsed.id || item.targetStudentId || ''
          : item.targetStudentId || students[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setForm((prev) => ({
      ...prev,
      kind: t.kind,
      title: t.title,
      message: t.message,
    }));
  };

  const buildPayload = (status: 'pending' | 'sent') => {
    const targetId = form.targetMode === 'class' ? form.classId : form.studentId;
    if (form.targetMode === 'class' && !form.classId) {
      showToast(`${labels.service.singular}을(를) 선택해 주세요.`, 'error');
      return null;
    }
    if (form.targetMode === 'student' && !form.studentId) {
      showToast(`${labels.customer.singular}을(를) 선택해 주세요.`, 'error');
      return null;
    }
    const recipients = resolveNoticeRecipients(students, form.targetMode, targetId || undefined);
    if (recipients.length === 0 && form.targetMode !== 'all') {
      showToast(`발송 대상 ${labels.customer.singular}이(가) 없습니다.`, 'error');
      return null;
    }
    if (!form.title.trim() || !form.message.trim()) {
      showToast('제목과 내용을 입력해 주세요.', 'error');
      return null;
    }

    const student =
      form.targetMode === 'student'
        ? students.find((s) => s.id === form.studentId)
        : undefined;

    return {
      id: editing?.id,
      type: form.kind,
      title: form.title.trim(),
      message: form.message.trim(),
      targetGroup: encodeNoticeTarget(form.targetMode, targetId || undefined),
      recipientCount: recipients.length,
      targetStudentId: student?.id,
      targetStudentName: student?.name,
      status,
      sentAt: status === 'sent' ? new Date().toISOString() : editing?.sentAt,
      createdAt: editing?.createdAt,
    };
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSaveDraft = (e: FormEvent) => {
    e.preventDefault();
    if (!canWriteNotices) return;
    const payload = buildPayload('pending');
    if (!payload) return;
    StorageService.saveNotification(payload);
    showToast(
      `임시저장되었습니다. 게시하면 ${labels.contact.singular} 포털에 표시됩니다.`,
      'success'
    );
    closeModal();
  };

  const handlePublish = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canWriteNotices) return;
    const payload = buildPayload('sent');
    if (!payload) return;
    const previous = editing;
    const saved = StorageService.saveNotification(payload);
    const ok = await flushAndConfirmNoticePublish(saved, previous ?? 'pending');
    if (!ok) {
      showToast(
        '게시에 실패했습니다. 권한 또는 네트워크를 확인한 뒤 다시 시도해 주세요.',
        'error'
      );
      return;
    }
    showToast(
      `${labels.contact.singular} 포털에 게시되었습니다. (대상 ${payload.recipientCount}명)`,
      'success'
    );
    closeModal();
  };

  const publishExisting = async (item: AppNotification) => {
    if (!canWriteNotices) return;
    const previous = { ...item };
    const saved = StorageService.saveNotification({
      ...item,
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
    const ok = await flushAndConfirmNoticePublish(saved, previous);
    if (!ok) {
      showToast(
        '게시에 실패했습니다. 권한 또는 네트워크를 확인한 뒤 다시 시도해 주세요.',
        'error'
      );
      return;
    }
    showToast(`${labels.contact.singular} 포털에 게시되었습니다.`, 'success');
  };

  const handleDelete = (item: AppNotification) => {
    if (isStaff || !canWriteNotices) return;
    openConfirmDialog({
      title: '안내 삭제',
      message: `"${item.title}"을(를) 삭제할까요?`,
      isDestructive: true,
      confirmText: '삭제',
      onConfirm: () => {
        StorageService.deleteNotification(item.id);
        showToast('삭제되었습니다.', 'info');
      },
    });
  };

  const targetLabel = (item: AppNotification) => {
    const { mode, id } = parseNoticeTarget(item.targetGroup);
    if (mode === 'none') return '대상 미지정';
    if (mode === 'class' && id) {
      const cls = classes.find((c) => c.id === id);
      return cls
        ? `${labels.service.singular} · ${cls.name}`
        : getNoticeTargetModeLabel('class', labels);
    }
    if (mode === 'student') {
      return item.targetStudentName
        ? `개별 · ${item.targetStudentName}`
        : getNoticeTargetModeLabel('student', labels);
    }
    return getNoticeTargetModeLabel('all', labels);
  };

  return {
    labels,
    accent,
    tone,
    students,
    classes,
    templates,
    filtered,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    closeModal,
    editing,
    form,
    setForm,
    recipientPreview,
    targetModeOptions,
    openCreate,
    openEdit,
    applyTemplate,
    handleSaveDraft,
    handlePublish,
    publishExisting,
    handleDelete,
    targetLabel,
    canWriteNotices,
    isStaff,
  };
}

function noticeTargetsStaff(
  item: AppNotification,
  studentIds: Set<string>,
  classIds: Set<string>
): boolean {
  const { mode, id } = parseNoticeTarget(item.targetGroup);
  if (mode === 'student') return studentIds.has(id || item.targetStudentId || '');
  if (mode === 'class' && id) return classIds.has(id);
  return false;
}

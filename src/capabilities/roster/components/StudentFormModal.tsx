import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { renderParentInviteResult } from '@/core/staff/staffUi';
import type { StudentRegistrationInviteResult } from '@/core/students/services/studentRegistrationService';
import {
  registerStudentWithParent,
  updateStudentWithParent,
  type GuardianRegistrationInput,
} from '@/core/students';
import { getStudentLevelOptions } from '@/core/students/levelOptions';
import { getIndustryPlugin } from '@/core/industry/registry';
import { getPlaceLabel, showsTextbooksLink } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { getRosterConfigForIndustry } from '../config/rosterSchemaConfig';
import { createPickupAddress, normalizePickupAddresses, sanitizePickupAddressesForSave } from '@/capabilities/transport';
import { searchParents, getGuardiansForStudent } from '@/core/parent/guardianHelpers';
import { requestPlaceStudentOnTimetable } from '@/core/customer/studentJoinInbox';
import { StorageService } from '@/services/storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Student, Parent } from '@/types';
import {
  getCustomFieldsForIndustry,
  extractCustomFieldValues,
  validateCustomFields,
  mergeCustomFieldValues,
} from '@/core/customer/customFields';
import { CustomFieldsForm } from '@/core/customer/components/CustomFieldsForm';
import { Save, RefreshCw, StickyNote, SlidersHorizontal, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { StudentBasicInfoSection } from './form/StudentBasicInfoSection';
import { GuardianSection } from './form/GuardianSection';
import { StudentAdvancedSection } from './form/StudentAdvancedSection';
import { StudentTimetableSlotPicker } from './form/StudentTimetableSlotPicker';
import { shouldAutoCreateTuitionInvoice } from './form/studentTuitionAutoInvoice';
import { selfAccountEnrollmentNote } from './form/enrollmentFormCopy';
import { StudentPickupSection } from './form/StudentPickupSection';
import { StudentFormPostSave } from './form/StudentFormPostSave';
import {
  extractWishlistFromStudent,
  mergeWishlistIntoMetadata,
} from '../helpers/studentWishlistHelpers';
import {
  combineStudentNotes,
  newGuardianEntry,
  type GuardianFormEntry,
  type StudentFormData,
} from './form/studentFormTypes';
import {
  firstErrorField,
  focusStudentFormField,
  studentFormSnapshot,
  validateStudentForm,
  type StudentFormErrors,
} from './form/studentFormValidation';
import {
  rosterCreateFormDescription,
  rosterNotesPlaceholder,
  rosterPostSaveHint,
} from './form/rosterFormCopy';

interface StudentFormModalProps {
  student?: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (student: Student, options?: { openTab?: 'attendance' | 'tuition' | 'consultations' | 'classes' }) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { showToast, openConfirmDialog, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;
  const placeLabel = getPlaceLabel(industry);
  const serviceLabel = labels.service.singular;
  const showTimetablePlacement = showsTextbooksLink(industry);
  const org = useOptionalOrganization();
  const organizationId = org?.currentOrganization?.id || 'local-org';
  const formRef = useRef<HTMLFormElement>(null);

  const teachers = useMemo(() => (isOpen ? StorageService.getTeachers() : []), [isOpen]);
  const classes = useMemo(() => (isOpen ? StorageService.getClasses() : []), [isOpen]);
  const allStudents = useMemo(() => (isOpen ? StorageService.getStudents() : []), [isOpen]);
  const settings = useMemo(() => (isOpen ? StorageService.getSettings() : ({} as any)), [isOpen]);
  const defaultLevel = useMemo(() => getStudentLevelOptions(industry)[0], [industry]);
  const rosterConfig = useMemo(
    () =>
      getRosterConfigForIndustry(industry, {
        customerLabel,
        staffLabel: labels.staff.singular,
        serviceLabel,
        placeLabel,
      }),
    [industry, customerLabel, labels.staff.singular, serviceLabel, placeLabel]
  );
  const showPickupFields = rosterConfig.showPickupFields;
  const showSchoolFields = rosterConfig.showSchoolFields;
  const canInviteParent = isSupabaseConfigured() && organizationId !== 'local-org';
  const isEdit = Boolean(student?.id);
  const customFieldsDef = useMemo(() => getCustomFieldsForIndustry(industry), [industry]);

  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    gender: '',
    birthDate: '',
    phone: '',
    school: '',
    grade: '',
    joinDate: new Date().toISOString().slice(0, 10),
    leaveDate: '',
    status: 'active',
    teacherId: '',
    classIds: [],
    level: defaultLevel,
    billingMode: 'monthly',
    tuitionFee: 180000,
    paymentDay: 10,
    specialNotes: '',
    memo: '',
    address: '',
    usesShuttleService: false,
    pickupAddresses: [createPickupAddress({ isDefault: true })],
    checkInPin: '',
    autoGeneratePin: true,
  });

  const [guardians, setGuardians] = useState<GuardianFormEntry[]>([newGuardianEntry(true)]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [isAdultSelf, setIsAdultSelf] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showDetails, setShowDetails] = useState(isEdit);
  const [inviteModal, setInviteModal] = useState<StudentRegistrationInviteResult | null>(null);
  const [postSaveStudent, setPostSaveStudent] = useState<Student | null>(null);
  const [hasAutoInvoice, setHasAutoInvoice] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StudentFormErrors>({});
  const [baseline, setBaseline] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let nextForm: StudentFormData;
    let nextGuardians: GuardianFormEntry[];
    let nextCustomFields: Record<string, any>;

    if (student) {
      const linked = getGuardiansForStudent(student.id);
      nextForm = {
        name: student.name || '',
        gender: student.gender || '',
        birthDate: student.birthDate || '',
        phone: student.phone || '',
        school: student.school || '',
        grade: student.grade || '',
        joinDate: student.joinDate || new Date().toISOString().slice(0, 10),
        leaveDate: student.leaveDate || '',
        status: student.status || 'active',
        teacherId: student.teacherId || teachers[0]?.id || '',
        classIds: student.classIds || [],
        level: student.level || defaultLevel,
        billingMode: student.billingMode === 'session_pass' ? 'session_pass' : 'monthly',
        tuitionFee: student.tuitionFee || 180000,
        paymentDay: student.paymentDay || 10,
        specialNotes: combineStudentNotes(student.specialNotes, student.memo),
        memo: '',
        address: student.address || '',
        usesShuttleService: student.usesShuttleService ?? false,
        pickupAddresses:
          student.pickupAddresses && student.pickupAddresses.length > 0
            ? normalizePickupAddresses(student.pickupAddresses)
            : [createPickupAddress({ isDefault: true })],
        checkInPin: '',
        autoGeneratePin: false,
        preferredGenres: extractWishlistFromStudent(student).genres,
        wishlistSongs: extractWishlistFromStudent(student).songs.join(', '),
      };
      nextGuardians =
        linked.length > 0
          ? linked.map((g) => ({
              key: crypto.randomUUID(),
              mode: 'existing' as const,
              existingParentId: g.parentId,
              parentSearch: g.parentName,
              name: g.parentName,
              phone: g.parentPhone,
              email: g.parentEmail || '',
              relationship: g.relationship,
              isPrimary: g.isPrimary,
              invite: false,
            }))
          : [
              {
                ...newGuardianEntry(true),
                name: (student as any).parentName || '',
                phone: (student as any).parentPhone || '',
              },
            ];
      nextCustomFields = extractCustomFieldValues(student.metadata, customFieldsDef);
      setShowAdvanced(true);
      setShowDetails(isEdit);
    } else {
      nextForm = {
        name: '',
        gender: '',
        birthDate: '',
        phone: '',
        school: '',
        grade: '',
        joinDate: new Date().toISOString().slice(0, 10),
        leaveDate: '',
        status: 'active',
        teacherId: teachers[0]?.id || '',
        classIds: [],
        level: defaultLevel,
        billingMode:
          settings.defaultBillingMode === 'session_pass' ? 'session_pass' : 'monthly',
        tuitionFee: settings.defaultTuitionFee || 180000,
        paymentDay: settings.defaultPaymentDay || 10,
        specialNotes: '',
        memo: '',
        address: '',
        usesShuttleService: false,
        pickupAddresses: [createPickupAddress({ isDefault: true })],
        checkInPin: '',
        autoGeneratePin: false,
        autoCreateInvoice: true,
        preferredGenres: [],
        wishlistSongs: '',
      };
      nextGuardians = [newGuardianEntry(true)];
      nextCustomFields = extractCustomFieldValues(null, customFieldsDef);
      setShowAdvanced(true);
      setShowDetails(false);
    }

    setFormData(nextForm);
    setGuardians(nextGuardians);
    setCustomFieldValues(nextCustomFields);
    setIsAdultSelf(false);
    setActiveSearchIdx(null);
    setPostSaveStudent(null);
    setHasAutoInvoice(false);
    setFieldErrors({});
    setBaseline(
      studentFormSnapshot(nextForm, nextGuardians, false) + JSON.stringify(nextCustomFields)
    );
  }, [student, isOpen, defaultLevel, teachers, classes, settings, customFieldsDef]);

  const searchResults = useMemo(() => {
    if (activeSearchIdx === null) return [];
    const q = guardians[activeSearchIdx]?.parentSearch || '';
    return searchParents(q).slice(0, 8);
  }, [activeSearchIdx, guardians]);

  const isDirty =
    Boolean(baseline) &&
    studentFormSnapshot(formData, guardians, isAdultSelf) + JSON.stringify(customFieldValues) !==
      baseline &&
    !postSaveStudent;

  const confirmUnsavedClose = (proceed: () => void) => {
    openConfirmDialog({
      title: '작성 중인 내용이 있습니다',
      message: '저장하지 않은 내용은 사라집니다. 닫을까요?',
      confirmText: '닫기',
      cancelText: '계속 작성',
      isDestructive: true,
      onConfirm: proceed,
    });
  };

  const updateFormData = (patch: Partial<StudentFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    if (patch.name !== undefined) setFieldErrors((prev) => ({ ...prev, name: undefined }));
    if (patch.usesShuttleService !== undefined || patch.pickupAddresses) {
      setFieldErrors((prev) => ({ ...prev, pickup: undefined }));
    }
  };

  const updateCustomField = (key: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateGuardian = (idx: number, patch: Partial<GuardianFormEntry>) => {
    setGuardians((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`guardian-${idx}-existing`];
      delete next[`guardian-${idx}-name`];
      delete next[`guardian-${idx}-phone`];
      delete next[`guardian-${idx}-email`];
      delete next.guardians;
      return next;
    });
  };

  const setPrimaryGuardian = (idx: number) => {
    setGuardians((prev) => prev.map((g, i) => ({ ...g, isPrimary: i === idx })));
  };

  const removeGuardian = (idx: number) => {
    if (guardians.length <= 1) {
      showToast(`최소 1명의 ${contactLabel}를 등록해야 합니다`, 'warning');
      return;
    }

    const target = guardians[idx];
    const doRemove = () => {
      setGuardians((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        if (!next.some((g) => g.isPrimary)) next[0].isPrimary = true;
        return next;
      });
    };

    if (isEdit && target.existingParentId) {
      openConfirmDialog({
        title: `${contactLabel} 연결 해제`,
        message: `${target.name || `선택한 ${contactLabel}`}와의 연결을 해제할까요?\n저장 시 이 ${customerLabel}과의 link만 제거됩니다.`,
        confirmText: '연결 해제',
        isDestructive: true,
        onConfirm: doRemove,
      });
      return;
    }

    doRemove();
  };

  const selectExistingParent = (idx: number, parent: Parent) => {
    updateGuardian(idx, {
      mode: 'existing',
      existingParentId: parent.id,
      parentSearch: parent.name,
      name: parent.name,
      phone: parent.phone,
      email: parent.email || '',
    });
    setActiveSearchIdx(null);
  };

  const buildGuardianInputs = (): GuardianRegistrationInput[] => {
    return guardians.map((g) => {
      if (g.mode === 'existing' && g.existingParentId) {
        return {
          mode: 'existing' as const,
          existingParentId: g.existingParentId,
          relationship: g.relationship,
          isPrimary: g.isPrimary,
        };
      }
      return {
        mode: 'new' as const,
        name: g.name.trim(),
        phone: g.phone.trim(),
        email: g.email.trim() || undefined,
        relationship: g.relationship,
        isPrimary: g.isPrimary,
        invite: Boolean(g.invite && g.email.trim() && canInviteParent),
      };
    });
  };

  const buildStudentPayload = (): Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    studentNumber?: string;
  } => {
    const targetTeacher = teachers.find((t) => t.id === formData.teacherId);
    return {
      ...(student?.id ? { id: student.id, studentNumber: student.studentNumber } : { studentNumber: '' }),
      name: formData.name.trim(),
      gender: formData.gender === 'M' || formData.gender === 'F' ? formData.gender : ('' as Student['gender']),
      birthDate: formData.birthDate || '',
      phone: formData.phone.trim() || undefined,
      school: formData.school.trim(),
      grade: formData.grade.trim(),
      emergencyContact: undefined,
      address: formData.address.trim() || undefined,
      usesShuttleService: showPickupFields ? formData.usesShuttleService : undefined,
      pickupAddresses: showPickupFields
        ? sanitizePickupAddressesForSave(formData.pickupAddresses, formData.usesShuttleService)
        : undefined,
      joinDate: formData.joinDate,
      leaveDate: formData.leaveDate || undefined,
      status: formData.status,
      teacherId: formData.teacherId,
      teacherName: targetTeacher?.name || '미지정',
      classIds: formData.classIds,
      level: formData.level,
      billingMode: formData.billingMode,
      tuitionFee: Number(formData.tuitionFee) || 0,
      paymentDay: Number(formData.paymentDay) || 10,
      specialNotes: formData.specialNotes.trim() || undefined,
      memo: undefined,
      metadata: mergeWishlistIntoMetadata(
        mergeCustomFieldValues(student?.metadata, customFieldValues),
        formData.preferredGenres || [],
        formData.wishlistSongs || ''
      ),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateStudentForm({
      formData,
      guardians,
      isAdultSelf,
      showPickupFields,
      customerLabel,
      contactLabel,
    });
    const customErrors = validateCustomFields(customFieldValues, customFieldsDef);
    const combinedErrors = { ...errors, ...customErrors };

    if (Object.keys(combinedErrors).length > 0) {
      setFieldErrors(combinedErrors);
      // 상세 정보 영역의 필드에 에러가 있다면 토글 자동 오픈
      const detailedKeys = ['pickup', ...customFieldsDef.map((f) => f.key)];
      if (detailedKeys.some((k) => combinedErrors[k])) {
        setShowDetails(true);
      }
      const first = firstErrorField(errors);
      if (first) {
        requestAnimationFrame(() => focusStudentFormField(first, formRef.current));
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload = buildStudentPayload();
      const guardianInputs = isAdultSelf ? [] : buildGuardianInputs();

      if (isEdit && student?.id) {
        const { student: saved } = await updateStudentWithParent(
          { ...payload, id: student.id },
          { guardians: guardianInputs, organizationId }
        );
        showToast(`${saved.name} ${customerLabel} 정보가 수정되었습니다.`, 'success');
        onSaved(saved);
        onClose();
        return;
      }

      const result = await registerStudentWithParent(payload, {
        guardians: guardianInputs,
        checkInPin: formData.checkInPin.trim() || undefined,
        autoGeneratePin: formData.autoGeneratePin,
        organizationId,
      });

      // 5번 기능: 신규 원생 등록 시 첫 달 수강료 청구서 자동 생성 안내
      const autoInvoiceCreated = shouldAutoCreateTuitionInvoice({
        isEdit,
        autoCreateInvoice: formData.autoCreateInvoice ?? true,
        tuitionFee: payload.tuitionFee,
      });

      let message = `${result.student.name} ${customerLabel}이 등록되었습니다.`;
      if (autoInvoiceCreated) {
        message += ` (첫 달 수강료 ${payload.tuitionFee.toLocaleString()}원 청구서 자동 생성됨)`;
      }
      if (result.invitesSent > 0) message += ` (${contactLabel} 초대 ${result.invitesSent}건)`;
      showToast(message, 'success');
      result.inviteErrors.forEach((err) => showToast(err, 'warning'));
      setPostSaveStudent(result.student);
      setHasAutoInvoice(autoInvoiceCreated);

      const invitedWithCodes = result.inviteResults.find(
        (item) => item.result.linkCodes.length > 0
      );
      if (invitedWithCodes) {
        setInviteModal(invitedWithCodes);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const saveDisabled = isSubmitting || Boolean(postSaveStudent);

  const footer = postSaveStudent ? undefined : (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl min-h-[44px] cursor-pointer hover:bg-slate-200 transition-colors"
      >
        취소
      </button>
      <button
        type="submit"
        form="student-form"
        disabled={saveDisabled}
        className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl flex items-center gap-2 disabled:opacity-50 min-h-[44px] cursor-pointer hover:bg-indigo-700 transition-colors shadow-xs"
      >
        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isSubmitting ? '저장 중…' : isEdit ? '수정 저장' : `${customerLabel} 등록`}
      </button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? `${student!.name} 정보 수정` : `신규 ${customerLabel} 등록`}
        description={
          isEdit
            ? '필요한 항목만 수정하세요'
            : `${customerLabel} 이름과 ${contactLabel} 연락처만 입력하면 즉시 등록됩니다.`
        }
        maxWidth="4xl"
        intent="form"
        dirty={isDirty}
        confirmClose={confirmUnsavedClose}
        footer={footer}
      >
        {postSaveStudent && !inviteModal && (
          <StudentFormPostSave
            student={postSaveStudent}
            showTimetablePlacement={showTimetablePlacement}
            hint={rosterPostSaveHint(industry, serviceLabel)}
            hasAutoInvoice={hasAutoInvoice}
            onPayNow={() => {
              onSaved(postSaveStudent, { openTab: 'tuition' });
              onClose();
            }}
            onOpenDetail={() => {
              onSaved(postSaveStudent);
              onClose();
            }}
            onPlaceTimetable={() => {
              requestPlaceStudentOnTimetable(postSaveStudent.id);
              setActiveTab('timetable');
              onClose();
            }}
            onOpenAttendance={() => {
              onSaved(postSaveStudent, { openTab: 'attendance' });
              onClose();
            }}
            onOpenTuition={() => {
              onSaved(postSaveStudent, { openTab: 'tuition' });
              onClose();
            }}
            onDismiss={onClose}
          />
        )}

        <form
          id="student-form"
          ref={formRef}
          onSubmit={handleSubmit}
          className={`p-6 space-y-4 ${postSaveStudent ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {/* 1. 필수 기본 정보: 원생 이름 */}
          <StudentBasicInfoSection
            formData={formData}
            onChange={updateFormData}
            nameError={fieldErrors.name}
            showSchoolFields={showSchoolFields}
            mode={isEdit ? 'all' : 'name-only'}
          />

          {/* 2. 보호자 또는 성인 본인 연락처 (필수) */}
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={isAdultSelf}
                onChange={(e) => {
                  setIsAdultSelf(e.target.checked);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((key) => {
                      if (key.startsWith('guardian') || key === 'guardians') delete next[key];
                    });
                    return next;
                  });
                }}
              />
              <span className="flex-1">
                <span className="text-xs font-bold text-slate-800">
                  성인 본인 직접 등록{' '}
                  <span className="font-normal text-slate-500 text-[11px] ml-1.5">
                    {contactLabel} 연결 없이 본인 번호로 알림 수신
                  </span>
                </span>
              </span>
            </label>

            {isAdultSelf ? (
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                <label className="block text-xs font-bold text-indigo-900">
                  {customerLabel} 본인 휴대폰 번호 <span className="text-rose-500">*</span>
                  <span className="text-slate-500 font-normal text-[11px] ml-1.5">
                    출결 체크 및 안내 알림 수신 번호
                  </span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  placeholder="010-0000-0000"
                  autoComplete="tel"
                  className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
                />
              </div>
            ) : (
              <GuardianSection
                isEdit={isEdit}
                canInviteParent={canInviteParent}
                guardians={guardians}
                activeSearchIdx={activeSearchIdx}
                searchResults={searchResults}
                errors={fieldErrors}
                onAddGuardian={() => setGuardians((prev) => [...prev, newGuardianEntry()])}
                onUpdateGuardian={updateGuardian}
                onSetPrimary={setPrimaryGuardian}
                onRemoveGuardian={removeGuardian}
                onSelectExistingParent={selectExistingParent}
                onFocusSearch={setActiveSearchIdx}
              />
            )}
          </div>

          {/* 2.5 신규 등록 시 수업 시간표 바로 배정 (원스톱 연동) */}
          {!isEdit && classes.length > 0 && !showDetails && (
            <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/35 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  {serviceLabel} 시간표 바로 배정 (선택)
                </label>
                <span className="text-[11px] text-indigo-700 font-bold">
                  {formData.classIds.length > 0
                    ? `${formData.classIds.length}개 시간대 선택됨`
                    : '등록과 동시에 시간표 배치'}
                </span>
              </div>
              <StudentTimetableSlotPicker
                classes={classes}
                selectedClassIds={formData.classIds}
                students={allStudents}
                onChange={(classIds, suggestedTeacherId) => {
                  const patch: Partial<StudentFormData> = { classIds };
                  if (suggestedTeacherId && !formData.teacherId) {
                    patch.teacherId = suggestedTeacherId;
                  }
                  updateFormData(patch);
                }}
                serviceLabel={serviceLabel}
                staffLabel={labels.staff.singular}
              />
            </div>
          )}

          {/* 3. 신규 등록일 때 점진적 공개(Progressive Disclosure) 접이식 토글 */}
          {!isEdit && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="w-full py-3 px-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/80 hover:border-indigo-300 transition-all flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 transition-colors">
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-950">
                      {showDetails ? '상세 정보 접기' : '학교, 수업, 수강료 등 상세 정보 입력하기'}
                    </p>
                    {!showDetails && (
                      <p className="text-[11px] text-indigo-600/80 mt-0.5">
                        기본 설정 적용: 일반(매월 {formData.paymentDay}일 · {Number(formData.tuitionFee).toLocaleString()}원) · 오늘 등록
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 shrink-0 ml-2">
                  {showDetails ? '접기' : '선택 입력'}
                </span>
              </button>
            </div>
          )}

          {/* 4. 상세 정보 섹션 (수정 모드이거나 토글이 펼쳐졌을 때만 렌더링) */}
          {(isEdit || showDetails) && (
            <div className={`space-y-5 ${!isEdit ? 'pt-3 border-t border-slate-100' : ''}`}>
              {!isEdit && (
                <StudentBasicInfoSection
                  formData={formData}
                  onChange={updateFormData}
                  showSchoolFields={showSchoolFields}
                  mode="details-only"
                />
              )}

              <StudentAdvancedSection
                formData={formData}
                teachers={teachers}
                classes={classes}
                students={allStudents}
                showAdvanced={showAdvanced}
                isEdit={isEdit}
                onToggle={() => setShowAdvanced((v) => !v)}
                onChange={updateFormData}
                currentStudentId={student?.id}
              />

              {customFieldsDef.length > 0 && (
                <section className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" /> {placeLabel} 맞춤 항목
                  </h4>
                  <CustomFieldsForm
                    fields={customFieldsDef}
                    values={customFieldValues}
                    onChange={updateCustomField}
                    errors={fieldErrors}
                  />
                </section>
              )}

              <section>
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> 추가 정보
                </h4>
                <label className="block text-xs font-semibold text-slate-700 mb-1">특이사항</label>
                <p className="text-[11px] text-slate-500 mb-2">
                  알레르기·주의사항·전달사항 등 수업에 필요한 내용을 남깁니다. (선택)
                </p>
                <textarea
                  rows={3}
                  value={formData.specialNotes}
                  onChange={(e) => updateFormData({ specialNotes: e.target.value, memo: '' })}
                  placeholder={rosterNotesPlaceholder(contactLabel)}
                  className="w-full px-3 py-2.5 text-sm bg-amber-50/60 border border-amber-100 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[88px]"
                />
              </section>

              {showPickupFields && (
                <StudentPickupSection
                  address={formData.address}
                  usesShuttleService={formData.usesShuttleService}
                  pickupAddresses={formData.pickupAddresses}
                  pickupError={fieldErrors.pickup}
                  onAddressChange={(address) => updateFormData({ address })}
                  onUsesShuttleChange={(usesShuttleService) => {
                    const pickupAddresses =
                      usesShuttleService && formData.pickupAddresses.length === 0
                        ? [createPickupAddress({ isDefault: true })]
                        : formData.pickupAddresses;
                    updateFormData({ usesShuttleService, pickupAddresses });
                  }}
                  onPickupAddressesChange={(pickupAddresses) => updateFormData({ pickupAddresses })}
                />
              )}
            </div>
          )}
        </form>
      </Modal>

      {inviteModal &&
        renderParentInviteResult({
          parentName: inviteModal.parentName,
          email: inviteModal.email,
          organizationName:
            inviteModal.result.organizationName || org?.currentOrganization?.name || placeLabel,
          linkCodes: inviteModal.result.linkCodes,
          contactLabel,
          emailSent: inviteModal.emailSent,
          emailMessage: inviteModal.emailMessage,
          onClose: () => {
            setInviteModal(null);
            if (postSaveStudent) {
              return;
            }
            onClose();
          },
        })}
    </>
  );
};

export const UnifiedStudentFormModal = StudentFormModal;

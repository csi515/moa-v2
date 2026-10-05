import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { isAttendanceModuleEnabled } from '@/core/attendance/features';
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
import { createPickupAddress, normalizePickupAddresses, sanitizePickupAddressesForSave } from '@/core/transport';
import { searchParents, getGuardiansForStudent } from '@/core/parent/guardianHelpers';
import { requestPlaceStudentOnTimetable } from '@/core/customer/studentJoinInbox';
import { StorageService } from '@/services/storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Student, Parent } from '@/types';
import { Save, RefreshCw, StickyNote } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { StudentBasicInfoSection } from './form/StudentBasicInfoSection';
import { GuardianSection } from './form/GuardianSection';
import { StudentPinSection } from './form/StudentPinSection';
import { StudentAdvancedSection } from './form/StudentAdvancedSection';
import { selfAccountEnrollmentNote } from './form/enrollmentFormCopy';
import { StudentPickupSection } from './form/StudentPickupSection';
import { StudentFormPostSave } from './form/StudentFormPostSave';
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

  const teachers = StorageService.getTeachers();
  const classes = StorageService.getClasses();
  const settings = StorageService.getSettings();
  const attendanceEnabled = isAttendanceModuleEnabled(settings, industry);
  const defaultLevel = getStudentLevelOptions(industry)[0];
  const showPickupFields = getIndustryPlugin(industry).showPickupFields;
  const canInviteParent = isSupabaseConfigured() && organizationId !== 'local-org';
  const isEdit = Boolean(student?.id);

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
  const [isAdultSelf, setIsAdultSelf] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!isEdit);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [inviteModal, setInviteModal] = useState<StudentRegistrationInviteResult | null>(null);
  const [postSaveStudent, setPostSaveStudent] = useState<Student | null>(null);
  const [fieldErrors, setFieldErrors] = useState<StudentFormErrors>({});
  const [baseline, setBaseline] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let nextForm: StudentFormData;
    let nextGuardians: GuardianFormEntry[];

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
          : [newGuardianEntry(true)];
      setShowAdvanced(true);
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
        autoGeneratePin: attendanceEnabled,
      };
      nextGuardians = [newGuardianEntry(true)];
      setShowAdvanced(false);
    }

    setFormData(nextForm);
    setGuardians(nextGuardians);
    setIsAdultSelf(false);
    setRevealedPin(null);
    setActiveSearchIdx(null);
    setPostSaveStudent(null);
    setFieldErrors({});
    setBaseline(studentFormSnapshot(nextForm, nextGuardians, false));
  }, [student, isOpen, attendanceEnabled, defaultLevel, teachers, classes, settings]);

  const searchResults = useMemo(() => {
    if (activeSearchIdx === null) return [];
    const q = guardians[activeSearchIdx]?.parentSearch || '';
    return searchParents(q).slice(0, 8);
  }, [activeSearchIdx, guardians]);

  const isDirty =
    Boolean(baseline) &&
    studentFormSnapshot(formData, guardians, isAdultSelf) !== baseline &&
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

  const buildGuardianInputs = (): GuardianRegistrationInput[] =>
    guardians.map((g) => ({
      mode: g.mode,
      existingParentId: g.mode === 'existing' ? g.existingParentId : undefined,
      name: g.name,
      phone: g.phone,
      email: g.email,
      relationship: g.relationship,
      isPrimary: g.isPrimary,
      invite: g.invite,
    }));

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
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
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

      if (result.generatedPin) setRevealedPin(result.generatedPin);

      let message = `${result.student.name} ${customerLabel}이 등록되었습니다.`;
      if (result.generatedPin) message += ` 출입 PIN: ${result.generatedPin}`;
      if (result.invitesSent > 0) message += ` (${contactLabel} 초대 ${result.invitesSent}건)`;
      showToast(message, 'success');
      result.inviteErrors.forEach((err) => showToast(err, 'warning'));
      setPostSaveStudent(result.student);

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

  const saveDisabled = isSubmitting || Boolean(revealedPin) || Boolean(postSaveStudent);

  const footer = postSaveStudent ? undefined : (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl min-h-[44px]"
      >
        취소
      </button>
      <button
        type="submit"
        form="student-form"
        disabled={saveDisabled}
        className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
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
            : rosterCreateFormDescription(industry, contactLabel)
        }
        maxWidth="4xl"
        intent="form"
        dirty={isDirty}
        confirmClose={confirmUnsavedClose}
        footer={footer}
      >
        {revealedPin && (
          <div className="mx-6 mt-4 p-4 bg-indigo-600 text-white rounded-2xl text-center">
            <p className="text-xs opacity-90">발급된 출입 PIN</p>
            <p className="text-3xl font-black tracking-[0.4em] font-mono mt-1">{revealedPin}</p>
          </div>
        )}

        {postSaveStudent && !inviteModal && (
          <StudentFormPostSave
            student={postSaveStudent}
            showTimetablePlacement={showTimetablePlacement}
            hint={rosterPostSaveHint(industry, serviceLabel)}
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
          className={`p-6 space-y-5 ${postSaveStudent ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <StudentBasicInfoSection
            formData={formData}
            onChange={updateFormData}
            nameError={fieldErrors.name}
          />

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 cursor-pointer min-h-[52px]">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600"
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
              <span>
                <span className="block text-xs font-bold text-slate-800">
                  성인 {customerLabel} ({contactLabel} 없음)
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {selfAccountEnrollmentNote(industry, contactLabel)}
                </span>
              </span>
            </label>

            {!isAdultSelf && (
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

          <StudentAdvancedSection
            formData={formData}
            teachers={teachers}
            classes={classes}
            showAdvanced={showAdvanced}
            onToggle={() => setShowAdvanced((v) => !v)}
            onChange={updateFormData}
          />

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

          {attendanceEnabled && !isEdit && (
            <StudentPinSection formData={formData} onChange={updateFormData} />
          )}

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
            if (!revealedPin) onClose();
          },
        })}
    </>
  );
};

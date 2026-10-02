import React from 'react';
import { Student } from '@/types';
import { CustomerPinPanel } from '@/core/attendance';
import { formatGuardianRelationship } from '@/core/parent';
import type { GuardianInfo } from '@/core/parent/types';
import { ScheduleService } from '@/core/services/scheduleService';
import {
  formatPickupAddressLine,
  formatShuttleDirection,
  getDefaultPickupAddress,
  studentUsesShuttleService,
} from '@/core/transport';
import { formatCurrency, formatPhone, getLevelColor } from '@/utils/formatters';
import { Award, Bus, Link2, MapPin, Star } from 'lucide-react';
import { useModuleLabels } from '@/core/labels';
import { combineStudentNotes } from '../form/studentFormTypes';

interface StudentDetailInfoTabProps {
  student: Student;
  guardians: GuardianInfo[];
  totalPracticeMinutes: number;
  attendanceEnabled: boolean;
  isAdmin: boolean;
  isSupabaseConfigured: boolean;
  levelLabel?: string;
  showPickupFields?: boolean;
  showGuardianContact?: boolean;
  showTuition?: boolean;
  canEditStudent?: boolean;
  onEdit: (student: Student) => void;
  onOpenGuardianLink: () => void;
}

export const StudentDetailInfoTab: React.FC<StudentDetailInfoTabProps> = ({
  student,
  guardians,
  totalPracticeMinutes,
  attendanceEnabled,
  isAdmin,
  isSupabaseConfigured,
  levelLabel = '레벨',
  showPickupFields = false,
  showGuardianContact = true,
  showTuition = true,
  canEditStudent = true,
  onEdit,
  onOpenGuardianLink,
}) => {
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;
  const notes = combineStudentNotes(student.specialNotes, student.memo);

  return (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {customerLabel} 및 {contactLabel} 상세
      </h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
          <span className="text-slate-500">{customerLabel} 번호</span>
          <span className="font-mono font-bold text-slate-800">{student.studentNumber}</span>
        </div>
        <div className="py-1.5 border-b border-slate-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">
              {contactLabel} ({guardians.length}명)
            </span>
            <div className="flex items-center gap-2">
              {isAdmin && isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={onOpenGuardianLink}
                  className="text-[10px] font-bold text-indigo-600 hover:underline min-h-[44px] px-2 flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  {contactLabel}에게 MOA 연결 안내
                </button>
              )}
              {canEditStudent && (
              <button
                type="button"
                onClick={() => onEdit(student)}
                className="text-[10px] font-bold text-indigo-600 hover:underline min-h-[44px] px-2"
              >
                {contactLabel} 추가/수정
              </button>
              )}
            </div>
          </div>
          {guardians.length === 0 ? (
            <span className="text-slate-400">등록된 {contactLabel} 없음</span>
          ) : (
            <div className="space-y-2">
              {guardians.map((g) => (
                <div
                  key={g.parentId}
                  className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-slate-100"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{g.parentName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                        {formatGuardianRelationship(g.relationship)}
                      </span>
                      {g.isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">
                          주
                        </span>
                      )}
                    </div>
                    {g.parentEmail && (
                      <span className="text-[11px] text-slate-500">{g.parentEmail}</span>
                    )}
                  </div>
                  {showGuardianContact && g.parentPhone && (
                    <a
                      href={`tel:${g.parentPhone}`}
                      className="font-mono text-xs font-bold text-indigo-600 hover:underline shrink-0"
                    >
                      {formatPhone(g.parentPhone)}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {showGuardianContact && student.emergencyContact && (
          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
            <span className="text-slate-500">비상 연락처</span>
            <a href={`tel:${student.emergencyContact}`} className="font-mono text-slate-700">
              {formatPhone(student.emergencyContact)}
            </a>
          </div>
        )}
        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
          <span className="text-slate-500">주소</span>
          <span className="text-slate-800 text-right max-w-xs">{student.address || '-'}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">입학 등록일</span>
          <span className="text-slate-800 font-medium">{student.joinDate}</span>
        </div>
      </div>
    </div>

    {showPickupFields && (
      <div className="md:col-span-2 bg-sky-50/60 rounded-2xl p-5 border border-sky-100 space-y-3">
        <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
          <Bus className="w-4 h-4" />
          픽업·하원 셔틀
        </h4>
        {studentUsesShuttleService(student) ? (
          <div className="space-y-2">
            {(student.pickupAddresses || [])
              .filter((a) => a.address.trim())
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl px-3 py-2.5 border border-sky-100 text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold">
                      {formatShuttleDirection(item.shuttleDirection)}
                    </span>
                    {item.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold inline-flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-current" />
                        기본
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    {formatPickupAddressLine(item)}
                  </p>
                  {(item.contactName || item.contactPhone) && (
                    <p className="text-slate-500 mt-1">
                      {[item.contactName, item.contactPhone && formatPhone(item.contactPhone)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {item.directions && (
                    <p className="text-slate-500 mt-1 whitespace-pre-wrap">{item.directions}</p>
                  )}
                </div>
              ))}
            {!getDefaultPickupAddress(student) && (
              <p className="text-xs text-slate-500">등록된 픽업·하원 주소가 없습니다.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">셔틀 서비스 미이용</p>
        )}
        {student.address && (
          <p className="text-xs text-slate-600 pt-1 border-t border-sky-100">
            거주지: {student.address}
          </p>
        )}
      </div>
    )}

    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        수강 및 수납 설정
      </h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
          <span className="text-slate-500">담당 선생님</span>
          <span className="font-bold text-slate-800">{student.teacherName}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
          <span className="text-slate-500">{levelLabel}</span>
          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${getLevelColor(student.level)}`}>
            {student.level}
          </span>
        </div>
        {showTuition && (
        <div className="flex justify-between py-1.5 border-b border-slate-200/60">
          <span className="text-slate-500">수강 형태</span>
          <span className="font-bold text-slate-800">
            {student.billingMode === 'session_pass' ? '회차권' : '일반'}
          </span>
        </div>
        )}
        {showTuition && student.billingMode === 'session_pass' ? (
          <div className="flex justify-between py-1.5 border-b border-slate-200/60">
            <span className="text-slate-500">회차권</span>
            <span className="font-bold text-indigo-700 text-sm">
              {(() => {
                const passes = ScheduleService.getCustomerSessionPasses(student.id).filter(
                  (p) => p.status !== 'cancelled'
                );
                if (passes.length === 0) return '해당 없음';
                return `남은 ${ScheduleService.getCustomerRemainingSessions(student.id)}회`;
              })()}
            </span>
          </div>
        ) : showTuition ? (
          <>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500">월 정규 수강료</span>
              <span className="font-bold text-indigo-700 text-sm">
                {formatCurrency(student.tuitionFee)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500">정기 수납일</span>
              <span className="font-bold text-slate-800">매월 {student.paymentDay}일</span>
            </div>
          </>
        ) : null}
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">총 누적 연습시간</span>
          <span className="font-bold text-emerald-700">
            {totalPracticeMinutes}분 ({Math.round(totalPracticeMinutes / 60)}시간)
          </span>
        </div>
      </div>
    </div>

    {attendanceEnabled && (
      <div className="md:col-span-2">
        <CustomerPinPanel student={student} />
      </div>
    )}

    {notes && (
      <div className="md:col-span-2 p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
        <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-600" />
          {customerLabel} 특이사항
        </p>
        <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line">{notes}</p>
      </div>
    )}
  </div>
  );
};

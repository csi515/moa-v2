import os
import re

file_path = 'src/core/staff/components/TeacherManagementView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports for Refine hooks
if "import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';" not in content:
    content = content.replace("import { useStorageRefresh }", "import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';\nimport { useStorageRefresh }")

# 2. Replace useStorageRefresh and const teachers/classes/students with Refine queries
old_fetch_block = """  const refreshKey = useStorageRefresh([
    STORAGE_KEYS.TEACHERS,
    STORAGE_KEYS.CLASSES,
    STORAGE_KEYS.STUDENTS,
  ]);
  const labels = useModuleLabels();
  const { currentOrganization, currentRole } = useOrganization();
  const canManageAccounts = isOrgAdmin(currentRole);

  const teachers = StorageService.getTeachers();
  const classes = StorageService.getClasses();
  const students = StorageService.getStudents();"""

new_fetch_block = """  const labels = useModuleLabels();
  const { currentOrganization, currentRole } = useOrganization();
  const canManageAccounts = isOrgAdmin(currentRole);

  // TanStack Query (via @refinedev/core) 로 데이터 페칭
  const { data: staffData, isLoading: isStaffLoading } = useList({
    resource: 'staff',
    meta: { select: '*' }
  });
  const { data: classesData, isLoading: isClassesLoading } = useList({
    resource: 'classes',
    meta: { select: '*' }
  });
  const { data: customersData, isLoading: isCustomersLoading } = useList({
    resource: 'customers',
    meta: { select: '*' }
  });

  const { mutate: createStaff } = useCreate();
  const { mutate: updateStaff } = useUpdate();
  const { mutate: deleteStaff } = useDelete();

  // DB 스키마 -> UI 모델(Teacher) 어댑터
  const teachers: Teacher[] = useMemo(() => {
    return (staffData?.data || []).map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      email: row.email || undefined,
      userId: row.user_id,
      status: row.status as Teacher['status'],
      hireDate: (row.metadata as any)?.hireDate || row.created_at,
      payType: (row.metadata as any)?.payType,
      payRate: (row.metadata as any)?.payRate,
      hourlyRate: (row.metadata as any)?.hourlyRate,
      salary: (row.metadata as any)?.salary,
      color: (row.metadata as any)?.color,
      specialty: (row.metadata as any)?.specialty,
      memo: (row.metadata as any)?.memo,
      grants: (row.metadata as any)?.grants,
    }));
  }, [staffData]);

  const classes = useMemo(() => {
    return (classesData?.data || []).map(row => ({
      id: row.id,
      name: row.name,
      teacherId: (row.metadata as any)?.teacherId,
    }));
  }, [classesData]);

  const students = useMemo(() => {
    return (customersData?.data || []).map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      teacherId: row.teacher_id,
    }));
  }, [customersData]);
"""

content = content.replace(old_fetch_block, new_fetch_block)

# 3. Replace StorageService.deleteTeacher
old_delete = "StorageService.deleteTeacher(t.id);"
new_delete = """deleteStaff({
          resource: 'staff',
          id: t.id,
        }, {
          onSuccess: () => showToast(`${labels.teacher.singular} 정보가 삭제되었습니다.`, 'success'),
        });"""
content = content.replace(old_delete, new_delete)

# 4. Replace StorageService.saveTeacher
old_save_regex = r"StorageService\.saveTeacher\(\{\s*\.\.\.\(editingTeacher \? \{ id: editingTeacher\.id \} : \{\}\),\s*([^)]+?)\s*\}\);"

def save_replacer(match):
    fields = match.group(1)
    # We will build the metadata object
    return f"""const baseData = {{
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      status: formData.status,
      metadata: {{
        hireDate: formData.hireDate,
        specialty: formData.specialty.trim(),
        color: formData.color,
        payType: formData.payType,
        hourlyRate: formData.hourlyRate,
        salary: formData.salary,
        grants: formData.grants,
      }}
    }};

    if (editingTeacher) {{
      updateStaff({{
        resource: 'staff',
        id: editingTeacher.id,
        values: baseData,
      }}, {{
        onSuccess: () => showToast(`${{labels.teacher.singular}} 정보가 수정되었습니다.`, 'success'),
      }});
    }} else {{
      createStaff({{
        resource: 'staff',
        values: baseData,
      }}, {{
        onSuccess: () => showToast(`새 ${{labels.teacher.singular}}가 등록되었습니다.`, 'success'),
      }});
    }}"""

content = re.sub(old_save_regex, save_replacer, content)

# 5. Add Loading State
if "return (" in content and "isStaffLoading" not in content.split("return (")[0][-100:]:
    content = content.replace(
        "return (", 
        "if (isStaffLoading || isClassesLoading || isCustomersLoading) return <div className=\"p-8 flex justify-center\"><Loader2 className=\"w-8 h-8 animate-spin\" /></div>;\n\n  return (", 
        1
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

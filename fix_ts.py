import os
import re

file_path = 'src/core/staff/components/TeacherManagementView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix useList usage
content = content.replace("const { data: staffData, isLoading: isStaffLoading } = useList({", "const { data: staffData, isLoading: isStaffLoading } = useList<any>({")
content = content.replace("const { data: classesData, isLoading: isClassesLoading } = useList({", "const { data: classesData, isLoading: isClassesLoading } = useList<any>({")
content = content.replace("const { data: customersData, isLoading: isCustomersLoading } = useList({", "const { data: customersData, isLoading: isCustomersLoading } = useList<any>({")

content = content.replace("const { mutate: createStaff } = useCreate();", "const { mutate: createStaff } = useCreate<any>();")
content = content.replace("const { mutate: updateStaff } = useUpdate();", "const { mutate: updateStaff } = useUpdate<any>();")
content = content.replace("const { mutate: deleteStaff } = useDelete();", "const { mutate: deleteStaff } = useDelete<any>();")

# Fix missing refreshKey in dependency array
content = content.replace("  }, [loadAccountStatuses, refreshKey]);", "  }, [loadAccountStatuses]);")

# Fix labels.teacher.singular to labels.staff.singular
content = content.replace("labels.teacher.singular", "labels.staff.singular")

old_save = """    StorageService.saveTeacher({
      ...(editingTeacher ? { id: editingTeacher.id } : {}),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      hireDate: formData.hireDate,
      specialty: formData.specialty.trim(),
      status: formData.status,
      color: formData.color,
      payType: formData.payType,
      hourlyRate:
        formData.payType === 'hourly' ||
        formData.payType === 'attendance' ||
        formData.payType === 'work_hours'
          ? Number(formData.hourlyRate) || 0
          : undefined,
      salary: formData.payType === 'monthly' ? Number(formData.salary) || 0 : undefined,
      grants: formData.grants,
    } as Teacher);

    showToast(
      editingTeacher ? `${labels.staff.singular} 정보가 수정되었습니다.` : `신규 ${labels.staff.singular}가 등록되었습니다.`,
      'success'
    );
    setIsModalOpen(false);
    loadAccountStatuses();"""

# Note: Korean strings might be mangled in powershell output but in Python they are fine if we use the exact ones.
# Let's use regex to replace StorageService.saveTeacher all the way to loadAccountStatuses();

content = re.sub(
    r"StorageService\.saveTeacher\(\{\s*\.\.\.\(editingTeacher \? \{ id: editingTeacher\.id \} : \{\}\),[\s\S]*?loadAccountStatuses\(\);",
    """const baseData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      status: formData.status,
      metadata: {
        hireDate: formData.hireDate,
        specialty: formData.specialty.trim(),
        color: formData.color,
        payType: formData.payType,
        hourlyRate:
          formData.payType === 'hourly' ||
          formData.payType === 'attendance' ||
          formData.payType === 'work_hours'
            ? Number(formData.hourlyRate) || 0
            : undefined,
        salary: formData.payType === 'monthly' ? Number(formData.salary) || 0 : undefined,
        grants: formData.grants,
      }
    };

    if (editingTeacher) {
      updateStaff({
        resource: 'staff',
        id: editingTeacher.id,
        values: baseData,
      }, {
        onSuccess: () => {
          showToast(`${labels.staff.singular} 정보가 수정되었습니다.`, 'success');
          setIsModalOpen(false);
          loadAccountStatuses();
        }
      });
    } else {
      createStaff({
        resource: 'staff',
        values: baseData,
      }, {
        onSuccess: () => {
          showToast(`새 ${labels.staff.singular}가 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          loadAccountStatuses();
        }
      });
    }""",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

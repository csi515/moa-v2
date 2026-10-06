import os

file_path = 'src/core/staff/components/TeacherManagementView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

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
        formData.payType === 'session'
          ? formData.hourlyRate
          : undefined,
      salary: formData.payType === 'salary' ? formData.salary : undefined,
      grants: formData.grants,
    });"""

new_save = """    const baseData = {
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
          formData.payType === 'session'
            ? formData.hourlyRate
            : undefined,
        salary: formData.payType === 'salary' ? formData.salary : undefined,
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
          showToast(`${labels.teacher.singular} 정보가 수정되었습니다.`, 'success');
          setIsModalOpen(false);
        }
      });
    } else {
      createStaff({
        resource: 'staff',
        values: baseData,
      }, {
        onSuccess: () => {
          showToast(`새 ${labels.teacher.singular}가 등록되었습니다.`, 'success');
          setIsModalOpen(false);
        }
      });
    }"""

content = content.replace(old_save, new_save)

# Also remove StorageService import
content = content.replace("import { StorageService } from '@/services/storage';\n", "")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

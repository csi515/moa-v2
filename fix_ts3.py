import os
import re

file_path = 'src/core/staff/components/TeacherManagementView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("staffList.data || staffList.query?.data", "(staffList as any).data || staffList.query?.data")
content = content.replace("staffList.isLoading ?? staffList.query?.isLoading", "(staffList as any).isLoading ?? staffList.query?.isLoading")

content = content.replace("classesList.data || classesList.query?.data", "(classesList as any).data || classesList.query?.data")
content = content.replace("classesList.isLoading ?? classesList.query?.isLoading", "(classesList as any).isLoading ?? classesList.query?.isLoading")

content = content.replace("customersList.data || customersList.query?.data", "(customersList as any).data || customersList.query?.data")
content = content.replace("customersList.isLoading ?? customersList.query?.isLoading", "(customersList as any).isLoading ?? customersList.query?.isLoading")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

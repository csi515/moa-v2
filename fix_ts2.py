import os
import re

file_path = 'src/core/staff/components/TeacherManagementView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace staffQuery.data with staffQuery.data
# But actually we have:
# const { data: staffData, isLoading: isStaffLoading } = useList<any>({ ... });
# which fails.

# Let's replace it with:
content = re.sub(
    r"const \{ data: staffData, isLoading: isStaffLoading \} = useList<any>\(\{([\s\S]*?)\}\);",
    r"const staffList = useList<any>({\1});\n  const staffData = staffList.data || staffList.query?.data;\n  const isStaffLoading = staffList.isLoading ?? staffList.query?.isLoading;",
    content
)

content = re.sub(
    r"const \{ data: classesData, isLoading: isClassesLoading \} = useList<any>\(\{([\s\S]*?)\}\);",
    r"const classesList = useList<any>({\1});\n  const classesData = classesList.data || classesList.query?.data;\n  const isClassesLoading = classesList.isLoading ?? classesList.query?.isLoading;",
    content
)

content = re.sub(
    r"const \{ data: customersData, isLoading: isCustomersLoading \} = useList<any>\(\{([\s\S]*?)\}\);",
    r"const customersList = useList<any>({\1});\n  const customersData = customersList.data || customersList.query?.data;\n  const isCustomersLoading = customersList.isLoading ?? customersList.query?.isLoading;",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

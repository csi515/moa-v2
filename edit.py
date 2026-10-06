import re
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(<Route index element={<IndustryAppRouter />} />\s*<Route path="/workspace" element={<IndustryAppRouter />} />\s*<Route path="/workspace/:tab" element={<IndustryAppRouter />} />)',
    '',
    content
)

content = re.sub(
    r'(<Route path="/dashboard" element={<DashboardPage />} />)',
    r'<Route index element={<IndustryAppRouter />} />\n            <Route path="/workspace" element={<IndustryAppRouter />} />\n            <Route path="/workspace/:tab" element={<IndustryAppRouter />} />\n            \1',
    content
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

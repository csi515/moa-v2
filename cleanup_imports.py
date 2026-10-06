import os
import re

industries_dir = 'src/industries'
industries = ['piano', 'daycare', 'gym', 'pilates', 'retail', 'skin', 'bath']

patterns_to_remove = [
    r"import\s+\{[^}]*\}\s+from\s+'@/context/AppContext';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/core/auth/usePermissions';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/shared/navigation/useTabGuard';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/shared/components';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/shared/components/onboarding/OnboardingResumeCard';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/shared/components/layout/ModuleAppShell';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/SupabaseRoleSync';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'@/lib/supabase';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'\./hooks/usePianoOnboardingUi';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'\./layout/[A-Za-z]+Sidebar';\n?",
    r"import\s+\{[^}]*\}\s+from\s+'\./layout/[A-Za-z]+BottomNav';\n?",
]

for industry in industries:
    file_path = os.path.join(industries_dir, industry, 'viewMap.tsx')
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for pattern in patterns_to_remove:
        content = re.sub(pattern, "", content)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Cleanup complete.")

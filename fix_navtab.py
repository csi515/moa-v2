import os
import re

industries_dir = 'src/industries'
for industry in ['daycare', 'gym', 'pilates', 'skin']:
    file_path = os.path.join(industries_dir, industry, 'viewMap.tsx')
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "NavTab" in content and "import type { NavTab }" not in content:
        content = "import type { NavTab } from '@/context/AppContext';\n" + content
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

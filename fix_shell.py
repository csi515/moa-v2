import os
import re

def fix_shell(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    start_idx = content.find('<ModuleAppShell')
    if start_idx == -1: return
    
    end_idx = content.find('</ModuleAppShell>') + len('</ModuleAppShell>')
    
    inner = content[start_idx:end_idx]
    child_match = re.search(r'>\s*(\{renderView\(\)\})\s*</ModuleAppShell>', inner)
    
    if child_match:
        child = child_match.group(1)
        new_block = f'<div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">\n      {child}\n    </div>'
        content = content[:start_idx] + new_block + content[end_idx:]
    else:
        print(f"Could not find child in {filepath}")
        return

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('src/industries'):
    for file in files:
        if file.endswith('AppContent.tsx'):
            fix_shell(os.path.join(root, file))

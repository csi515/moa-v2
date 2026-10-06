import os
import re

def fix_shell(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    start_idx = content.find('<ModuleAppShell')
    if start_idx == -1: return
    
    end_idx = content.find('</ModuleAppShell>') + len('</ModuleAppShell>')
    
    inner = content[start_idx:end_idx]
    # Match the last > before the children.
    # The children are everything between the FIRST occurrence of ">\n" (or "> ") and </ModuleAppShell>.
    # A robust way is to find the LAST ">" before the children. Actually, all the props are passed before the closing ">" of the opening tag.
    
    # Let's find the closing '>' of the opening <ModuleAppShell> tag.
    # We can just count brackets or use regex.
    match = re.search(r'<ModuleAppShell[^>]*?overlays=\{[^}]*\}[^>]*>', inner, re.DOTALL)
    if not match:
        match = re.search(r'<ModuleAppShell[^>]*>', inner, re.DOTALL)
        
    if match:
        tag_end = match.end()
        children = inner[tag_end:-len('</ModuleAppShell>')]
        new_block = f'<div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">\n      {children}\n    </div>'
        content = content[:start_idx] + new_block + content[end_idx:]
    else:
        print(f"Could not find tag end in {filepath}")
        return

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('src/industries'):
    for file in files:
        if file.endswith('AppContent.tsx'):
            fix_shell(os.path.join(root, file))

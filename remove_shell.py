import os
import re

def remove_shell(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # GenericIndustryShell was already edited manually
    
    # Replace <ModuleAppShell ... > ... </ModuleAppShell> with just the children
    content = re.sub(
        r'<ModuleAppShell[^>]*>([\s\S]*?)</ModuleAppShell>',
        r'<div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">\1</div>',
        content
    )
    
    # We might have left over <ConfirmDialog /> and <ToastContainer /> in overlays. We should be careful.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('src/industries'):
    for file in files:
        if file.endswith('AppContent.tsx'):
            remove_shell(os.path.join(root, file))


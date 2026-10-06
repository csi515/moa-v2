import os
import re

industries_dir = 'src/industries'
for industry in ['piano', 'daycare', 'gym', 'pilates', 'retail', 'skin', 'bath']:
    index_file = os.path.join(industries_dir, industry, 'index.ts')
    
    if os.path.exists(index_file):
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # We need to remove the exact line for that industry
        # e.g. export * from './PianoAppContent';
        pattern = f"export \\* from '\\./{industry.capitalize()}AppContent';\n?"
        content = re.sub(pattern, "", content)
        
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(content)

import os
import re

industries_dir = 'src/industries'
for industry in ['piano', 'daycare', 'gym', 'pilates', 'retail', 'skin', 'bath']:
    index_file = os.path.join(industries_dir, industry, 'index.ts')
    
    if os.path.exists(index_file):
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Remove export * from './*AppContent'
        content = re.sub(r"export \* from '\./[A-Za-z]+AppContent';\n?", "", content)
        
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(content)

# Also fix the type error in industryModules.tsx
file_path2 = 'src/app/industry/industryModules.tsx'
with open(file_path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace(
    "const viewMap = viewMapMod.default || viewMapMod;",
    "const viewMap = ('default' in viewMapMod ? viewMapMod.default : viewMapMod) as Record<string, () => ReactNode>;"
)

with open(file_path2, 'w', encoding='utf-8') as f:
    f.write(content2)

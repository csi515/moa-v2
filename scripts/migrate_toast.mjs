import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, callback);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) callback(p);
  });
}

const targetFiles = [];

walk('src', (file) => {
  if (file.includes('AppContext.tsx') || file.includes('notificationProvider.ts') || file.includes('uiFeedback.ts') || file.includes('ToastContainer.tsx') || file.includes('ConfirmDialog.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('showToast') && content.includes('useApp')) {
    targetFiles.push(file);
  }
});

targetFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Add import for useNotification
  if (!content.includes('useNotification')) {
    if (content.includes('@refinedev/core')) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]@refinedev\/core['"];/, (match, p1) => {
        if (!p1.includes('useNotification')) {
          return `import { ${p1.trim()}, useNotification } from '@refinedev/core';`;
        }
        return match;
      });
    } else {
      // Add after the last import
      const importMatches = [...content.matchAll(/^import\s+.*?;?\s*$/gm)];
      if (importMatches.length > 0) {
        const lastImport = importMatches[importMatches.length - 1];
        const insertPos = lastImport.index + lastImport[0].length;
        content = content.slice(0, insertPos) + "\nimport { useNotification } from '@refinedev/core';" + content.slice(insertPos);
      } else {
        content = "import { useNotification } from '@refinedev/core';\n" + content;
      }
    }
  }

  // 2. Destructure useNotification
  // Find `const { ..., showToast, ... } = useApp();`
  const useAppRegex = /const\s+{([^}]+)}\s*=\s*useApp\(\)/;
  const match = content.match(useAppRegex);
  if (match) {
    const vars = match[1].split(',').map(v => v.trim()).filter(v => v);
    const hasShowToast = vars.includes('showToast');
    if (hasShowToast) {
      const newVars = vars.filter(v => v !== 'showToast');
      let newUseApp = '';
      if (newVars.length > 0) {
        newUseApp = `const { ${newVars.join(', ')} } = useApp();\n  const { open } = useNotification();`;
      } else {
        newUseApp = `const { open } = useNotification();`;
      }
      content = content.replace(useAppRegex, newUseApp);
    }
  }

  // 3. Replace showToast(...) with open(...)
  // `showToast(message, type, title)` -> `open({ message: title || type, description: message, type: type === 'warning' ? 'success' : type })`
  // Since regex parsing of function arguments is hard, we can use a simpler replacement if possible, or just string manipulation.
  // Actually, we can define a small helper function in the same file or just use `open({ message: '알림', description: <arg1>, type: <arg2> })`
  content = content.replace(/showToast\(([^,]+)(?:,\s*([^,]+))?(?:,\s*([^)]+))?\)/g, (fullMatch, arg1, arg2, arg3) => {
    let type = arg2 ? arg2.trim() : "'success'";
    if (type === "'warning'") type = "'success'"; // Refine doesn't support warning by default, fallback to success or info
    let title = arg3 ? arg3.trim() : (type === "'error'" ? "'에러'" : "'안내'");
    return `open?.({ message: ${title}, description: ${arg1}, type: ${type} })`;
  });

  fs.writeFileSync(file, content, 'utf8');
});

console.log(`Processed ${targetFiles.length} files.`);

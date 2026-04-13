const fs = require('fs');
const file = 'PROGRESS.md';
let content = fs.readFileSync(file, 'utf8');

const logEntry = `\n- **[$(date +'%Y-%m-%d %H:%M')]** Fixed native Selection loss during Table cell formatting by updating HistoryManager snapshot cleanup to use restore(). Implemented fully transactional Table Properties UI (Width, Border, Alignment) with a robust undo/redo state preservation and accompanying E2E test coverage.`;

content += logEntry;
fs.writeFileSync(file, content);

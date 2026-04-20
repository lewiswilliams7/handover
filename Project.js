const fs = require('fs');
const path = require('path');

const contextPath = path.join(process.cwd(), 'context.md');
const defaultContent = '# Project Context\n\nDescribe the context of your project here.';

// Check if context.md already exists to avoid overwriting
if (!fs.existsSync(contextPath)) {
    fs.writeFileSync(contextPath, defaultContent);
    console.log('context.md has been created in the project root.');
} else {
    console.log('context.md already exists in the project root.');
}
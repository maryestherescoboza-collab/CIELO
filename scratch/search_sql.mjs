import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('.');
files.forEach(file => {
  if (file.endsWith('.sql')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.toLowerCase().includes('recuperaciones')) {
      console.log(`Found in: ${file}`);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('recuperaciones')) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});

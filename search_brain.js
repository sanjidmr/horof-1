import fs from 'fs';
import path from 'path';

const searchDir = 'C:\\Users\\SANJID\\.gemini\\antigravity\\brain';
const terms = ['password', 'postgres://', 'SUPABASE_DB_PASSWORD', 'db_password', 'nuqkwojmzgvrjqvlfxor'];

function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const term of terms) {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        console.log(`Found "${term}" in: ${filePath}`);
        // Log surrounding context (lines containing the term)
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(term.toLowerCase())) {
            console.log(`  Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
          }
        });
      }
    }
  } catch (err) {
    // Ignore read errors
  }
}

function traverse(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        searchFile(fullPath);
      }
    }
  } catch (err) {
    // Ignore read/dir errors
  }
}

console.log('Searching all files in brain directory...');
traverse(searchDir);
console.log('Search complete!');

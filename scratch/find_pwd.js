import fs from 'fs';
import path from 'path';

const filePath = 'C:\\Users\\SANJID\\.gemini\\antigravity\\brain\\ff02589c-da6e-4f4d-ab9a-ed4334154d78\\.system_generated\\logs\\transcript_full.jsonl';

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('password') || line.toLowerCase().includes('postgres://')) {
      console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
    }
  });
} catch (err) {
  console.error('Error reading transcript:', err);
}

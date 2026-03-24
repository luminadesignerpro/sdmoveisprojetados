import fs from 'fs';
import path from 'path';

function fixFile(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    if (content.includes('Ã£') || content.includes('Ã³') || content.includes('Ã')) {
      // Decode double encoded utf-8
      let buf = Buffer.from(content, 'latin1');
      let newContent = buf.toString('utf8');
      
      fs.writeFileSync(filepath, newContent, 'utf8');
      console.log('Fixed:', filepath);
    }
  } catch (e) {
    // skip
  }
}

function traverse(dir) {
  let files = fs.readdirSync(dir);
  for (let file of files) {
    let full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) traverse(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) fixFile(full);
  }
}

traverse('src');

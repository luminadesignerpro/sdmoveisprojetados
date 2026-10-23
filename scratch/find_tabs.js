const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const lines = s.split('\n');

lines.forEach((line, i) => {
  if (line.includes('Planejamento por Semana') || line.includes('cronograma') && line.includes('id=')) {
    console.log('Cronograma line:', i + 1, line.slice(0, 100));
  }
  if (line.includes('Próximos Compromissos & Visitas') || line.includes('Compromissos & Visitas')) {
    console.log('Agenda line:', i + 1, line.slice(0, 100));
  }
});

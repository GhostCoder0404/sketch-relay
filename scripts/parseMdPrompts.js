import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, '..', 'couples_sketch_relay_500_final.md');
const outPath = path.join(__dirname, '..', 'server', 'prompts.js');

const text = readFileSync(mdPath, 'utf8');
const lines = text.split('\n');

const prompts = [];
let currentTitle = null;
let currentSteps = [];

for (const raw of lines) {
  const line = raw.trim();

  // Match bold numbered prompt title: **1. Pan-Cake**
  const titleMatch = line.match(/^\*\*\d+\.\s+(.+?)\*\*$/);
  if (titleMatch) {
    // Save previous
    if (currentTitle && currentSteps.length === 6) {
      prompts.push({ title: currentTitle, steps: [...currentSteps] });
    }
    currentTitle = titleMatch[1].trim();
    currentSteps = [];
    continue;
  }

  // Match numbered step: 1. Draw something
  const stepMatch = line.match(/^\d+\.\s+(.+)$/);
  if (stepMatch && currentTitle) {
    currentSteps.push(stepMatch[1].trim());
  }
}

// Push last prompt
if (currentTitle && currentSteps.length === 6) {
  prompts.push({ title: currentTitle, steps: [...currentSteps] });
}

console.log(`Parsed ${prompts.length} prompts`);

const jsContent = `// Couples Sketch Relay - 500 Hand-Crafted Prompts
// Auto-generated from couples_sketch_relay_500_final.md
// Each prompt: 6 relay steps (odd=Partner A, even=Partner B)
export const PROMPTS = ${JSON.stringify(prompts, null, 2)};
`;

writeFileSync(outPath, jsContent, 'utf8');
console.log(`Written to ${outPath}`);

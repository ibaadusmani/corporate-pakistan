import { readFile } from 'node:fs/promises';
import { validateDataset } from '../src/analytics.js';
const data = JSON.parse(await readFile(new URL('../data/ownership.json',import.meta.url),'utf8'));
const errors = validateDataset(data);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Dataset valid: ${data.entities.length} entities; ${data.relationships.length} evidence-linked relationships.`);

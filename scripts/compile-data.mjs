import { readFile, writeFile } from 'node:fs/promises';
import { validateDataset, relationshipsCSV } from '../src/analytics.js';
const inputs = ['fauji','groups'];
const output = {
  schema_version: '1.0.0',
  title: 'Corporate Pakistan — Ownership Atlas',
  compiled_at: '2026-10-17',
  coverage: 'Selected disclosed 2025 ownership snapshots and explicitly undated official webpages. Not a current or complete ownership register.',
  data_license: 'CC-BY-4.0 for original structured compilation; original source documents retain their publishers’ rights.',
  entities: [], sources: [], relationships: []
};
for (const input of inputs) {
  const part = JSON.parse(await readFile(new URL(`../data/curated/${input}.json`,import.meta.url),'utf8'));
  for (const key of ['entities','sources','relationships']) output[key].push(...part[key]);
}
const errors=validateDataset(output);
if(errors.length)throw new Error(errors.join('\n'));
await writeFile(new URL('../data/ownership.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
await writeFile(new URL('../data/relationships.csv',import.meta.url),relationshipsCSV(output)+'\r\n');
console.log(`Compiled ${output.entities.length} entities and ${output.relationships.length} relationships.`);

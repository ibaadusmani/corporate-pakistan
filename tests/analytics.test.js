import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeName, searchEntities, neighborhood, ownershipPaths, portfolioOverlap, csvCell, validateDataset } from '../src/analytics.js';
const edge=(source,target,percentage,as_of='2025-12-31',type='ownership')=>({source,target,percentage,as_of,type});

test('name search handles punctuation and legal suffix variants without asserting identity',()=>{
  assert.equal(normalizeName('  Engro Corporation (Pvt.) Ltd. '),'engro corporation');
  assert.equal(searchEntities([{name:'Mari Energies Limited',ticker:'MARI',aliases:['Mari Petroleum']}],'Mari Petroleum').length,1);
  assert.equal(searchEntities([{name:'Fauji Cement',ticker:'FCCL'}],'FCCL').length,1);
});
test('ownership paths multiply proportional stakes and preserve separate routes',()=>{
  const paths=ownershipPaths([edge('a','b',60),edge('b','c',40),edge('a','c',10)],'a','c','2025-12-31');
  assert.deepEqual(paths.map(p=>p.percentage),[24,10]);
});
test('mixed dates, unknown stakes and non-ownership edges never enter arithmetic',()=>{
  const links=[edge('a','b',60),edge('b','c',40,'2025-06-30'),edge('a','c',null),edge('a','c',50,'2025-12-31','affiliation')];
  assert.deepEqual(ownershipPaths(links,'a','c','2025-12-31'),[]);
  assert.deepEqual(ownershipPaths(links,'a','c',null),[]);
});
test('cycles terminate and never create repeated-node ownership paths',()=>{
  const links=[edge('a','b',60),edge('b','a',20),edge('b','c',50)];
  const paths=ownershipPaths(links,'a','c','2025-12-31');
  assert.equal(paths.length,1);assert.equal(paths[0].percentage,30);
  assert.deepEqual(ownershipPaths(links,'a','a','2025-12-31'),[]);
});
test('path search respects depth and result caps',()=>{
  const links=[edge('a','b',100),edge('b','c',100),edge('c','d',100)];
  assert.equal(ownershipPaths(links,'a','d','2025-12-31',2).length,0);
  assert.equal(ownershipPaths([...links,edge('a','d',2)],'a','d','2025-12-31',6,1).length,1);
});
test('neighborhood walks both relationship directions but preserves the original edge directions',()=>{
  const entities=['a','b','c','d'].map(id=>({id}));const links=[edge('a','b',60),edge('b','c',20),edge('d','a',10)];
  const sub=neighborhood(entities,links,'a',1);
  assert.deepEqual(new Set(sub.entities.map(e=>e.id)),new Set(['a','b','d']));
  assert.equal(sub.relationships[1].source,'d');
});
test('portfolio overlap counts allocation once per holding and does not multiply ownership stakes',()=>{
  const links=[edge('a','b',60),edge('a','c',10),edge('a','b',60)];
  const result=portfolioOverlap(links,[{id:'b',weight:40},{id:'c',weight:30},{id:'d',weight:30}],'2025-12-31');
  assert.equal(result[0].allocation,70);assert.equal(result[0].holdings.length,2);
  assert.deepEqual(portfolioOverlap(links,[{id:'b',weight:40},{id:'c',weight:60}],'2025-06-30'),[]);
});
test('CSV escapes quotes, newlines and spreadsheet formulas',()=>{
  assert.equal(csvCell('a"b\nc'),'"a""b\nc"');assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
});
const data=JSON.parse(await readFile(new URL('../data/ownership.json',import.meta.url),'utf8'));
test('published dataset passes integrity, provenance and stake-total checks',()=>assert.deepEqual(validateDataset(data),[]));
test('schema rejects impossible totals and missing evidence',()=>{
  const broken=structuredClone(data);const r=broken.relationships.find(r=>r.percentage>0&&r.as_of);r.percentage=101;r.source_ids=['missing'];
  const errors=validateDataset(broken);assert.ok(errors.some(e=>e.includes('invalid percentage')));assert.ok(errors.some(e=>e.includes('unknown or missing evidence')));
});
test('schema rejects a duplicate snapshot and invalid calendar date',()=>{
  const broken=structuredClone(data);broken.relationships.push({...broken.relationships[0],id:'duplicate-copy'});broken.relationships[0].as_of='2025-02-30';
  assert.ok(validateDataset(broken).some(e=>e.includes('invalid date')));
  broken.relationships[0].as_of=broken.relationships.at(-1).as_of;
  assert.ok(validateDataset(broken).some(e=>e.includes('duplicate relationship snapshot')));
});
test('real Fauji Foods data produces multiple exact-date economic paths, never a synthetic 82.16% direct edge',()=>{
  const paths=ownershipPaths(data.relationships,'ffc','ffl','2025-12-31');
  assert.ok(paths.some(p=>Math.abs(p.percentage-47.84)<.00001&&p.edges.length===1));
  assert.ok(paths.some(p=>Math.abs(p.percentage-11.9025)<.00001&&p.edges.length===2));
  assert.ok(!data.relationships.some(r=>r.source==='ffc'&&r.target==='ffl'&&r.percentage===82.16));
});
test('real Nishat reciprocal holdings do not create infinite paths',()=>{
  const paths=ownershipPaths(data.relationships,'nishat-mills','mcb-bank','2025-06-30');
  assert.equal(paths.length,1);assert.ok(Math.abs(paths[0].percentage-(.314*.0863*100))<.000001);
});

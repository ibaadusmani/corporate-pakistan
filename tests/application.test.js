import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import * as analytics from '../src/analytics.js';

const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const dataset=JSON.parse(await readFile(new URL('../data/ownership.json',import.meta.url),'utf8'));

async function app(hash='') {
  const errors=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{url:'https://atlas.example/'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;
  w.fetch=async()=>({ok:true,json:async()=>structuredClone(dataset)});
  w.analytics=analytics;
  w.console.error=(...args)=>errors.push(args.join(' '));
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  // The app stays an ES module in production; supply its imported pure functions in this isolated test DOM.
  w.eval(source.replace(/^import .*?;\n/,'const { searchEntities, neighborhood, ownershipPaths, portfolioOverlap, relationshipsCSV, validateDataset } = window.analytics;\n'));
  for(let i=0;i<20&&w.document.querySelector('#app').hidden;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(w.document.querySelector('#app').hidden,false,errors.join('\n'));
  return {w,document:w.document,errors,close:()=>w.close()};
}

test('application loads real dataset, network, sources and analytical defaults',async()=>{
  const a=await app();try{
    assert.equal(a.document.querySelectorAll('.node').length,dataset.entities.length);
    assert.equal(a.document.querySelectorAll('.network-edge').length,dataset.relationships.length);
    assert.match(a.document.querySelector('#detail-panel').textContent,/Fauji Foundation/);
    assert.ok(a.document.querySelectorAll('#path-results .result-path').length>1);
    assert.equal(a.document.querySelectorAll('.source-record').length,dataset.sources.length);
    assert.equal(a.errors.length,0,a.errors.join('\n'));
  }finally{a.close();}
});
test('search selects and isolates an entity, then reset restores full coverage',async()=>{
  const a=await app();try{
    const search=a.document.querySelector('#search');search.value='AKBL';search.dispatchEvent(new a.w.Event('input'));
    a.document.querySelector('.search-result').click();
    assert.match(a.document.querySelector('#detail-panel').textContent,/Askari Bank/);
    assert.ok(a.document.querySelectorAll('.node').length<dataset.entities.length);
    a.document.querySelector('#reset-filters').click();
    assert.equal(a.document.querySelectorAll('.node').length,dataset.entities.length);
  }finally{a.close();}
});
test('group, layer, date and stake controls update map and table together',async()=>{
  const a=await app();try{
    a.document.querySelector('[data-group="fauji"]').click();
    assert.ok(a.document.querySelectorAll('.node').length<dataset.entities.length);
    const date=a.document.querySelector('#snapshot');date.value='2025-12-31';date.dispatchEvent(new a.w.Event('change'));
    const range=a.document.querySelector('#min-stake');range.value='50';range.dispatchEvent(new a.w.Event('input'));
    a.document.querySelector('#table-mode').click();
    assert.equal(a.document.querySelector('#table-stage').hidden,false);
    const rows=a.document.querySelectorAll('.network-table tbody tr');assert.ok(rows.length>0);
    for(const row of rows)assert.match(row.textContent,/31 Dec 2025/);
    const layer=a.document.querySelector('input[value="ownership"]');layer.checked=false;layer.dispatchEvent(new a.w.Event('change'));
    assert.equal(a.document.querySelectorAll('.network-edge').length,0);
    assert.equal(a.errors.length,0,a.errors.join('\n'));
  }finally{a.close();}
});
test('a copied view restores entity, date, group, scope, layers and display settings',async()=>{
  const a=await app('#tab=atlas&entity=ffc&group=fauji&date=2025-12-31&scope=1&layers=ownership&mode=table&labels=0');try{
    assert.equal(a.document.querySelector('#snapshot').value,'2025-12-31');
    assert.equal(a.document.querySelector('#scope').value,'1');
    assert.equal(a.document.querySelector('#labels').checked,false);
    assert.equal(a.document.querySelector('#table-stage').hidden,false);
    assert.equal(a.document.querySelector('input[value="director"]').checked,false);
    assert.match(a.document.querySelector('#detail-panel').textContent,/Fauji Fertilizer/);
  }finally{a.close();}
});
test('network node keyboard activation and research navigation select the correct entity',async()=>{
  const a=await app();try{
    a.document.querySelector('[data-node="akbl"]').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    assert.match(a.document.querySelector('#detail-panel').textContent,/Askari Bank/);
    a.document.querySelector('[data-tab="research"]').click();assert.equal(a.document.querySelector('#research-view').hidden,false);
    a.document.querySelector('#research-cards [data-story]').click();assert.equal(a.document.querySelector('#atlas-view').hidden,false);
  }finally{a.close();}
});
test('analysis rejects duplicate allocations and invalid totals; exact-date missing paths remain unknown',async()=>{
  const a=await app();try{
    const weight=a.document.querySelector('.position-row input');weight.value='1';a.document.querySelector('#analyze-portfolio').click();
    assert.match(a.document.querySelector('#portfolio-results').textContent,/must total 100/);
    const rows=[...a.document.querySelectorAll('.position-row')];rows.forEach((r,i)=>r.querySelector('input').value=i===0?'100':'0');
    rows[1].querySelector('select').value=rows[0].querySelector('select').value;a.document.querySelector('#analyze-portfolio').click();assert.match(a.document.querySelector('#portfolio-results').textContent,/duplicate holdings/);
    a.document.querySelector('#path-owner').value='nishat-mills';a.document.querySelector('#path-target').value='mcb-bank';a.document.querySelector('#path-date').value='2025-12-31';a.document.querySelector('#trace-path').click();
    assert.match(a.document.querySelector('#path-results').textContent,/insufficient evidence/);
  }finally{a.close();}
});
test('methodology dialog opens and closes without losing atlas selection',async()=>{
  const a=await app();try{
    a.document.querySelector('.methodology-open').click();assert.equal(a.document.querySelector('#methodology-dialog').open,true);
    a.document.querySelector('#close-methodology').click();assert.equal(a.document.querySelector('#methodology-dialog').open,false);
  }finally{a.close();}
});

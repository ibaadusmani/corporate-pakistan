import { searchEntities, neighborhood, ownershipPaths, portfolioOverlap, relationshipsCSV, validateDataset } from './analytics.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escape = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent = value => Number.isFinite(value) ? `${Number(value.toFixed(4))}%` : 'Not quantified';
const date = value => value ? new Date(value+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'Undated disclosure';
const groupInfo = {
  fauji: {name:'Fauji network',color:'#52784c',light:'#dfebd0'},
  engro: {name:'Engro / Dawood',color:'#557f8b',light:'#d8e8ea'},
  lucky: {name:'Lucky / Yunus',color:'#af8a4b',light:'#f1e8cd'},
  nishat: {name:'Nishat network',color:'#92739c',light:'#e9dff0'},
  other: {name:'Other connections',color:'#7b8974',light:'#e4e9de'}
};
let data, byId, sourceById;
let state = {tab:'atlas',selected:null,group:'all',layers:new Set(['ownership','affiliation','director']),snapshot:'all',minStake:0,scope:'all',labels:true,mode:'network'};
let filtered = {entities:[],relationships:[]};
let zoom = {scale:1,x:0,y:0};
let positions = new Map();
let toastTimer;

function toast(message) { $('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3000); }
function group(e) { return groupInfo[e?.group] || groupInfo.other; }
function name(id) { return byId.get(id)?.short_name || byId.get(id)?.name || id; }
function entityOptions(entities = data.entities) { return [...entities].sort((a,b)=>a.name.localeCompare(b.name)).map(e=>`<option value="${escape(e.id)}">${escape(e.ticker ? `${e.ticker} · ${e.name}` : e.name)}</option>`).join(''); }
function download(filename,content,type) { const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function sourceHTML(id) {
  const s=sourceById.get(id);if(!s)return '';
  return `<a class="source-link" href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.publisher)} · ${escape(s.title)}${s.page?` · p./section ${escape(s.page)}`:''} ↗</a>`;
}
function linkEvidence(r) { return `<p>${escape(r.evidence)}</p>${r.notes?`<p class="evidence-note">${escape(r.notes)}</p>`:''}${r.source_ids.map(sourceHTML).join('')}<div class="micro">${escape(r.id)} · Source reviewed · As of ${escape(date(r.as_of))}</div>`; }

function setTab(tab) {
  if(!['atlas','research','lab','data'].includes(tab))tab='atlas';
  state.tab=tab;
  $$('.tab-view').forEach(v=>v.hidden=v.id!==`${tab}-view`);
  $$('.nav-btn').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');});
  updateURL();
}
function updateURL() {
  const p=new URLSearchParams({tab:state.tab});
  if(state.selected)p.set('entity',state.selected);
  if(state.group!=='all')p.set('group',state.group);
  if(state.snapshot!=='all')p.set('date',state.snapshot);
  if(state.minStake)p.set('min',String(state.minStake));
  if(state.scope!=='all')p.set('scope',state.scope);
  if(state.layers.size!==3)p.set('layers',[...state.layers].sort().join(','));
  if(state.mode!=='network')p.set('mode',state.mode);
  if(!state.labels)p.set('labels','0');
  history.replaceState(null,'','#'+p.toString());
}
function restoreURL() {
  const p=new URLSearchParams(location.hash.slice(1));
  if(p.get('entity')&&byId.has(p.get('entity')))state.selected=p.get('entity');
  if(groupInfo[p.get('group')])state.group=p.get('group');
  if(p.get('date')&&data.relationships.some(r=>(r.as_of||'undated')===p.get('date')))state.snapshot=p.get('date');
  state.minStake=Math.min(100,Math.max(0,Number(p.get('min'))||0));
  if(['1','2'].includes(p.get('scope')))state.scope=p.get('scope');
  if(p.has('layers'))state.layers=new Set(p.get('layers').split(',').filter(x=>['ownership','affiliation','director'].includes(x)));
  if(p.get('mode')==='table')state.mode='table';
  if(p.get('labels')==='0')state.labels=false;
  state.tab=p.get('tab')||'atlas';
}
function syncFilters() {
  $('#snapshot').value=state.snapshot;$('#min-stake').value=state.minStake;$('#stake-label').textContent=`${state.minStake}%`;$('#scope').value=state.scope;$('#labels').checked=state.labels;
  $$('input[name=layer]').forEach(el=>el.checked=state.layers.has(el.value));
  $$('.group-button').forEach(el=>el.classList.toggle('active',el.dataset.group===state.group));
  $('#network-mode').classList.toggle('active',state.mode==='network');$('#table-mode').classList.toggle('active',state.mode==='table');
  $('#graph-stage').hidden=state.mode!=='network';$('#table-stage').hidden=state.mode!=='table';
}
function refresh() {
  let edges=data.relationships.filter(r=>state.layers.has(r.type)
    &&(state.snapshot==='all'||(r.as_of||'undated')===state.snapshot)
    &&(r.type!=='ownership'||!Number.isFinite(r.percentage)||r.percentage>=state.minStake));
  if(state.group!=='all')edges=edges.filter(r=>byId.get(r.source)?.group===state.group||byId.get(r.target)?.group===state.group);
  const ids=new Set(edges.flatMap(r=>[r.source,r.target]));
  let entities=data.entities.filter(e=>ids.has(e.id));
  if(state.scope!=='all'&&state.selected){const sub=neighborhood(entities,edges,state.selected,Number(state.scope));entities=sub.entities;edges=sub.relationships;}
  filtered={entities,relationships:edges};
  syncFilters();renderGraph();renderTable();renderDetails();updateURL();
  $('#visible-count').textContent=`${entities.length} NODES / ${edges.length} LINKS`;
  $('#graph-title').textContent=state.group==='all'?'The ownership atlas':groupInfo[state.group].name;
  $('#graph-empty').hidden=edges.length>0;
}
function resetFilters() { state.group='all';state.layers=new Set(['ownership','affiliation','director']);state.snapshot='all';state.minStake=0;state.scope='all';$('#search').value='';$('#search-results').hidden=true;zoom={scale:1,x:0,y:0};refresh(); }
function selectEntity(id,{focus=false}={}) {
  if(!byId.has(id))return;
  state.selected=id;
  if(focus){state.group='all';state.scope='1';state.snapshot='all';state.minStake=0;state.layers=new Set(['ownership','affiliation','director']);}
  $('#search-results').hidden=true;$('#search').value='';setTab('atlas');refresh();
}

function relationCard(r,direction) {
  const other=direction==='incoming'?r.source:r.target;
  const label=r.type==='ownership'?(direction==='incoming'?'DISCLOSED SHAREHOLDER':'DISCLOSED INVESTMENT'):r.type==='director'?'BOARD CONNECTION':'DISCLOSED AFFILIATION';
  return `<details class="relationship-card"><summary><div class="relationship-top"><button data-entity="${escape(other)}">${escape(name(other))}</button><b>${r.type==='ownership'?(Number.isFinite(r.percentage)?percent(r.percentage):'↗'):'↔'}</b></div><div class="relationship-meta"><span>${label}</span><span>${escape(date(r.as_of))} ▾</span></div></summary><div class="relationship-evidence">${linkEvidence(r)}</div></details>`;
}
function renderDetails() {
  const e=byId.get(state.selected);
  if(!e){$('#detail-panel').innerHTML='<h2>Select a connection.</h2><p class="entity-description">Click a node to inspect its publicly disclosed relationships.</p>';return;}
  // Details describe only links that pass the current filters, so the inspector agrees with the map.
  const incoming=filtered.relationships.filter(r=>r.target===e.id).sort((a,b)=>(b.percentage||0)-(a.percentage||0));
  const outgoing=filtered.relationships.filter(r=>r.source===e.id).sort((a,b)=>(b.percentage||0)-(a.percentage||0));
  const sources=new Set([...incoming,...outgoing].flatMap(r=>r.source_ids));
  const g=group(e);
  $('#detail-panel').innerHTML=`<div class="detail-heading-block"><div class="detail-eyebrow"><span>ENTITY PROFILE</span><span>${escape(e.ticker||e.type.toUpperCase())}</span></div><div class="node-emblem" style="background:${g.light};color:${g.color}">${escape((e.ticker||e.short_name||e.name).slice(0,3).toUpperCase())}</div><h2>${escape(e.name)}</h2><div class="entity-tags"><span class="tag">${escape(e.sector||e.type)}</span><span class="tag">${escape(g.name)}</span></div><p class="entity-description">${escape(e.description||'Explore this entity’s disclosed connections in the selected coverage.')}</p></div><div class="detail-relations"><div class="detail-divider"></div>${incoming.length?`<div class="detail-section-title">INCOMING CONNECTIONS / ${incoming.length}</div>${incoming.map(r=>relationCard(r,'incoming')).join('')}`:''}${outgoing.length?`<div class="detail-section-title" style="margin-top:18px">OUTGOING CONNECTIONS / ${outgoing.length}</div>${outgoing.map(r=>relationCard(r,'outgoing')).join('')}`:''}${!incoming.length&&!outgoing.length?'<p class="empty-note">No relationships for this entity match the current filters. Reset filters to explore its available disclosures.</p>':''}</div><button class="detail-action" id="focus-entity">${state.scope==='1'?'Show the full network ↗':'Isolate this network ↗'}</button><div class="detail-source-count">${sources.size} EVIDENCE SECTION${sources.size===1?'':'S'} · ${incoming.length+outgoing.length} VISIBLE CONNECTIONS</div>`;
  $('#focus-entity').addEventListener('click',()=>{state.scope=state.scope==='1'?'all':'1';refresh();});
  bindEntityLinks($('#detail-panel'));
}
function bindEntityLinks(root) { root.querySelectorAll('[data-entity]').forEach(b=>b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectEntity(b.dataset.entity);})); }

// Deterministic cluster layout, with a short bounded force relaxation. No dependency or remote service.
function graphLayout(entities,edges) {
  const groups=[...new Set(entities.map(e=>e.group))];
  const single=groups.length===1||state.scope!=='all';
  const centers=single?groups.map(()=>[500,315]):groups.map((_,i)=>[[280,220],[725,220],[280,480],[725,480],[500,350]][i%5]);
  const map=new Map();
  const degree=new Map(entities.map(e=>[e.id,edges.filter(r=>r.source===e.id||r.target===e.id).length]));
  groups.forEach((g,gi)=>{
    const members=entities.filter(e=>e.group===g).sort((a,b)=>degree.get(b.id)-degree.get(a.id)||a.id.localeCompare(b.id));
    const [cx,cy]=centers[gi];
    members.forEach((e,i)=>{
      const angle=i*2.399963;const radius=i===0?0:(single?65:45)+Math.sqrt(i)*19;
      map.set(e.id,{...e,x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius,cx,cy,degree:degree.get(e.id),r:Math.min(24,8+Math.sqrt(degree.get(e.id))*3.2)});
    });
  });
  const nodes=[...map.values()];
  for(let step=0;step<180;step++){
    const force=new Map(nodes.map(n=>[n.id,{x:(n.cx-n.x)*.008,y:(n.cy-n.y)*.008}]));
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];let dx=a.x-b.x,dy=a.y-b.y,d2=Math.max(80,dx*dx+dy*dy);const d=Math.sqrt(d2);const push=Math.min(3,1000/d2);
      force.get(a.id).x+=dx/d*push;force.get(a.id).y+=dy/d*push;force.get(b.id).x-=dx/d*push;force.get(b.id).y-=dy/d*push;
    }
    for(const edge of edges){const a=map.get(edge.source),b=map.get(edge.target);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-(single?130:100))*.008;force.get(a.id).x+=dx/d*f;force.get(a.id).y+=dy/d*f;force.get(b.id).x-=dx/d*f;force.get(b.id).y-=dy/d*f;}
    for(const n of nodes){n.x=Math.min(930,Math.max(70,n.x+force.get(n.id).x));n.y=Math.min(590,Math.max(70,n.y+force.get(n.id).y));}
  }
  return map;
}
function renderGraph() {
  const svg=$('#network');positions=graphLayout(filtered.entities,filtered.relationships);
  const neighbors=new Set([state.selected]);filtered.relationships.forEach(r=>{if(r.source===state.selected)neighbors.add(r.target);if(r.target===state.selected)neighbors.add(r.source);});
  const hasSelected=positions.has(state.selected);
  let html=`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="#81936f" stroke-width="1.5"/></marker></defs><g id="viewport">`;
  for(const r of filtered.relationships){const a=positions.get(r.source),b=positions.get(r.target);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));const x1=a.x+dx/len*(a.r+2),y1=a.y+dy/len*(a.r+2),x2=b.x-dx/len*(b.r+5),y2=b.y-dy/len*(b.r+5);const active=r.source===state.selected||r.target===state.selected;const opacity=hasSelected?(active?.85:.16):.4;
    html+=`<line class="network-edge" data-edge="${escape(r.id)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${active?group(a).color:'#91a27e'}" stroke-width="${r.type==='ownership'?1+(r.percentage||0)/65:1}" ${r.type==='ownership'?'marker-end="url(#arrow)"':`stroke-dasharray="${r.type==='director'?'2 4':'6 5'}"`} opacity="${opacity}"><title>${escape(name(r.source))} → ${escape(name(r.target))}: ${escape(r.type)} ${r.percentage!==null?percent(r.percentage):''}, ${escape(date(r.as_of))}</title></line>`;
    if(active&&Number.isFinite(r.percentage)&&filtered.relationships.length<45)html+=`<text class="stake-label" x="${(a.x+b.x)/2+4}" y="${(a.y+b.y)/2-6}">${percent(r.percentage)}</text>`;
  }
  // Draw selected nodes last so their labels stay legible.
  const nodes=[...positions.values()].sort((a,b)=>(a.id===state.selected?1:0)-(b.id===state.selected?1:0));
  for(const n of nodes){const g=group(n),selected=n.id===state.selected,opacity=hasSelected&&!neighbors.has(n.id)?.45:1;const label=n.ticker||n.short_name||n.name;const show=state.labels&&(filtered.entities.length<35||n.degree>1||neighbors.has(n.id));
    html+=`<g class="node" data-node="${escape(n.id)}" transform="translate(${n.x},${n.y})" tabindex="0" role="button" aria-label="Explore ${escape(n.name)}" opacity="${opacity}">${selected?`<circle r="${n.r+7}" fill="none" stroke="${g.color}" stroke-width="1" opacity=".25"/>`:''}<circle r="${n.r}" fill="${selected?g.color:g.light}" stroke="${g.color}" stroke-width="${selected?2:1.2}"/><text text-anchor="middle" dy="3" style="font:8px var(--mono);fill:${selected?'#f2f6e6':g.color};pointer-events:none">${escape(n.type==='person'?'•':(n.ticker||label.slice(0,2).toUpperCase()))}</text><title>${escape(n.name)} · ${n.degree} connections</title>${show?`<text class="node-label ${selected?'selected':''}" text-anchor="middle" y="${n.r+17}">${escape(label.length>27?label.slice(0,25)+'…':label)}</text>`:''}</g>`;
  }
  html+='</g>';svg.innerHTML=html;applyZoom();
  svg.querySelectorAll('[data-node]').forEach(el=>{el.addEventListener('click',()=>{if(!dragMoved)selectEntity(el.dataset.node);});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectEntity(el.dataset.node);}});});
  svg.querySelectorAll('[data-edge]').forEach(el=>el.addEventListener('click',()=>{if(dragMoved)return;const r=data.relationships.find(r=>r.id===el.dataset.edge);if(r){selectEntity(r.target);const detail=$('#detail-panel').querySelectorAll('.relationship-card');for(const d of detail)if(d.textContent.includes(r.id))d.open=true;}}));
}
function applyZoom() { $('#viewport')?.setAttribute('transform',`translate(${zoom.x},${zoom.y}) translate(500,340) scale(${zoom.scale}) translate(-500,-340)`); }
let dragging=false,dragMoved=false,dragStart=null;
function setupGraphInteraction(){
  const svg=$('#network');
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;dragMoved=false;dragStart={x:e.clientX,y:e.clientY,zx:zoom.x,zy:zoom.y};});
  svg.addEventListener('pointermove',e=>{if(!dragging)return;const rect=svg.getBoundingClientRect(),dx=(e.clientX-dragStart.x)*1000/rect.width,dy=(e.clientY-dragStart.y)*680/rect.height;if(Math.abs(dx)+Math.abs(dy)>5){dragMoved=true;if(!svg.hasPointerCapture(e.pointerId))svg.setPointerCapture(e.pointerId);zoom.x=dragStart.zx+dx;zoom.y=dragStart.zy+dy;applyZoom();}});
  svg.addEventListener('pointerup',e=>{dragging=false;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);setTimeout(()=>dragMoved=false,0);});
  svg.addEventListener('pointercancel',()=>{dragging=false;});
  svg.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom.scale=Math.max(.5,Math.min(3,zoom.scale*(e.deltaY>0?.9:1.1)));applyZoom();}},{passive:false});
  $('#zoom-in').onclick=()=>{zoom.scale=Math.min(3,zoom.scale*1.2);applyZoom();};$('#zoom-out').onclick=()=>{zoom.scale=Math.max(.5,zoom.scale/1.2);applyZoom();};$('#zoom-reset').onclick=()=>{zoom={scale:1,x:0,y:0};applyZoom();};
}
function renderTable() {
  $('#table-stage').innerHTML=`<table class="network-table"><thead><tr><th>SOURCE / OWNER</th><th>TARGET / INVESTEE</th><th>RELATIONSHIP</th><th>EVIDENCE</th></tr></thead><tbody>${filtered.relationships.map(r=>`<tr><td><button data-entity="${escape(r.source)}">${escape(name(r.source))}</button></td><td><button data-entity="${escape(r.target)}">${escape(name(r.target))}</button></td><td>${escape(r.type)} ${r.percentage!==null?`<strong>${percent(r.percentage)}</strong>`:''}<small>${escape(date(r.as_of))}</small></td><td><details><summary>View source</summary>${linkEvidence(r)}</details></td></tr>`).join('')||'<tr><td colspan="4">No relationships match the selected filters.</td></tr>'}</tbody></table>`;
  bindEntityLinks($('#table-stage'));
}
function renderSearch() {
  const q=$('#search').value.trim();const results=$('#search-results');if(!q){results.hidden=true;return;}
  const matches=searchEntities(data.entities,q).slice(0,10);
  results.innerHTML=matches.length?matches.map(e=>`<button class="search-result" data-entity="${escape(e.id)}">${escape(e.name)}<small>${escape(e.ticker||e.type)} · ${escape(group(e).name)}</small></button>`).join(''):'<p class="micro" style="padding:12px">No matching entity in this release.</p>';
  results.hidden=false;results.querySelectorAll('[data-entity]').forEach(b=>b.onclick=()=>selectEntity(b.dataset.entity,{focus:true}));
}
function renderSources() {
  $('#data-summary').innerHTML=`<div><b>${new Set(data.sources.map(s=>s.url)).size}</b><span>SOURCE DOCUMENTS / PAGES</span></div><div><b>${data.sources.length}</b><span>EVIDENCE SECTIONS</span></div><div><b>${data.relationships.filter(r=>r.percentage!==null).length}</b><span>QUANTIFIED LINKS</span></div>`;
  $('#sources-list').innerHTML=data.sources.map((s,i)=>`<article class="source-record"><span class="source-index">${String(i+1).padStart(2,'0')}</span><div><h3>${escape(s.title)}</h3><p>${escape(s.publisher)} · ${escape(s.kind.replaceAll('_',' '))}<br>Reporting date: ${escape(date(s.as_of))} · Accessed ${escape(date(s.accessed))}${s.page?` · Page / section: ${escape(s.page)}`:''}</p><span class="tag">${data.relationships.filter(r=>r.source_ids.includes(s.id)).length} SUPPORTED LINKS</span></div><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">Open original ↗</a></article>`).join('');
}
function storyData() {
  const fauji=data.entities.find(e=>/fauji foundation/i.test(e.name));
  const ffc=data.entities.find(e=>e.ticker==='FFC');
  const engro=data.entities.find(e=>e.ticker==='ENGROH')||data.entities.find(e=>e.group==='engro');
  const nishat=data.entities.find(e=>e.ticker==='DGKC')||data.entities.find(e=>e.group==='nishat');
  const askari=data.entities.find(e=>e.ticker==='AKBL');
  const food=data.entities.find(e=>e.ticker==='FFL');
  const bankEdge=ffc&&askari?data.relationships.find(r=>r.source===ffc.id&&r.target===askari.id&&Number.isFinite(r.percentage)):null;
  const stories=[{
    number:'01',title:'The Fauji network, one link at a time.',short:'Explore a network spanning several industries. Follow each investment back to its disclosure.',
    body:'Start at Fauji Foundation and follow the disclosed connections into listed and unlisted companies. The network includes separate legal entities and dated ownership layers. Some connections are quantified stakes; others are explicitly disclosed affiliations. The graph keeps those two kinds of evidence distinct.',
    entity:fauji?.id,edges:data.relationships.filter(r=>r.source===fauji?.id).slice(0,2)
  },{
    number:'02',title:'A majority stake is only part of the story.',short:'Ownership percentages and governance arrangements answer different questions.',
    body:bankEdge?`FFC discloses a ${percent(bankEdge.percentage)} interest in Askari Bank as at ${date(bankEdge.as_of)}. Read the relationship evidence for the treatment of that investment and any stated governance arrangements. The atlas records the economic stake separately from claims about control: a percentage alone cannot resolve both.`:'A majority percentage can suggest economic exposure, but determining control also requires governance evidence. Inspect investment notes and board arrangements alongside the shareholder table.',
    entity:askari?.id||ffc?.id,edges:bankEdge?[bankEdge]:[]
  },{
    number:'03',title:'Look through the holding company.',short:'A familiar company name can sit inside several layers of investment.',
    body:'Holding companies connect businesses across sectors. Explore the Engro / Dawood network, then use the analysis lab to trace a path through multiple entities at one exact reporting date. The result is a path-specific economic interest, not a claim of ultimate beneficial ownership.',
    entity:engro?.id,edges:data.relationships.filter(r=>r.source===engro?.id).slice(0,2)
  },{
    number:'04',title:'Cross-holdings change the picture.',short:'Explore disclosed links across a business network instead of treating every stock as isolated.',
    body:'The Nishat network offers a starting point for inspecting investments between companies. Connections may run in more than one direction. The path tool never revisits an entity in the same path, and it does not sum products through circular or overlapping structures.',
    entity:nishat?.id,edges:data.relationships.filter(r=>r.source===nishat?.id||r.target===nishat?.id).slice(0,2)
  }];
  if(food){const foodEdges=data.relationships.filter(r=>r.target===food.id&&r.type==='ownership');if(foodEdges.length>1)stories.push({number:'05',title:'One business. Several disclosed owners.',short:'Separate direct stakes from the interest held through other entities.',body:`The dataset records ${foodEdges.length} disclosed shareholder links into Fauji Foods across its covered snapshots. Open each link to inspect the owner and date. Stakes held by different legal entities should not automatically be attributed in full to a common parent. Use an exact-date ownership path to explore the layers.`,entity:food.id,edges:foodEdges.slice(0,2)});}
  return stories.filter(s=>s.entity);
}
function renderStories() {
  const stories=storyData();
  $('#story-preview').innerHTML=stories.slice(0,3).map(s=>`<article class="story-card"><div class="story-orbit"></div><div class="story-number">FIELD NOTE / ${s.number}</div><h3>${escape(s.title)}</h3><p>${escape(s.short)}</p><button data-story="${escape(s.entity)}" aria-label="Explore ${escape(s.title)}">↗</button></article>`).join('');
  $('#research-cards').innerHTML=stories.map(s=>`<article class="research-note"><div class="eyebrow">FIELD NOTE / ${s.number}</div><h3>${escape(s.title)}</h3><p>${escape(s.body)}</p>${[...new Set(s.edges.flatMap(e=>e.source_ids))].map(sourceHTML).join('')}<button class="text-button" data-story="${escape(s.entity)}">Explore this network ↗</button></article>`).join('');
  $$('[data-story]').forEach(b=>b.onclick=()=>{selectEntity(b.dataset.story,{focus:true});$('#atlas-view').scrollIntoView({behavior:'instant',block:'start'});});
}
function setupLab() {
  const counts=new Map();for(const r of data.relationships)if(r.type==='ownership'&&Number.isFinite(r.percentage)&&r.as_of)counts.set(r.as_of,(counts.get(r.as_of)||0)+1);
  const dates=[...counts.keys()].sort().reverse();
  const options=dates.map(d=>`<option value="${d}">${escape(date(d))} · ${counts.get(d)} quantified links</option>`).join('');
  $('#path-date').innerHTML=options;$('#portfolio-date').innerHTML=options;
  const best=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];
  if(best){$('#path-date').value=best;$('#portfolio-date').value=best;}
  $('#path-owner').innerHTML=entityOptions();$('#path-target').innerHTML=entityOptions();
  const foundation=data.entities.find(e=>/fauji foundation/i.test(e.name));const ffl=data.entities.find(e=>e.ticker==='FFL');
  if(foundation)$('#path-owner').value=foundation.id;if(ffl)$('#path-target').value=ffl.id;
  if(foundation&&ffl){const pathDates=dates.filter(d=>ownershipPaths(data.relationships,foundation.id,ffl.id,d).length);if(pathDates.length)$('#path-date').value=pathDates[0];}
  const candidates=data.entities.filter(e=>e.ticker&&data.relationships.some(r=>r.target===e.id&&r.as_of===$('#portfolio-date').value&&r.type==='ownership'));
  const preferred=['FFC','MARI','AKBL','FFL'].map(t=>candidates.find(e=>e.ticker===t)).filter(Boolean);
  const initial=(preferred.length>=2?preferred:candidates.slice(0,4));
  initial.forEach((e,i)=>addPosition(e.id,i===initial.length-1?100-Math.floor(100/initial.length)*(initial.length-1):Math.floor(100/initial.length)));
  if(!initial.length)addPosition();
  $('#trace-path').onclick=tracePath;$('#analyze-portfolio').onclick=analyzePortfolio;$('#add-position').onclick=()=>addPosition();
  $('#portfolio-date').onchange=()=>$('#portfolio-results').innerHTML='<p class="micro">Snapshot changed. Run the analysis again.</p>';
  for(const id of ['path-date','path-owner','path-target'])$('#'+id).onchange=()=>$('#path-results').innerHTML='<p class="micro">Selection changed. Trace the path again.</p>';
  tracePath();analyzePortfolio();
}
function tracePath() {
  const owner=$('#path-owner').value,target=$('#path-target').value,asOf=$('#path-date').value;
  const paths=ownershipPaths(data.relationships,owner,target,asOf);
  if(owner===target){$('#path-results').innerHTML='<div class="analysis-alert">Choose two different entities.</div>';return;}
  $('#path-results').innerHTML=paths.length?paths.map((p,i)=>`<article class="result-path"><h4>${percent(p.percentage)} <small>through path ${i+1}</small></h4><p>${escape(name(owner))}${p.edges.map(r=>` <span aria-hidden="true">→</span> ${escape(name(r.target))}`).join('')}</p><small>${p.edges.map(r=>percent(r.percentage)).join(' × ')} · ${escape(date(p.as_of))}</small><details><summary class="text-button" style="margin-top:8px">Inspect path evidence</summary>${p.edges.map(r=>`<div class="relationship-evidence" style="margin-top:12px"><strong>${escape(name(r.source))} → ${escape(name(r.target))}</strong>${linkEvidence(r)}</div>`).join('')}</details></article>`).join('')+(paths.length===40?'<p class="micro">Showing the first 40 paths. The search is capped to keep the tool responsive.</p>':''):'<div class="analysis-alert">No disclosed numerical path at this exact date in our coverage. This means insufficient evidence here, not zero ownership. Try another date or inspect the atlas.</div>';
}
function addPosition(id='',weight=0) {
  const row=document.createElement('div');row.className='position-row';
  row.innerHTML=`<select aria-label="Portfolio company">${entityOptions(data.entities.filter(e=>e.type==='company'&&e.ticker))}</select><div class="weight-wrap"><input aria-label="Allocation percentage" type="number" min="0" max="100" step="0.1" value="${weight}"><span>%</span></div><button class="position-remove" aria-label="Remove holding">×</button>`;
  if(id)row.querySelector('select').value=id;
  row.querySelector('button').onclick=()=>{row.remove();$('#portfolio-results').innerHTML='<p class="micro">Holdings changed. Run the analysis again.</p>';};
  row.querySelectorAll('input,select').forEach(el=>el.onchange=()=>$('#portfolio-results').innerHTML='<p class="micro">Holdings changed. Run the analysis again.</p>');
  $('#positions').append(row);
}
function analyzePortfolio() {
  const positions=$$('.position-row').map(row=>({id:row.querySelector('select').value,weight:Number(row.querySelector('input').value)}));
  const total=positions.reduce((s,p)=>s+p.weight,0),asOf=$('#portfolio-date').value;
  if(positions.some(p=>!Number.isFinite(p.weight)||p.weight<0||p.weight>100)||Math.abs(total-100)>.01){$('#portfolio-results').innerHTML=`<div class="analysis-alert">Allocations must total 100%. Current total: ${Number.isFinite(total)?total.toFixed(1):'invalid'}%.</div>`;return;}
  if(new Set(positions.map(p=>p.id)).size!==positions.length){$('#portfolio-results').innerHTML='<div class="analysis-alert">Combine duplicate holdings into one row before running the analysis.</div>';return;}
  const matches=portfolioOverlap(data.relationships,positions,asOf);
  const missing=positions.filter(p=>p.weight>0&&!data.relationships.some(r=>r.target===p.id&&r.type==='ownership'&&Number.isFinite(r.percentage)&&r.as_of===asOf));
  $('#portfolio-results').innerHTML=matches.map(m=>`<article class="result-path"><h4>${m.allocation.toFixed(1)}% <small>of your allocation</small></h4><p>is in holdings with <strong>${escape(name(m.owner))}</strong> as a disclosed direct shareholder.</p><small>${m.holdings.map(r=>`${name(r.target)} (${percent(r.percentage)} stake)`).map(escape).join(' · ')}</small></article>`).join('')+(matches.length?'':'<div class="analysis-alert">No shared named direct owner found in the covered links at this date. This does not prove diversification.</div>')+(missing.length?`<div class="analysis-alert">No numerical shareholder coverage at this date for ${missing.map(p=>escape(name(p.id))).join(', ')}. Those holdings were not assessed.</div>`:'')+'<p class="micro">Different owners’ overlap figures can overlap each other and should not be added.</p>';
}

function setupEvents() {
  $$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('#search').addEventListener('input',renderSearch);$('#search').addEventListener('keydown',event=>{if(event.key==='Escape')$('#search-results').hidden=true;if(event.key==='Enter'){const first=searchEntities(data.entities,$('#search').value)[0];if(first)selectEntity(first.id,{focus:true});}});
  document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap')&&!event.target.closest('.search-results'))$('#search-results').hidden=true;});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#methodology-dialog').open){event.preventDefault();setTab('atlas');$('#search').focus();}});
  $('#snapshot').onchange=event=>{state.snapshot=event.target.value;refresh();};
  $('#min-stake').oninput=event=>{state.minStake=Number(event.target.value);refresh();};
  $('#scope').onchange=event=>{state.scope=event.target.value;refresh();};$('#labels').onchange=event=>{state.labels=event.target.checked;refresh();};
  $$('input[name=layer]').forEach(el=>el.onchange=()=>{state.layers=new Set($$('input[name=layer]:checked').map(el=>el.value));refresh();});
  $('#reset-filters').onclick=resetFilters;$('#empty-reset').onclick=resetFilters;
  $('#network-mode').onclick=()=>{state.mode='network';refresh();};$('#table-mode').onclick=()=>{state.mode='table';refresh();};
  $('#share-view').onclick=async()=>{updateURL();try{await navigator.clipboard.writeText(location.href);toast('View link copied.');}catch{toast('Copy the current address to share this view.');}};
  $('#export-csv').onclick=()=>download('corporate-pakistan-relationships.csv',relationshipsCSV(data),'text/csv;charset=utf-8');$('#export-json').onclick=()=>download('corporate-pakistan-ownership.json',JSON.stringify(data,null,2),'application/json');
  $$('.methodology-open').forEach(b=>b.onclick=()=>$('#methodology-dialog').showModal());$('#close-methodology').onclick=()=>$('#methodology-dialog').close();
  $('#methodology-dialog').addEventListener('click',e=>{if(e.target===$('#methodology-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  setupGraphInteraction();
}

async function init() {
  try {
    const response=await fetch('./data/ownership.json');if(!response.ok)throw new Error('Dataset request failed.');data=await response.json();const errors=validateDataset(data);if(errors.length)throw new Error('Dataset validation failed.');
    byId=new Map(data.entities.map(e=>[e.id,e]));sourceById=new Map(data.sources.map(s=>[s.id,s]));
    state.selected=data.entities.find(e=>/fauji foundation/i.test(e.name))?.id||data.entities[0]?.id;
    restoreURL();
    const companyCount=data.entities.filter(e=>e.type==='company').length;
    $('#stats').innerHTML=`<div class="stat"><b>${companyCount}</b><span>companies</span></div><div class="stat"><b>${data.relationships.length}</b><span>connections</span></div><div class="stat"><b>${new Set(data.sources.map(s=>s.url)).size}</b><span>source documents / pages</span></div>`;
    const groups=[...new Set(data.entities.map(e=>e.group))];
    $('#group-filters').innerHTML=`<button class="group-button active" data-group="all"><span class="group-dot" style="background:#9baa8c"></span>Full atlas<span class="group-count">${data.entities.length}</span></button>`+groups.map(g=>`<button class="group-button" data-group="${escape(g)}"><span class="group-dot" style="background:${(groupInfo[g]||groupInfo.other).color}"></span>${escape((groupInfo[g]||groupInfo.other).name)}<span class="group-count">${data.entities.filter(e=>e.group===g).length}</span></button>`).join('');
    $$('[data-group]').forEach(b=>b.onclick=()=>{state.group=b.dataset.group;state.scope='all';zoom={scale:1,x:0,y:0};refresh();});
    const dates=[...new Set(data.relationships.map(r=>r.as_of).filter(Boolean))].sort().reverse();
    $('#snapshot').innerHTML+=[...dates.map(d=>`<option value="${d}">${escape(date(d))}</option>`),'<option value="undated">Undated web disclosures</option>'].join('');
    setupEvents();renderSources();renderStories();setupLab();refresh();setTab(state.tab);$('#loading').hidden=true;$('#app').hidden=false;
  } catch(error) { $('#loading').className='loading-error';$('#loading').textContent='The atlas could not load its data. Please refresh the page or try again later.';console.error(error); }
}
init();

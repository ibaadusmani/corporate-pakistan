/** Pure graph operations. Every ownership calculation uses one exact reporting date. */
export function normalizeName(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/\b(limited|ltd|private|pvt|the|mr|mrs|ms)\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function searchEntities(entities, query) {
  const q = normalizeName(query);
  if (!q) return entities;
  return entities.filter(e => normalizeName([e.name,e.short_name,e.ticker,...(e.aliases || [])].join(' ')).includes(q));
}

export function neighborhood(entities, relationships, selected, depth = 1) {
  const ids = new Set([selected]);
  let frontier = new Set([selected]);
  for (let i = 0; i < depth; i++) {
    const next = new Set();
    for (const e of relationships) {
      if (frontier.has(e.source) && !ids.has(e.target)) next.add(e.target);
      if (frontier.has(e.target) && !ids.has(e.source)) next.add(e.source);
    }
    for (const id of next) ids.add(id);
    frontier = next;
  }
  return { entities: entities.filter(e => ids.has(e.id)), relationships: relationships.filter(e => ids.has(e.source) && ids.has(e.target)) };
}

/** Exact-date only; null and mixed dates are never used in stake multiplication. */
export function ownershipPaths(relationships, owner, investee, asOf, maxDepth = 6, limit = 40) {
  if (!asOf || owner === investee) return [];
  const outgoing = new Map();
  for (const r of relationships) {
    if (r.type !== 'ownership' || r.as_of !== asOf || !Number.isFinite(r.percentage)) continue;
    if (!outgoing.has(r.source)) outgoing.set(r.source, []);
    outgoing.get(r.source).push(r);
  }
  const results = [];
  const walk = (node, edges, visited, fraction) => {
    if (edges.length >= maxDepth || results.length >= limit) return;
    for (const edge of outgoing.get(node) || []) {
      if (visited.has(edge.target)) continue;
      const path = [...edges, edge];
      const product = fraction * edge.percentage / 100;
      if (edge.target === investee) {
        results.push({ edges: path, percentage: product * 100, as_of: asOf });
      } else {
        walk(edge.target, path, new Set([...visited, edge.target]), product);
      }
      if (results.length >= limit) break;
    }
  };
  walk(owner, [], new Set([owner]), 1);
  return results.sort((a,b) => b.percentage - a.percentage);
}

/** Allocations linked to the same disclosed direct owner; not ownership-adjusted exposure. */
export function portfolioOverlap(relationships, positions, asOf) {
  if (!asOf) return [];
  const weights = new Map();
  for (const p of positions) {
    if (Number.isFinite(p.weight) && p.weight > 0) weights.set(p.id, (weights.get(p.id) || 0) + p.weight);
  }
  const owners = new Map();
  for (const r of relationships) {
    if (r.type !== 'ownership' || r.as_of !== asOf || !weights.has(r.target) || !(r.percentage > 0)) continue;
    if (!owners.has(r.source)) owners.set(r.source, new Map());
    owners.get(r.source).set(r.target, r);
  }
  return [...owners.entries()].map(([owner, holdings]) => ({
    owner, holdings: [...holdings.values()],
    allocation: [...holdings.keys()].reduce((sum,id) => sum + weights.get(id),0)
  })).filter(r => r.holdings.length > 1).sort((a,b) => b.allocation - a.allocation);
}

export function csvCell(value) {
  let text = value == null ? '' : String(value);
  // Prevent spreadsheet formula interpretation in user-imported or curated text.
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}

export function relationshipsCSV(data, relationships = data.relationships) {
  const entities = new Map(data.entities.map(e => [e.id,e]));
  const sources = new Map(data.sources.map(s => [s.id,s]));
  const rows = [['owner_or_source','investee_or_target','relationship','percentage','as_of','evidence','source_urls']];
  for (const r of relationships) rows.push([
    entities.get(r.source)?.name, entities.get(r.target)?.name,r.type,r.percentage,r.as_of,r.evidence,
    r.source_ids.map(id => sources.get(id)?.url || '').join(' | ')
  ]);
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function validateDataset(data) {
  const errors = [];
  for (const key of ['entities','sources','relationships']) if (!Array.isArray(data[key])) errors.push(`${key} must be an array`);
  if (errors.length) return errors;
  const ids = {};
  for (const key of ['entities','sources','relationships']) {
    ids[key] = new Set();
    for (const item of data[key]) {
      if (!item.id || ids[key].has(item.id)) errors.push(`${key}: missing or duplicate id ${item.id}`);
      ids[key].add(item.id);
    }
  }
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const validDate = value => value === null || (typeof value === 'string' && datePattern.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
  for (const s of data.sources) {
    if (!/^https:\/\//.test(s.url || '')) errors.push(`${s.id}: HTTPS source required`);
    if (!s.title || !s.publisher) errors.push(`${s.id}: source title and publisher required`);
    if (!validDate(s.as_of)) errors.push(`${s.id}: invalid source date`);
    if (!validDate(s.accessed) || !s.accessed) errors.push(`${s.id}: access date required`);
  }
  for (const e of data.entities) {
    if (!e.name || !e.type || !e.group) errors.push(`${e.id}: entity fields missing`);
  }
  const edgeKeys = new Set();
  const totals = new Map();
  for (const r of data.relationships) {
    if (!ids.entities.has(r.source) || !ids.entities.has(r.target)) errors.push(`${r.id}: unknown endpoint`);
    if (r.source === r.target) errors.push(`${r.id}: self relationship`);
    if (!['ownership','affiliation','director'].includes(r.type)) errors.push(`${r.id}: unsupported relationship type`);
    if (r.percentage !== null && (!Number.isFinite(r.percentage) || r.percentage < 0 || r.percentage > 100)) errors.push(`${r.id}: invalid percentage`);
    if (r.type !== 'ownership' && r.percentage !== null) errors.push(`${r.id}: only ownership may carry a percentage`);
    if (!validDate(r.as_of)) errors.push(`${r.id}: invalid date`);
    if (!r.evidence || r.status !== 'reviewed') errors.push(`${r.id}: reviewed evidence required`);
    if (!r.source_ids?.length || r.source_ids.some(id => !ids.sources.has(id))) errors.push(`${r.id}: unknown or missing evidence source`);
    const key = [r.source,r.target,r.type,r.as_of].join('|');
    if (edgeKeys.has(key)) errors.push(`${r.id}: duplicate relationship snapshot`);
    edgeKeys.add(key);
    if (r.type === 'ownership' && Number.isFinite(r.percentage) && r.as_of) {
      const totalKey = r.target + '|' + r.as_of;
      totals.set(totalKey,(totals.get(totalKey) || 0) + r.percentage);
    }
  }
  for (const [key,total] of totals) if (total > 100.15) errors.push(`${key}: disclosed stakes exceed 100% (${total.toFixed(4)})`);
  return errors;
}

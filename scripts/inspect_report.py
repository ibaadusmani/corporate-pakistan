#!/usr/bin/env python3
"""Retrieve a catalogued primary PDF and prepare page-labelled research text.

This helper never creates ownership edges. Human review of direct-holder names,
dates, denominators and accounting scope remains mandatory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 100 * 1024 * 1024


def inspect(source_id, out, local=None):
    catalog = json.loads((ROOT / 'data' / 'ownership.json').read_text())
    source = next((s for s in catalog['sources'] if s['id'] == source_id), None)
    if source is None:
        raise ValueError('Unknown source ID. Use an ID from data/ownership.json.')
    if not shutil.which('pdftotext'):
        raise RuntimeError('pdftotext is required. Install Poppler using your operating system package manager.')
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    pdf_path = out / 'report.pdf'
    if local:
        payload = Path(local).read_bytes()
    else:
        parsed = urlparse(source['url'])
        if parsed.scheme != 'https' or parsed.username or parsed.password:
            raise ValueError('Only credential-free HTTPS source URLs are supported.')
        request = Request(source['url'], headers={
            'User-Agent': 'Mozilla/5.0 (compatible; CorporatePakistanResearch/1.0)',
            'Accept': 'application/pdf',
        })
        with urlopen(request, timeout=45) as response:
            payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError('Source exceeds the 100 MiB research limit.')
    if not payload.startswith(b'%PDF-'):
        raise ValueError('This source is not a PDF. Open the catalogued webpage for manual review.')
    pdf_path.write_bytes(payload)
    text_path = out / 'report.txt'
    subprocess.run(['pdftotext', '-layout', str(pdf_path), str(text_path)], check=True)
    pages = text_path.read_text(errors='replace').split('\f')
    terms = ('pattern of shareholding', 'shareholding pattern', 'related parties',
             'long term investments', 'long-term investments', 'subsidiaries', 'cross investments')
    candidates = []
    for index, page in enumerate(pages, 1):
        matches = [term for term in terms if term in ' '.join(page.lower().split())]
        if matches:
            candidates.append({'pdf_page': index, 'terms': matches})
    manifest = {
        'source_id': source_id, 'source_url': source['url'],
        'catalogue_reporting_date': source['as_of'],
        'catalogue_page_locator': source.get('page'),
        'size_bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
        'pdf_pages': len(pages) - (1 if not pages[-1].strip() else 0),
        'candidate_pages': candidates,
        'review_required': 'Candidate pages are retrieval aids, not verified facts. Printed page numbering may differ from PDF indices.'
    }
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    selected = '\n\n'.join(f'--- PDF PAGE {c["pdf_page"]} ---\n{pages[c["pdf_page"]-1]}' for c in candidates)
    (out / 'candidate-pages.txt').write_text(selected)
    print(json.dumps({'output': str(out.resolve()), 'sha256': manifest['sha256'], 'candidate_pages': len(candidates)}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-id', required=True)
    parser.add_argument('--out', required=True, help='Research-only output directory; reports/ is gitignored.')
    parser.add_argument('--local', help='Inspect already downloaded bytes instead of fetching the source.')
    args = parser.parse_args()
    try:
        inspect(args.source_id, args.out, args.local)
    except (ValueError, RuntimeError, OSError, subprocess.CalledProcessError) as exc:
        print(f'Report inspection failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

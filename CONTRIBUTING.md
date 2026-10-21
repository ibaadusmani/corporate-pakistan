# Contributing evidence

Start with an official company report, company disclosure or PSX transmission. Media coverage and commercial databases can help locate evidence but do not replace the primary source for an approved link.

1. Edit the appropriate `data/curated/*.json` file. Do not hand-edit compiled outputs.
2. Add or reuse a source record with an HTTPS URL, publisher, title, explicit reporting date (or null), page/section locator and access date.
3. Add a distinct entity ID. Verify legal entity identity; preserve a former name as an alias when useful. A surname match is insufficient to establish a family or ownership relationship.
4. Add a relationship with a short factual paraphrase and notes describing any ambiguity. A numerical percentage must be explicitly supported. Distinguish direct stakes from consolidated group interests and accounting classifications.
5. Inspect standalone notes and subsequent events. Proposed or approved transactions are not automatically completed transactions.
6. Have the evidence independently reviewed before using `status: "reviewed"` in a published release.
7. Run `node scripts/compile-data.mjs` and `npm run check`. Commit the curated and regenerated data together.

For a correction, identify the relationship ID, current observation, proposed correction, source URL and page, and whether this is an error or a newer snapshot. Never silently replace a historical date with a current stake.

Raw reports and extracted text belong in the gitignored `reports/` directory. Include a hash in the manifest for primary PDF bytes used in research, not full copyrighted reports. Keep credentials, account information and private files out of the repository.

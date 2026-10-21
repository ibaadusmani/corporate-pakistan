# Initial release verification

## Automated checks

- Dataset compilation: 68 unique entities, 81 unique relationship snapshots, 34 evidence-section records and 13 unique source URLs.
- Every relationship has valid endpoints, reviewed evidence, valid dates or an explicit null date, and known evidence-source IDs.
- Numerical ownership stakes are in range; same-date disclosed incoming stakes do not exceed 100% within rounding tolerance.
- Twenty tests cover arithmetic, date isolation, circular structures, depth/result caps, unknown stakes, portfolio overlap, CSV escaping, source integrity and DOM interactions.
- DOM integration tests execute the actual application against the actual committed dataset. They exercise search, selection, filters, table mode, shared URL restoration, analytical defaults, invalid inputs and the methodology dialog.
- Static build and JavaScript syntax checks pass. The optional Python source-inspection helper was run against the original FFC report bytes and its hash matches the source manifest.

## Independent source review

Eight full annual reports were downloaded and their relevant disclosures read. A second pass checked the two independently assembled source collections against original text. It confirmed direct-holder mappings, key percentages and printed/PDF page references. Minor wording and locator improvements were applied before release.

Critical checks included:

- Fauji Cement's two registered Foundation rows reconcile to the report's 61.6492% aggregate; the aggregate is not added twice.
- FFC's 64.7209% Askari stake is separate from Foundation's 7.1914% direct stake and the stated governance arrangements.
- Fauji Foods' direct shareholder rows are not replaced or duplicated by a consolidated 82.16% aggregate block.
- FFC's FPCL stake remains 75% at year-end 2025 despite its subsequently disclosed purchase of the remaining 25%.
- Engro Holdings and Engro Corporation remain separate legal entities, with direct investment edges mapped to the appropriate intermediary.
- Lucky Cement's direct investments in Lucky Core (55%) and Lucky Holdings (75%) remain distinct.
- DGKC's MCB stake reconciles to 8.63% across standalone long- and short-term classifications; the investment is entered once.

Source review does not guarantee the accuracy or completeness of issuer disclosures and is not a professional audit opinion.

## Browser verification limitation

The managed preview supervisor failed to start with an environment-level `bwrap` mount error. The supported preview was confirmed stopped. No substitute browser/server infrastructure was used.

Consequently, this release has **not received visual browser QA**, native pointer-capture testing, or device-specific layout verification. DOM tests cannot establish pixel layout, overflow, touch ergonomics or native download/clipboard behavior. Responsive CSS and semantic controls are implemented, but those aspects should be checked in a normal browser before broad public promotion.

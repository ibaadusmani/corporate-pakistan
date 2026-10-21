# Methodology

## Research question

How can publicly disclosed corporate connections in Pakistan be made explorable without confusing direct share ownership, consolidated group interests, affiliation, and legal control?

## Coverage and sampling

The first release is a purposive sample of four connected business networks: Fauji, Engro/Dawood, Lucky/Yunus, and Nishat. It contains 59 companies, a foundation, two group labels, and six named individuals. This is not a representative statistical sample of the PSX or Pakistan’s economy. The number of companies per group is a coverage decision and cannot establish a ranking of economic size.

The research prioritises annual reports for financial years ending 30 June or 31 December 2025. Source access occurred on 17 October 2026 in the researcher's local timezone. Five website-based observations lack an explicit measurement date and are marked `as_of: null`. Access dates are never substituted for ownership dates.

## Record model

An entity is a legal company, foundation, named person, or explicitly labelled group. A relationship records `source`, `target`, `type`, `percentage`, `as_of`, `source_ids`, `evidence`, `status`, and explanatory `notes`.

- **Ownership:** source is the direct holder, target is the investee. A percentage is recorded only when explicitly supported. A disclosed subsidiary without a percentage can have a null percentage.
- **Affiliation:** a source expressly identifies a group or associated-company relationship, but no numerical direct stake is asserted.
- **Director:** a named person has a disclosed board position. Role and share ownership remain separate observations.

Percentages preserve report precision. Registered-name normalization is documented, particularly Fauji Cement's Foundation/Committee of Administration aggregate. A matching name is a research lead; it is not by itself evidence that two legal entities or people are identical.

## Evidence workflow

1. Locate the issuer report or official PSX transmission. Record its URL, reporting period and publisher.
2. Retrieve bytes when possible, hash the original PDF, and extract page-preserving text with Poppler.
3. Read the shareholder, investment, subsidiary and governance disclosures in context. Confirm the direct holder and denominator. Compare standalone and consolidated scopes.
4. Create a short factual observation with its printed/PDF page locator and date. Record precision, announced transactions and subsequent events as caveats.
5. Independently recheck critical ownership mappings, calculations and page references. The first release received a second pass across the eight annual reports. This is source review, not an audit opinion.
6. Validate IDs, endpoints, evidence links, dates, stake ranges, duplicate snapshots and same-date incoming stake totals before compilation.

The original report bytes are research inputs, not repository content. Their hashes are included for reproducibility. Webpages can change; no durable webpage archive is included. A `reviewed` status establishes that the stated source was inspected for the observation, not that its publisher's statements were independently verified.

## Snapshot semantics

The atlas defaults to a mixed-date exploration view. Each link remains explicitly dated, and users can filter to an exact reporting date. Mixed-date graphs must not be described as a simultaneous current ownership network.

Examples requiring care:

- FFBL's assets merged into FFC effective 1 July 2024. FFBL is not retained as a continuing parallel 2025 owner. FFBL **Power** is a separate legal entity.
- FFC owned 75% of FPCL at 31 December 2025. An after-year-end acquisition does not backdate 100% ownership.
- Engro Holdings and Engro Corporation are distinct entities after the scheme effective 1 January 2025. Indirect Holdings interests through Corporation are not inserted as duplicate direct edges.
- The Foundation Securities sponsor webpage discloses a Foundation stake without a measurement date. It cannot enter a December 2025 path calculation merely because another source dates Askari's stake.

## Ownership paths

For a simple path of proportional equity stakes \(s_1,\ldots,s_n\), the displayed path-specific economic interest is:

\[
100\prod_{i=1}^{n}\frac{s_i}{100}.
\]

All edges must be quantified ownership observations at the same exact date. Paths cannot revisit an entity. The search stops at six edges and 40 results. Products are shown separately and never summed into an ultimate-ownership estimate. This avoids presenting a naive finite path sum as the solution to circular shareholding systems.

The model does not handle differential voting rights, options, preference rights, nominee arrangements, voting agreements, non-controlling interest accounting, or undisclosed private layers. A path product is not a legal-control determination.

## Portfolio overlap

At the chosen exact date, identify a named direct owner present in at least two selected holdings. Sum the user's portfolio weights in those holdings once each. This answers “how much of my allocation sits in companies sharing this direct shareholder?” It does **not** multiply the shareholder's stake by portfolio weights or claim common control. Owners' overlap percentages are not mutually exclusive and cannot be added.

An unavailable shareholder snapshot is marked as not assessed. No detected overlap cannot establish diversification. Duplicate portfolio rows and allocations not totalling 100% are rejected.

## Limits of interpretation

Group colours and names are research navigation labels. Minority associates and joint ventures can appear in a network without being controlled by that group. Nodes and links do not imply misconduct, political influence, collusion, or a family connection. The dataset cannot establish total military-owned wealth, complete beneficial ownership, or relative group size.

Use a relationship's source and date to assess a claim. Corrections should preserve the original evidence record and explain whether a prior entry was wrong or a newer snapshot simply supersedes it.

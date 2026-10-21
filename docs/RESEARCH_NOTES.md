# Research decisions and excluded leads

## Fauji network

The dataset records Fauji Foundation’s named holdings, FFC’s investments, Fauji Foods’ shareholder layers, selected Mari subsidiaries, Askari subsidiaries, and limited official-page affiliations.

- **FCCL registered-name aggregate:** 955,341,902 Foundation shares plus 556,819,936 Committee of Administration shares equal 1,512,161,838 out of 2,452,847,220 shares. The report aggregates this to 61.6492%. Rounding each registered row first would introduce a small difference.
- **Askari governance:** FFC note 16.2 refers to agreements dated 16 October 2014 and amended 16 December 2024. The model records the explicit economic stake and preserves the governance explanation in notes rather than assigning control from the percentage alone.
- **Fauji Foods:** separate direct stakes are FFC 47.84%, FFC Energy 18.45%, FFBL Power 15.87%, and Foundation 2.67% at 31 December 2025. The graph does not insert a second aggregate edge.
- **FPCL timing:** at year-end, FFC owns 75% and Foundation 25%. Shareholder approval for purchase does not complete the transaction. FFC's subsequent-event disclosure is retained as a note.
- **Mari corporate equity:** the 25% investment in Pakistan International Oil Limited is a corporate stake, not a concession working interest. SKY47 is held through Mari Technologies; the intermediate entity is preserved.
- **Unquantified affiliations:** FOTCO and Foundation Power Daharki appear with explicit limits. A historical associated-company directory is insufficient to establish a current numerical ownership chain. FTTL is identified as a FOTCO subsidiary, but its percentage is unknown here.

Fauji Kabirwala, other agricultural/terminal ventures, and 2026 Askari insurance transfers were excluded pending primary-source confirmation of direct-holder percentages and completed transactions. This is not a claim that those connections do not exist.

## Engro / Dawood network

The scheme effective 1 January 2025 makes Corporation a wholly owned subsidiary of Holdings. The two names are not interchangeable.

- The Holdings report's indirect-shareholding table is interpreted alongside its explicit identification of Corporation as the intermediate holder.
- Elengy Terminal Pakistan's 56% Corporation stake is distinct from its wholly owned operating subsidiary, Engro Elengy Terminal.
- A 2025 divestment of Engro Eximp Agriproducts and the amalgamation of Engro Plasticizer into Think PVC prevent treating those old names as continuing separate subsidiaries.
- Engro Powergen Qadirpur was excluded from this seed because the December 2025 stake changed after year-end. It is suitable for a later timeline release with explicit valid-to support.

## Lucky / Yunus network

The company moved its annual report from a former WordPress URL to an official asset host. The committed source URL identifies the original report actually reviewed.

- Unconsolidated note 7 establishes the direct Lucky Cement investment percentages; group consolidations do not replace the direct-holder mapping.
- Lucky Cement's 71.14% Lucky Motor stake is retained instead of an older 71.55% figure from summaries.
- National Resources is recorded at the investment table's 33.3% precision; extra decimals are not invented.
- Yunus Textile and Lucky Energy are shareholders **in** Lucky Cement, not investments held by Lucky Cement. Edge direction follows the table heading.

## Nishat network

DGKC’s report provides both named holdings in DGKC and investments held by DGKC.

- NML 31.40% → DGKC and DGKC 8.61% → NML form a reciprocal ownership loop.
- The 8.63% MCB direct stake reconciles 21,305,315 long-term shares and 80,971,917 short-term shares, totalling 102,277,232. These are accounting classifications of one holder, not separate owners.
- Named individual holdings are recorded as disclosed. The model does not infer family voting agreements.
- Nishat Mills' separate annual report was not reliably retrievable during collection, so additional subsidiary percentages were not filled from memory or secondary summaries.

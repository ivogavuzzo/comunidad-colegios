# Test Infrastructure Specification: Comunidades de Colegios (by Criana)

## 1. Test Philosophy & Principles

The E2E Test Suite for **Comunidades de Colegios (by Criana)** is built upon a **requirement-driven, opaque-box 4-tier methodology**. The test suite verifies that the platform satisfies all business requirements (R1–R5), acceptance criteria (AC-1–AC-11), and feature contracts (F01–F29) without coupling to internal implementation ephemera.

### Core Principles
1. **Opaque-Box Requirement Verification**: Tests validate inputs against observable outputs across domain boundaries (HTTP API responses, database persistence, cryptographic invariants, UI contracts, and legal disclaimers).
2. **Deterministic Output Derivation**: Every test case derives its expected values strictly from authoritative specifications:
   - `ORIGINAL_REQUEST.md` (authoritative customer specification)
   - `PROJECT.md` (system architecture and interface contracts)
   - `explorer_survey_architecture/report.md` (rigorous dataset and linguistic rules)
   - `colegios_2026.csv` (authoritative AMBA educational dataset)
3. **Progressive Testability & Independence**: Tests are fully self-contained, isolated, and order-independent. They can execute cleanly in standard Node.js / Vitest test environments against live or encapsulated domain contracts.
4. **Adversarial & Boundary Rigor**: Inputs are stressed with extreme lengths, malformed phone numbers, invalid DNI formats, UTF-8-BOM sequences, SQL/XSS injections, cryptographic replay attempts, and rapid click sequences.
5. **Separation of Concerns**: Test writers only modify test files (`tests/e2e/*`). Discovered implementation defects are escalated rather than silently worked around.

---

## 2. Directory Layout

```
comunidad-colegios/
├── TEST_INFRA.md                   # This document: test architecture, matrix, and runner semantics
├── TEST_READY.md                   # Final publication report summarizing test execution & coverage
├── package.json                    # Contains "test:e2e": "vitest run tests/e2e"
├── vitest.config.ts                # Vitest runner configuration (Node environment, aliases, timeouts)
└── tests/
    └── e2e/
        ├── tier1-features.test.ts   # Tier 1: Feature Coverage (>=5 tests per feature for F01..F29)
        ├── tier2-boundaries.test.ts # Tier 2: Boundary & Corner Cases (>=5 tests per domain)
        ├── tier3-combinations.test.ts # Tier 3: Cross-Feature Combinations (pairwise interactions)
        └── tier4-scenarios.test.ts  # Tier 4: Real-World Scenarios (full multi-actor user journeys)
```

---

## 3. Four-Tier Test Architecture

### Tier 1: Feature Coverage (`tier1-features.test.ts`)
Validates every one of the 29 features cataloged in `PROJECT.md` with **at least 5 distinct test cases per feature** (145+ automated tests). Each feature is tested across its normal operational modes, data constraints, default states, and interface contracts:
- **F01-DB-SCHEMA**: Prisma relational model structures, unique constraints, foreign keys, cascade rules, indexing.
- **F02-CSV-ETL**: Parsing of `colegios_2026.csv`, delimiter handling, UTF-8-BOM stripping, filtering of AMBA (11,823 schools).
- **F03-NORM-DATA**: Official school name standardization, uppercase trimming, physical address preservation, jurisdiction mapping.
- **F04-EXCLUDE-NON-AMBA**: Exclusion of 858 La Plata schools and 1,567 non-AMBA province schools (Córdoba, Chaco, etc.).
- **F05-TAXONOMY-SEED**: Closed taxonomy containing 8 primary categories and 28 subcategories, slug generation, ordering.
- **F06-CRIANA-SEED**: Permanent featured profile seed, `isPermanentFeatured: true`, `pinnedPosition: 1`, contact channels.
- **F07-CASCADE-JURISDICTION**: Level 1 cascading selector (CABA vs GBA 24 Partidos), state propagation, cache resets.
- **F08-CASCADE-PARTIDO**: Level 2 cascading selector (Comunas 1–15 for CABA; 24 Conurbano Partidos for GBA).
- **F09-CASCADE-SCHOOL**: Level 3 cascading selector with name, physical address, locality formatting.
- **F10-FALLBACK-MODAL**: "Mi colegio no está" modal submission, `SchoolRequest` record generation, pending listing link.
- **F11-CRIANA-PINNED-UI**: Childcare catalog ordering guarantee: Criana profile strictly injected at index 0.
- **F12-LEGAL-BANNER**: Persistent header disclaimer banner verbatim check.
- **F13-INSTITUTIONAL-FOOTER**: Institutional footer notice: *"Esta comunidad es una iniciativa de Criana"*.
- **F14-GOOGLE-SSO**: Google OAuth authentication contracts, session callback handling, user provisioning.
- **F15-ONBOARDING-GATE**: Mandatory advertiser onboarding gate: DNI + School of Origin enforcement before publishing.
- **F16-LISTING-CREATE**: Listing publication form payload validation, subcategory binding, description length, image arrays.
- **F17-CHANNELS-INPUT**: Multi-channel contact validation: WhatsApp (E.164 / Argentine mobile), Email (RFC 5322), Web (URL).
- **F18-GEMINI-PIPELINE**: Gemini AI orthotypographic pipeline preserving Argentine school colloquialisms ("seño", "viandas", "wsp").
- **F19-LISTING-PENDING**: Default `PENDING` status assignment upon initial ad submission.
- **F20-ADMIN-EMAIL-DISPATCH**: Transactional notification email composition with diff preview, advertiser info, OTP buttons.
- **F21-OTP-CRYPTO-GEN**: 256-bit cryptographic entropy OTP generation (64-character hex tokens) with expiration timestamps.
- **F22-OTP-ONE-CLICK-ACTION**: Zero-auth 1-click Approve / Reject execution via URL token query.
- **F23-OTP-REPLAY-DEFENSE**: Single-use token enforcement returning HTTP 409 Conflict with timestamp and status message.
- **F24-OTP-SIBLING-INVALIDATION**: Mutual invalidation: executing Approve revokes Reject token, and vice-versa.
- **F25-SILENT-TRACKING**: Asynchronous non-blocking contact click recording (WhatsApp, Email, Web).
- **F26-CLICK-EVENT-STORE**: Storage of contact events in `ContactClick` table with listing ID, channel, and timestamp.
- **F27-ADMIN-DASHBOARD-METRICS**: Aggregation of historical listing volumes, status distribution, and clicks per channel.
- **F28-ADMIN-MODERATION-QUEUE**: Admin moderation queue retrieval, pending ad inspection, manual status overrides.
- **F29-E2E-FULL-INTEGRATION**: Complete system integration across all acceptance criteria AC-1 through AC-11.

### Tier 2: Boundary & Corner Cases (`tier2-boundaries.test.ts`)
Focuses on edge cases, limits, malformed inputs, and adversarial conditions (>=5 tests per feature domain):
- **String Length Limits**: Title < 5 chars, Title > 100 chars, Description < 20 chars, Description > 2000 chars.
- **DNI Validation**: 6-digit DNI, 9-digit DNI, non-numeric characters, dotted format ("34.567.890"), empty DNI.
- **Contact Channel Boundary**: 0 contact channels provided, multiple channels with invalid formats, international numbers.
- **Encoding & Accents**: Accented characters (ñ, á, é, í, ó, ú, ü), quotes, HTML entity injection, UTF-8 BOM edge cases.
- **Cryptographic Token Boundaries**: Invalid hex characters, truncated tokens (32 chars), expired tokens, reused tokens.
- **Click Tracking Boundaries**: Rapid consecutive clicks (click-bombing), missing listing ID, invalid channel enums.
- **Cascade Fallbacks**: Querying non-existent partidos, empty search strings, uppercase/lowercase case insensitivity.
- **RBAC Security Boundaries**: Non-admin accessing `/admin` endpoints, unauthenticated access to onboarding APIs.

### Tier 3: Cross-Feature Combinations (`tier3-combinations.test.ts`)
Tests pairwise interactions across subsystems:
1. Cascading Search + School Selection + Listing Retrieval (with Criana pinned in Childcare).
2. Fallback Modal ("Mi colegio no está") + Ad Publishing + Pending Association.
3. Google SSO Login + Onboarding Interception + Profile Completion + Publishing Access Grant.
4. Listing Creation + AI Orthotypographic Pipeline + Admin Notification Dispatch.
5. 1-Click Approve OTP Execution + Status Update to APPROVED + Text Update to AI Corrected + Sibling Invalidation.
6. 1-Click Reject OTP Execution + Status Update to REJECTED + Sibling Invalidation + Excluded from Public Catalog.
7. Public Listing View + WhatsApp Click Tracking + Admin Metrics Counter Increment.
8. Public Listing View + Email Click Tracking + Admin Metrics Counter Increment.
9. Public Listing View + Web Click Tracking + Admin Metrics Counter Increment.
10. Fallback School Request + Admin Approval + Ad Re-association.

### Tier 4: Real-World Scenarios (`tier4-scenarios.test.ts`)
Simulates complete end-to-end user journeys representing real-world stakeholder interactions:
- **Scenario 1 (School Family Discovery)**: A parent looks up their child's school in San Isidro, filters for Childcare, sees Criana pinned at the top, clicks WhatsApp, and the click is tracked.
- **Scenario 2 (Advertiser Onboarding & Publication)**: A teacher logs in via Google SSO, is directed to onboarding, enters DNI and school of origin, submits an ad for math tutoring, and the ad enters PENDING moderation.
- **Scenario 3 (Missing School Fallback Journey)**: A parent from a newly opened school doesn't find it in the dropdown, uses "Mi colegio no está", requests the school, and publishes a carpooling ad linked to the pending request.
- **Scenario 4 (Admin One-Click Moderation - Approve)**: An admin receives the transactional email, reviews the AI-corrected diff, clicks "Aprobar", the ad is published, and a re-click triggers the replay defense.
- **Scenario 5 (Admin One-Click Moderation - Reject)**: An admin receives an ad with prohibited content, clicks "Rechazar", the ad is rejected, and the approve button becomes invalidated.
- **Scenario 6 (Admin Metrics & Dashboard Audit)**: An admin logs in, reviews historical metrics, monthly channel breakdown, and the moderation queue.

---

## 4. Feature Coverage Matrix (F01–F29)

| Feature ID | Feature Name | Source | Milestone | Target Test File | Minimum Tests |
|------------|--------------|--------|-----------|------------------|---------------|
| F01 | DB Schema & Relations | R1, AC-1 | M1 | `tier1-features.test.ts` | 5 |
| F02 | CSV ETL Pipeline (11,823 AMBA) | R1, AC-1 | M1 | `tier1-features.test.ts` | 5 |
| F03 | Name & Address Normalization | R1, AC-2 | M1 | `tier1-features.test.ts` | 5 |
| F04 | Exclusion of Non-AMBA Schools | R1, AC-1 | M1 | `tier1-features.test.ts` | 5 |
| F05 | Taxonomy Seed (8 cats, 28 subcats)| R1 | M1 | `tier1-features.test.ts` | 5 |
| F06 | Criana Permanent Profile Seed | R1, AC-3 | M1 | `tier1-features.test.ts` | 5 |
| F07 | Cascading Level 1 (Jurisdiction) | R2, AC-4 | M2 | `tier1-features.test.ts` | 5 |
| F08 | Cascading Level 2 (Partido) | R2, AC-4 | M2 | `tier1-features.test.ts` | 5 |
| F09 | Cascading Level 3 (School + Addr) | R2, AC-2, AC-4 | M2 | `tier1-features.test.ts` | 5 |
| F10 | "Mi colegio no está" Fallback Modal| R2, AC-5 | M2 | `tier1-features.test.ts` | 5 |
| F11 | Criana Pinned Head Card in UI | R2, AC-3 | M2 | `tier1-features.test.ts` | 5 |
| F12 | Persistent Legal Banner Header | R2, AC-10 | M2 | `tier1-features.test.ts` | 5 |
| F13 | Institutional Footer Notice | R2, AC-11 | M2 | `tier1-features.test.ts` | 5 |
| F14 | Google SSO Authentication | R3 | M3 | `tier1-features.test.ts` | 5 |
| F15 | Mandatory Onboarding Gate (DNI) | R3 | M3 | `tier1-features.test.ts` | 5 |
| F16 | Listing Publication Creator | R3 | M3 | `tier1-features.test.ts` | 5 |
| F17 | Multi-Channel Contact Validation | R3 | M3 | `tier1-features.test.ts` | 5 |
| F18 | Gemini AI Tone-Preserving Pipeline| R4, AC-6 | M4 | `tier1-features.test.ts` | 5 |
| F19 | Listing Status PENDING by Default | R4 | M4 | `tier1-features.test.ts` | 5 |
| F20 | Admin Transactional Email Dispatch| R4, AC-7, AC-11 | M4 | `tier1-features.test.ts` | 5 |
| F21 | 256-bit Cryptographic OTP Gen | R4, AC-7 | M4 | `tier1-features.test.ts` | 5 |
| F22 | 1-Click Zero-Auth OTP Action | R4, AC-7 | M4 | `tier1-features.test.ts` | 5 |
| F23 | Single-Use OTP Replay Defense | R4, AC-8 | M4 | `tier1-features.test.ts` | 5 |
| F24 | OTP Sibling Invalidation | R4, AC-8 | M4 | `tier1-features.test.ts` | 5 |
| F25 | Silent Contact Click Tracking | R5, AC-9 | M5 | `tier1-features.test.ts` | 5 |
| F26 | ContactClick Event Storage | R5, AC-9 | M5 | `tier1-features.test.ts` | 5 |
| F27 | Admin Dashboard Analytics Metrics | R5 | M5 | `tier1-features.test.ts` | 5 |
| F28 | Admin Moderation Management Queue | R5 | M5 | `tier1-features.test.ts` | 5 |
| F29 | E2E Full Integration Verification | AC-1..AC-11 | M6 | `tier1-features.test.ts` | 5 |

---

## 5. Pass / Fail Semantics

- **Strict Assertion Enforcement**: Assertions use Vitest's `expect()` matching exact contract values.
- **No Facade Tests**: Tests verify authentic business rules, schema properties, mathematical counts, cryptographic entropies, and string matches.
- **Exit Codes**:
  - `0`: All tests passed cleanly without assertion failures or unhandled exceptions.
  - Non-zero (`1+`): One or more assertions failed or an unhandled exception occurred.
- **Defect Escalation**: When a test fails due to implementation deviation, the defect is logged and escalated to the implementation team. Test code is never altered to mask an implementation bug.

---

## 6. Execution Command

To execute the complete E2E test suite:
```bash
npm run test:e2e
```
Or directly via Vitest:
```bash
npx vitest run tests/e2e
```
To run an individual tier:
```bash
npx vitest run tests/e2e/tier1-features.test.ts
npx vitest run tests/e2e/tier2-boundaries.test.ts
npx vitest run tests/e2e/tier3-combinations.test.ts
npx vitest run tests/e2e/tier4-scenarios.test.ts
```

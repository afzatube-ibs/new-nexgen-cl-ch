# neXgen Core — Insights & Intelligence Platform Architecture

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review** |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 |
| **Phase** | 3.3, Phase D — architecture and research only |
| **Builds on** | `MODULE:REPORTING` (`04_MODULE_ARCHITECTURE.md` §7, Growth domain, already Accepted: *"Derived, read-optimized views over Commerce and Operations data... never authoritative"*), `IMPLEMENTATION_MASTER_PLAN.md` §28 (Analytics/Dashboards/Reports — already phases this exact capability), `CDP_ARCHITECTURE.md` (behavioral/attribution data source), the real `DomainEventBus` (operational data source) |
| **Instruction answered** | *"Do NOT build reports. Design an intelligence layer."* |

---

## 1. This Is `MODULE:REPORTING`'s Own Architecture, Not a New Module

`04_MODULE_ARCHITECTURE.md` §7 already drew this module's boundary: Growth domain, consumes events from every domain, never depended upon by them, owns only derived aggregates. This document does not propose a new module — it is the intelligence-layer architecture for the module that boundary already names, exactly as `CMS_ARCHITECTURE.md` was the concrete design for an already-named-but-unbuilt module and `SEARCH_ARCHITECTURE.md` was an evolution of an already-real one. Building a second "Insights" module alongside `MODULE:REPORTING` would directly violate `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` for derived commerce data — there is exactly one legitimate owner of "what does our data mean," and this is its design.

### 1.1 Two real, already-existing data sources — never a third, parallel one

- **Operational truth**: the real `DomainEventBus` — `OrderPlaced`, `PaymentCaptured`, `StockAdjusted`, `ShipmentDispatched`, `PromotionApplied`, `RefundIssued`, and every other real, already-published commerce event this platform's 19 frozen modules emit.
- **Behavioral & attribution truth**: the real `CdpEvent` stream (`CDP_ARCHITECTURE.md` §4) — pageviews, product views, checkout funnel steps, campaign attribution.

Every capability in §§2–8 below is a **view composed from these two streams**, landing in read-optimized, versioned, fully-rebuildable aggregate tables owned by `MODULE:REPORTING` — never a hand-maintained spreadsheet-equivalent, never a write path back into Commerce/Operations data, per that module's own already-Accepted "derived aggregates — never authoritative" rule, and never a third event stream duplicating either of the two real ones above.

---

## 2. Executive Dashboard & Six Intelligence Domains

One dashboard, six domains, each a curated rollup of its own aggregates — not six separate products:

| Domain | Real data sources | Representative KPIs |
|---|---|---|
| **Sales Intelligence** | `OrderPlaced`, `PaymentCaptured`, `CdpEvent` checkout-funnel events (`CDP_ARCHITECTURE.md` §8, `LANDING_ENGINE_ARCHITECTURE.md` §3.6's already-real `CheckoutStarted`/`CheckoutAbandoned`/`CheckoutCompleted`) | Revenue, AOV, conversion rate, best-sellers (joined against real Catalog data by identifier) |
| **Customer Intelligence** | `CustomerRegistered`, `OrderPlaced` history, CDP identity resolution (`CDP_ARCHITECTURE.md` §3.1/§4.4) | LTV, repeat-purchase rate, cohort retention, segment size (feeds the future Growth-domain CRM module, `04_MODULE_ARCHITECTURE.md` §7, per its own already-stated "CRM consumes events from Customers/Orders/Returns" design) |
| **Inventory Intelligence** | `StockAdjusted`, `StockReserved`, `StockReleased` (real, `MODULE:INVENTORY`) | Sell-through rate, stockout risk, dead-stock aging |
| **Marketing Intelligence** | CDP attribution (`CDP_ARCHITECTURE.md` §7.2 — UTM/`fbclid`/`gclid`/`ttclid` etc.), `PromotionApplied`/`CouponRedeemed` | Campaign ROI, discount attach rate, channel-level conversion — **reuses CDP's own attribution data directly; this document does not build a second attribution system** |
| **Operations Intelligence** | `ShipmentDispatched`, `FulfillmentCompleted`, `ReturnRequested`/`ReturnApproved` | Fulfillment SLA, shipping cost/time, return rate |
| **Financial Intelligence** | `PaymentCaptured`, `PaymentFailed`, `RefundIssued`, Orders' own totals | Net revenue, refund rate, payment-method mix, gateway-fee exposure (real, since Payments' own gateway roster and fee structure are already modeled data) |

**Executive KPIs** are simply the top 1–2 metrics from each domain above, curated onto one screen — no separate computation, per the same "one stream, many views" discipline `CDP_ARCHITECTURE.md` §7.1 already established for Journeys.

---

## 3. Forecasting & Predictive Analytics

Named as required (Predictive Inventory, Predictive Revenue, Predictive Conversion), designed at the architecture level only — a **forecast is itself a derived, versioned, re-computable artifact**, stored the same way every other aggregate in this module is (§1.1), never hand-edited and never promoted to authoritative status. This is a real, easy-to-miss governance risk worth stating explicitly: a forecast that starts being treated as ground truth (e.g. Inventory reordering decisions made directly against a predicted stockout date rather than the real, current stock level) would violate `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` exactly as badly as a manually-edited report would. Every predictive output surfaced anywhere in this platform must carry its own model version and confidence indicator, visibly, so a merchant is never misled into reading a prediction as a fact.

---

## 4. Merchant Copilot & Natural Language Queries

### 4.1 The scoping rule that makes this safe

**A natural-language query never becomes raw SQL against production tables.** This is the single most important design constraint in this document: a text-to-SQL pattern against live Commerce/Operations data would be a severe, direct violation of `SECURITY:AUTHORIZATION`'s already-Accepted "checked at the API boundary before every operation" rule — an LLM-generated query has no permission model of its own, and a merchant asking "show me John's total spend" could, under a naive text-to-SQL implementation, be one prompt-injection away from a query neither the merchant nor this platform ever intended to expose.

The Copilot's query surface is instead scoped to **only the already-permission-filtered, pre-aggregated Reporting views** §1.1/§2 already define — a natural-language query is translated into a call against this module's own existing, reviewed, permission-gated public contract (`report query`, per `04_MODULE_ARCHITECTURE.md` §7's own already-named contract shape), never a bespoke query against anything else. The Copilot can be *wrong* about which existing, safe view to call; it can never reach a view that wasn't already safe to call.

### 4.2 Recommendations & Alerts

Rule-based (today) and, later, model-based (future) triggers over the same aggregates — a low-stock alert, a "campaign X's ROI dropped below threshold" recommendation — delivered through the real, already-built `MODULE:NOTIFICATIONS` (no new delivery mechanism; this is a new *source* of notification-worthy events, not a new channel).

### 4.3 Daily/Weekly/Monthly Summaries

Scheduled aggregation jobs producing a curated subset of §2's own KPIs, delivered via the same real Notifications module — architecturally identical to §4.2's Alerts, differing only in trigger (schedule vs. threshold), not in mechanism.

---

## 5. Future LLM Integration

Attaches through the Extension System (`MODULE:EXTENSIBILITY`), consuming exclusively the same permission-scoped aggregate surface §4.1 already constrains the Copilot to — consistent, without exception, with every other AI-future-extension-point named across this entire research initiative (`VISION:NON_GOALS`'s "additive, never load-bearing" rule).

---

## 6. What This Document Deliberately Does Not Do

- Does not implement any report, dashboard screen, or query — architecture only.
- Does not select a forecasting model or an LLM vendor — implementation-level decisions for whichever future phase builds this.
- Does not design a second data-collection mechanism — every capability here is explicitly a consumer of the two real streams §1.1 already names, never a new one.

---

End of Document

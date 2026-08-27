# neXgen Storefront Design DNA

| Field | Value |
|---|---|
| **Title** | Storefront Design DNA |
| **Document ID** | STOREFRONT_DNA |
| **Status** | Draft — Proposed, pending Product Owner review (per `GOVERNANCE:DOCUMENT_LIFECYCLE`; not yet Accepted) |
| **Owner** | Head of Product Design, drafted at Product Owner's direction |
| **Date** | 2026-08-26 |
| **Nature** | A permanent experience-philosophy document, not an implementation spec. Contains **zero code, zero component implementation, zero mockups, zero page redesign.** Every future storefront theme, page, and component is measured against this document, the way `02_PRODUCT_PRINCIPLES.md` measures every backend proposal. |
| **Builds on** | `docs/product/NEXGEN_PRODUCT_MASTER_VISION.md`, `docs/01_PRODUCT_VISION.md`, `docs/02_PRODUCT_PRINCIPLES.md`, `docs/03_SYSTEM_ARCHITECTURE.md`, `docs/04_MODULE_ARCHITECTURE.md`, `docs/05_DATA_ARCHITECTURE.md`, `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `docs/frontend/STORE_FRONTEND_ARCHITECTURE.md`, `docs/frontend/LANDING_ENGINE_ARCHITECTURE.md`, `docs/frontend/CUSTOMER_EXPERIENCE_ARCHITECTURE.md`, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`, `planning/reviews/COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md`, `planning/reviews/MERCHANT_PRODUCTION_READINESS_AUDIT.md`, `planning/reviews/PLATFORM_GAP_REPORT.md`, `planning/reviews/STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md`, `planning/reviews/EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` — every one of these was read in full before a word of this document was written, and every claim below traces to one of them or is stated as this document's own new, additive philosophy, never as a contradiction of any of them. |
| **Reconciled against** | `VISION:NON_GOALS` — *"neXgen Core will not become a website builder wearing operational software as a feature... This rules out prioritizing storefront themes and page builders over operational depth."* This document does not violate that line, and says explicitly, throughout, why not: every principle below governs **how the real commerce data this platform already owns gets presented**, never invents a second, presentation-layer notion of price, stock, discount, or order. Where a principle would require data that does not exist yet (a rating, a live viewer count, a delivery estimate), this document says so and refuses to design around fabricating it — the same discipline `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md`'s own governing constraint already established for the current storefront, now made permanent. |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-26 | Initial draft, following the Experience Polish Sprint 1 audit's completion | Product Owner directed a permanent experience-philosophy document before any further storefront implementation proceeds |

---

## 0. What This Document Is, and Is Not

This document does not design a theme. It does not specify a color, a font, a page layout, or a component's markup. `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` already drew that line precisely: a **Theme Package** supplies visual identity; the **Storefront Engine** and **Storefront Component Engine** (`STOREFRONT_COMPONENT_ENGINE.md`) supply the swappable contract every theme implements. This document sits **above** all three — it is the reason those contracts exist in the shape they do, and the test every future primitive, template, and theme must pass before it is accepted, exactly the way `01_PRODUCT_VISION.md`'s `VISION:DECISION_FILTER` already governs every backend proposal. A proposal for a new Storefront primitive, a new Section type, or a new Theme Package that cannot answer to this document has not yet earned its place, the same way a backend proposal that cannot answer to `02_PRODUCT_PRINCIPLES.md` has not.

Three things this document refuses to do, stated up front because refusing them is itself a design decision:

- **It will not fabricate data to make a principle easier to satisfy.** Every psychological or emotional design tactic named below (§2, §3, §11) is written with an explicit note on what real data it requires — and what it must never do in that data's absence. This is not caution for its own sake; it is this platform's own most consistently proven competitive asset (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md`'s "severe regression against this entire engagement's own anti-fabrication discipline" language, `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md`'s governing constraint) restated as permanent law, not a one-sprint discipline.
- **It will not describe a single visual theme and call it "the neXgen look."** §4 and §14 define a **DNA** — the invariant a Bangladeshi fashion boutique's theme and a Western electronics retailer's theme must both carry, while looking nothing alike. A document that specified colors and fonts would need rewriting the day a second real theme ships; a document that specifies *why* a theme feels trustworthy, fast, and premium survives every theme this platform will ever ship.
- **It will not treat the storefront as separable from the commerce engine underneath it.** `LANDING_ENGINE_ARCHITECTURE.md` §1 already made this argument once, specifically, for landing pages: the entire reason a neXgen storefront can be trusted is that what it shows is never a second, presentation-layer opinion about price, stock, or discount — it is the real Pricing, Inventory, and Promotions modules' own answer, rendered. Every section below inherits that argument by default, not as a caveat.

---

## 1. Storefront Philosophy

**Identifier: DNA:PHILOSOPHY**

### What makes a neXgen store different?

Every competitor's storefront is a *presentation layer* over commerce data it half-trusts — a Shopify theme doesn't actually know whether a promised discount survives to checkout (`LANDING_ENGINE_ARCHITECTURE.md` §2's own documented GemPages/PageFly failure mode); a WooCommerce plugin stack is, by its own ecosystem's design, several systems pretending to be one (`01_PRODUCT_VISION.md` `VISION:PROBLEM`'s "fragmented business logic" made literal). A neXgen storefront is never guessing. What it shows a shopper is what the real Pricing, Inventory, Promotions, and Checkout modules will actually honor, because there is no second system standing between the storefront and them — the same `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH` that governs the backend governs what a customer sees.

That structural fact is *why* a neXgen store can afford to feel calm and confident rather than noisy and defensive. A storefront built on data it doesn't fully trust compensates with urgency, clutter, and hedge-copy ("prices subject to change," a fifth trust badge nobody reads). A neXgen storefront doesn't need to compensate for anything — so it doesn't, and that restraint *is* the premium feeling this document asks for throughout.

### Why should customers enjoy shopping on it?

Because friction disappears without the shopper ever noticing why. Decision fatigue (§2) is designed against, not induced by badge-clutter and CTA-competition (`CUSTOMER_EXPERIENCE_ARCHITECTURE.md`'s own "exactly one primary call-to-action visible per viewport" bar, already Accepted, restated as permanent law in §15). Trust is built from real signals, never manufactured ones (§11). The path from arrival to purchase (§6) has a deliberate emotional shape, not just a functional one. A shopper should be able to describe a neXgen store the way they'd describe a well-run physical shop: *"I always find what I need, I never feel pushed, and I trust what it tells me."*

### Why should merchants prefer it?

Because every one of the principles below is real, immediately, on day one — a merchant with zero design skill and zero developer gets a genuinely premium storefront by simply using the platform correctly, not by hiring an agency to override its defaults. This is `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` applied to design: a merchant should never need a developer to make their store *feel* trustworthy, only to make it feel *like their own brand* (§5, §14). And because nothing here is theme-specific, a merchant's investment in learning their neXgen Admin — their product data, their brand voice, their customer relationships — compounds across every theme they ever install, present or future, the same durable-relationship thesis `NEXGEN_PRODUCT_MASTER_VISION.md`'s own opening question ("what would make a merchant choose it... on day one thousand") already establishes for the platform as a whole.

---

## 2. Shopping Psychology

**Identifier: DNA:PSYCHOLOGY**

Every mechanism below is named because it is real, well-evidenced customer psychology — not because it is fashionable. Each entry states what real data it requires and what it must never become in that data's absence, per §0's own refusal to fabricate.

- **Decision fatigue.** A shopper who is asked to weigh too many simultaneous signals (five badges, three CTAs, an unstructured wall of specs) doesn't decide carefully — they decide *not to decide*, and leave. Every neXgen surface fights this by design, not by omission: one primary action per viewport (§15), a badge *slot* system that a merchant configures rather than a badge free-for-all (the exact fix `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 16 already proposed for Product Card v4), and progressive disclosure (below) for everything that isn't the immediate decision.
- **Choice architecture.** The *order and grouping* of real options changes outcomes without changing what's true. A neXgen Buy Box groups "Decide" (price, stock, primary CTA), "Reassure" (trust, payment, delivery), and "Learn" (description, FAQ) into visually distinct rhythm bands — not because any one fact is hidden, but because a shopper deciding whether to buy should see the decision-relevant facts first, exactly the visual-rhythm fix `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 21 already named for the current PDP.
- **Trust building.** Trust compounds from *specific, verifiable* signals shown at the moment of doubt (§11), never from repetition of the same generic badge. A payment-method row shown once, at the point of payment decision, does more than the same row repeated four times down the page.
- **Loss aversion.** A shopper who has already added an item to cart, filled a shipping form, or set a Buy Box variant has *something to lose* by abandoning — the platform's job is to make that already-real progress visible, never to manufacture a fake stake. A save-for-later cart line, a filled-and-visibly-confirmed checkout section (`EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 31), a running order total that never disappears mid-form (item 33) — all real loss-aversion mechanics, built from real state the shopper themselves created.
- **Anchoring.** A real `compareAtPrice` next to a real price is a legitimate anchor — `PriceBlock`'s own existing discount/savings-amount logic is correct, permanent design, not a pattern to relitigate. What is never legitimate: a manufactured "was" price that was never actually charged. The anchor must be a real price this store, or a real supplier, actually asked.
- **Momentum.** Each real step a shopper completes (added to cart, filled an address, selected a payment method) should visibly, immediately confirm — the instant, optimistic "Added ✓" state the real cart engine already implements is momentum done correctly: real, synchronous, no manufactured delay standing in for a fake one.
- **Habit formation.** A returning shopper should feel recognized by real memory — Recently Viewed, a real order history once accounts exist, a real "welcome back" moment — never by a generic "we missed you" applied to a first-time visitor a cookie happens to match.
- **Visual attention.** Attention is finite and directional; it goes first to contrast, then to motion, then to position. A neXgen page spends contrast on exactly one thing per viewport (§15) — never on five equally loud claims that cancel each other out.
- **Progressive disclosure.** Depth should be one interaction away, never absent and never forced on a shopper who didn't ask for it — the same "simple surface, real depth underneath" layering `NEXGEN_PRODUCT_MASTER_VISION.md` §3 already established for the merchant's own Command Center applies symmetrically to the customer-facing storefront: a collapsed FAQ, an expandable spec table, a "see all reviews" — never a page that front-loads everything a shopper might conceivably want to know.
- **FOMO — only when backed by real data.** A real "3 left" (a real per-SKU stock count), a real "12 sold today" (a real order-velocity aggregate), a real countdown to a real campaign end-time (`CountdownTimer` is already built and waiting, per `MERCHANT_CONVERSION_AUDIT.md`) are legitimate scarcity signals the moment the real data exists to back them. **A fabricated stock number, a fake "other people are viewing this," or a countdown timer with no real end-time behind it is permanently forbidden on any neXgen storefront** — not a style preference, a hard rule (§15), because the moment one shopper discovers a scarcity claim was invented, every real signal on the same page becomes suspect too. Real scarcity is a conversion tool; fake scarcity is a trust-destroying liability that eventually costs more than it ever earned.
- **Confidence building.** A shopper should feel *more* certain with every scroll, not less. Real specs, real stock status, real policy copy, a real, working payment-method row — confidence is the sum of many small, true things shown at the right moment, never one big persuasive claim.
- **Purchase reinforcement.** The moment immediately after checkout is the platform's one guaranteed positive-emotion touchpoint — `checkout/success`'s own real receipt, real payment-status handling, and (per `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` items 34–35) a warm, restrained acknowledgment of what just happened is not decoration, it is the psychological deposit that makes a customer *want* to come back — never obligated to, per §5's and `VISION:NON_GOALS`' shared rejection of lock-in tactics, but genuinely glad to.

---

## 3. Emotional Design

**Identifier: DNA:EMOTION**

The storefront should move a shopper through a deliberate emotional arc, matched to the Commerce Journey (§6), never a flat, uniform tone from arrival to receipt.

| Feeling | Where it belongs | What earns it |
|---|---|---|
| **Arrival** | Homepage, first viewport | A confident, uncluttered first screen that answers "why buy here" in one glance (§6) — never an empty gray box pretending to be a hero. |
| **Discovery** | Category, search, browsing | Momentum and delight in scanning — real imagery, real merchandising hierarchy, never a flat, undifferentiated grid. |
| **Confidence** | Product Detail | Every doubt a rational shopper would have, answered before they have to ask — real stock, real trust signals, real policy copy, in the order a shopper actually needs them (§2). |
| **Ownership** | The moment "Add to Cart" or "Buy Now" fires | A real, instant, synchronous confirmation — the product is now *theirs* in intent, and the interface should feel that shift immediately, not eventually. |
| **Reward** | Cart, approaching a real free-shipping threshold or a real bundle discount | A visible, real sense of "I'm getting more for what I'm already doing" — never a manufactured reward with nothing behind it. |
| **Success** | Checkout completion | The single highest-trust moment on the entire platform — treated with real weight (§2's purchase reinforcement), never presented with the same flat tone as a form-validation success toast. |
| **Loyalty** | Return visits, post-delivery | Recognition built from real memory (Recently Viewed today; real order history, real loyalty status once those modules exist per `NEXGEN_PRODUCT_MASTER_VISION.md` §9) — earned, never assumed. |

**The platform should feel exciting without becoming noisy.** Excitement here means *momentum* — a shopper feels the store is alive, current, and responsive — not volume. A page with one well-earned, real urgency signal is exciting. A page with five simultaneous badges, a spinning countdown, and a pop-up is noisy, and noise is a tell that the store is compensating for something it doesn't actually have (§1). Every emotional beat above is built from something real the shopper did or something real the store knows — never manufactured on their behalf.

---

## 4. Visual Identity

**Identifier: DNA:VISUAL_IDENTITY**

Not colors, not fonts — personality, and the reasoning a future Theme Package must be able to trace every stylistic choice back to.

- **Premium** — because restraint, not decoration, carries hierarchy. `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.1 already named the reference bar precisely (Stripe/Linear's near-absence of gratuitous shadow and gradient; type scale and spacing doing the work instead) — this document makes that bar permanent for every current and future theme, not just the current default one.
- **Modern** — because it uses real, current interaction conventions (a drawer, not a modal, for cart; a sticky bottom bar, not a floating action button nobody expects, for mobile buy actions) rather than dated ecommerce-template patterns.
- **Clean** — because every element on screen earned its place against `UI:VISUAL_HIERARCHY`'s own "one primary emphasis" test (`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.1) — never decoration for its own sake.
- **Approachable** — because copy speaks plainly (no jargon, no artificial urgency language) and touch targets, spacing, and contrast never punish a first-time or low-literacy shopper (§12).
- **Fast** — because visual identity and performance are the same commitment, not a trade-off (§10) — a premium *feeling* store that is actually slow is a contradiction this document refuses to accept as a valid design outcome.
- **Professional** — because a neXgen store never looks like an unfinished demo. `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.2's own bar already states it: no default primitive ships with a stock illustration, a generic gradient, or placeholder Latin text — an honestly plain default (real tokens, genuinely functional) reads as deliberate, never as broken (the same distinction §11 draws for honest "coming soon" states generally).
- **Family-friendly** — because a store selling to a broad Bangladeshi household market (and, per `NEXGEN_PRODUCT_MASTER_VISION.md` §11, eventually beyond it) should never rely on aggressive, high-pressure visual tactics (flashing countdowns, shouting copy, manufactured urgency) that read as untrustworthy to a cautious buyer — restraint again, applied to tone this time, not just layout.
- **Trustworthy** — because visual consistency itself is a trust signal: the same button, badge, and card language behaves identically everywhere it appears, so nothing on a neXgen store ever feels like it wandered in from a different, less careful product.
- **Energetic** — because momentum (§2) is expressed visually too — real hover states, real optimistic feedback, real (never decorative) motion (§8) — a store that feels alive without ever feeling like it's trying too hard.

**The unifying test, restated as the single sentence every future theme reviewer should apply**: *does this choice make the real commerce data underneath it easier to trust and act on, or does it exist to distract from the fact that the data isn't there yet?* Every one of the nine words above passes that test; nothing that fails it belongs in a neXgen theme, regardless of how attractive it looks in isolation.

---

## 5. Merchant Philosophy

**Identifier: DNA:MERCHANT_PHILOSOPHY**

Directly inherited, not reinvented: `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION` already states the platform-wide rule — "business behavior should be adjustable through defined configuration wherever realistically possible... custom, one-off logic that only one merchant uses is a last resort." This document's contribution is naming what that means specifically for storefront experience:

- **Easy merchandising** means a merchant chooses *what to feature and how prominently*, through real configuration (a Section's ordering, a badge slot's enabled state, a Template's default arrangement) — never by asking an engineer to change component code for one store.
- **Easy campaigns** means a merchant plugs a real, evaluated Promotion into a real Section (`LANDING_ENGINE_ARCHITECTURE.md` §3.7's "Dynamic Offers" mechanism is the concrete precedent) — a campaign banner's discount claim is never a copywriting decision divorced from what checkout will actually honor.
- **Easy promotions** are the same real `Promotions` module every other surface already uses (`PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`) — a storefront banner, a cart nudge, and a checkout line item all read the *same* evaluated promotion, never three separate opinions about what the discount is.
- **Easy landing pages** are, per `LANDING_ENGINE_ARCHITECTURE.md` §3.1, not a separate system at all — a landing page **is** a CMS Page composed of the same real Sections every other page uses, so a merchant's landing-page skill transfers directly to every other page they'll ever edit, and vice versa.
- **Easy seasonal updates** mean swapping real configuration (a Hero's heading, a Template's Section order, a theme's token override for a festival accent color) — never a deploy, per `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`'s own decision rule that a common operational task requiring engineering intervention is, by definition, incomplete.
- **Easy product highlighting** means a merchant marks a product Featured/Trending/Best-seller through real catalog configuration a Section already knows how to render — never a one-off "pin this product" hack living outside Catalog's own ownership of that data (`ARCH:DATA_OWNERSHIP`).
- **Easy customization without developers** is the entire reason the Theme Engine's token hierarchy (`THEME_ENGINE_ARCHITECTURE.md` §7) exists: a merchant's brand colors, logo, typography preset, and button style are real configuration (already real today, per the Appearance Workspace shipped in Beta Experience Pack 1) — the ceiling of "customization" a merchant can reach without a developer should keep rising release over release, never require a fork.

**The decision rule this document adds, directly extending `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION` to the storefront specifically**: before any future storefront feature is built as component code with a hardcoded default, ask whether a merchant would plausibly want to change it — and if so, it is configuration, exposed through the Appearance/Theme surface, from the start, not retrofitted later once the first merchant asks.

---

## 6. Commerce Journey

**Identifier: DNA:JOURNEY**

Not page-by-page. The complete shopping journey, and the one emotional and structural goal each stage must satisfy — every future page redesign is checked against its *stage's* goal here, not just its own isolated screen.

**Landing** — the goal is orientation in under three seconds: what does this store sell, and does it feel credible? A generic hero fails this; a hero built from the store's own real branding (`StorefrontBranding`, already real) and a genuine value proposition succeeds. Emotional target: **arrival** (§3).

**Discovery** — the goal is "I didn't know I wanted this until I saw it." Category browsing, brand pages, and merchandised homepage rails all serve discovery; their job is breadth and delight, not yet decision pressure. Emotional target: **discovery**.

**Browsing** — the goal shifts from breadth to comparison: filters, sort, and the product card's own scannability (badges, price, stock — §2's choice architecture) let a shopper narrow toward a decision without friction. Emotional target: still **discovery**, sharpening toward **confidence**.

**Decision** — the Product Detail page's entire job. Every real fact a rational shopper needs, in the right order (§2), with exactly one dominant next action (§15). Emotional target: **confidence**.

**Purchase** — the moment "Add to Cart" or "Buy Now" fires. This is not the same stage as Checkout — it is the *commitment* moment, and it deserves its own instant, real, synchronous acknowledgment (§2's momentum, §3's ownership) before the shopper ever sees a form.

**Checkout** — the goal is the opposite of Discovery: minimize novelty, maximize predictability. No new persuasion, no new merchandising pressure — only clarity, reassurance, and speed, per `LANDING_ENGINE_ARCHITECTURE.md` §3.2's own Instant Checkout thesis and `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md`'s explicit "do not touch checkout logic, only the experience" mandate. Emotional target: calm, not excitement.

**Success** — the platform's one guaranteed positive-emotion moment (§2, §3). The goal is to *bank* the goodwill the purchase just created, not merely to confirm a transaction completed. Emotional target: **success**, opening the door to **reward** and **loyalty**.

**Retention** — the goal is recognition without pressure: real Recently Viewed, real order history once accounts exist, real, honest re-engagement (a genuine restock notice, never a manufactured "your cart misses you"). Emotional target: **loyalty**.

Every stage above composes the *same* real components and the *same* real data — per `LANDING_ENGINE_ARCHITECTURE.md`'s own "one system, not a bolt-on" thesis, a neXgen journey is one continuous experience built from one set of real primitives, never eight disconnected page types that happen to share a header.

---

## 7. Component Philosophy

**Identifier: DNA:COMPONENT_PHILOSOPHY**

Not a component list — `STOREFRONT_COMPONENT_ENGINE.md` §2 already owns that inventory, and this document does not duplicate it. These are the principles every current and future primitive, in every current and future theme, must satisfy.

- **Data-in, markup-out, always.** `STOREFRONT_COMPONENT_ENGINE.md` §1's own rule — a primitive never fetches its own data, never invents a fact the props it received don't carry. This is the component-level enforcement of §0's anti-fabrication refusal: a component literally cannot show a fake price, because it was never handed one to fake.
- **One contract, many implementations.** Exactly `MODULE:PUBLIC_CONTRACT`'s own backend discipline, applied to the frontend: a primitive's props shape is its public contract; a Theme Package's own implementation of it is private, swappable internals. A theme may make a `ProductCard` look completely different from the default; it may never change what data a `ProductCard` requires to render correctly.
- **A real, functional default, never a placeholder.** `THEME_ENGINE_ARCHITECTURE.md` §3's own "always renders something" guarantee, and `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.2's own bar (no stock illustration, no generic gradient, no placeholder Latin text) — every primitive's default implementation must be honestly plain and genuinely usable, because a merchant with no theme installed is still running a real store, not a demo.
- **Cards, badges, lists, drawers, sheets, forms are all instances of the same visual language, never bespoke per feature.** A badge on a Product Card and a badge in the Cart Drawer must share one component, one set of tone/severity rules — the same `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` discipline that already governs the admin's own `packages/ui` inventory, extended to the storefront's own component set (`STOREFRONT_COMPONENT_ENGINE.md`'s own explicit example: `UpsellBlock`/`CrossSellBlock` are deliberately the *same* primitive under two names, because the rendering need is identical).
- **A component that has nothing real to show does not render a hollow shell.** An honest empty state (real copy, real next action) is a first-class output of every primitive, not an afterthought — the same discipline that makes "Price unavailable," "No reviews yet," and "Search results aren't available yet" real, deliberate, designed states throughout this platform's own history, never a blank space or a raw error.
- **No primitive owns commerce logic.** Price calculation, discount evaluation, stock availability — every one of these is asked of the owning backend module and rendered, never recomputed client-side "for speed" or "for a nicer number." This is `ARCH:DATA_OWNERSHIP` extended one more hop, to the very last rendering step.
- **Composition over proliferation.** Before a new primitive is proposed, the question is always whether an existing one, composed differently, already satisfies the need — the same "no duplicated components" bar `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` §8 already held itself to for the current storefront, made permanent here for every future addition.

---

## 8. Motion Philosophy

**Identifier: DNA:MOTION**

`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.1 already set the reference bar (Microsoft/Fluent: "motion as confirmation, never spectacle") and `DESIGN_SYSTEM.md`'s own existing motion tokens (`duration-fast`/`duration-slow`, `prefers-reduced-motion` respected platform-wide) are the real, working mechanism. This document states the *why*, permanently:

- **Motion answers a question a shopper just asked, or confirms an action they just took — it never runs unprompted.** A hover reveal, a drawer sliding open, an "Added ✓" state — every one of these exists because the shopper did something and motion is the fastest, clearest way to say "yes, that worked."
- **Micro-interactions are proportional to the action's real weight.** Adding to cart deserves a visible, satisfying confirmation (§2's momentum); dismissing a tooltip does not deserve the same visual weight. Motion that treats a trivial action like a triumphant one cheapens the moments that actually deserve emphasis.
- **Loading states are shaped like the content they're waiting for, never a generic spinner over a blank page** — already Accepted platform-wide (`UI:LOADING_STATES`), restated here because a storefront's first paint is the single highest-stakes place this matters (`CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §1.2 item 3).
- **Hover and press states exist to make the interface feel physically responsive, not decorative.** A card that lifts slightly on hover, a button that compresses slightly on press — real, tactile feedback, timed fast enough (`duration-fast`) that it reads as instantaneous, never as an animation the shopper has to wait through.
- **Success states get a genuine, restrained moment — never an interruption.** The checkout-success acknowledgment (§2, §3) is the platform's biggest legitimate use of a "delight" motion moment — and even there, restrained: a warm color wash and a real checkmark, never a full-screen animation that delays the shopper from seeing their real order.
- **Cart and Drawer transitions are fast and directional, matching the mental model of the object moving.** A drawer slides from the edge it's anchored to; it does not fade, scale, or bounce — motion should teach a shopper where things came from and where they went, not just perform.
- **No animation ships without a `prefers-reduced-motion` equivalent that preserves the same information, instantly.** Every motion principle above is an enhancement of a state change that must already be correct and legible with motion off — never the only way a shopper learns what happened.
- **When in doubt, remove the animation, not add one.** A store that needs motion to feel alive has a merchandising or content problem motion cannot fix (§1) — motion is confirmation of something real happening, never a substitute for it.

---

## 9. Mobile Philosophy

**Identifier: DNA:MOBILE**

neXgen is mobile-first — not "responsive," which implies a desktop design reflowed downward, but designed from the thumb outward, per `NEXGEN_PRODUCT_MASTER_VISION.md` §11's own observation that a large share of the platform's real Bangladeshi merchant and customer base is mobile-primary, often exclusively so.

- **Thumb zones govern placement, not just breakpoints.** Primary actions (Buy Now, Add to Cart) live in the bottom third of the viewport on mobile — the sticky mobile buy bar (already real) is not a mobile *accommodation*, it is the mobile-first *default* expression of the Buy Box, with the desktop layout being the adaptation, conceptually, even where implementation reasons place the code the other way around.
- **One-hand use is the default design target, not an edge case.** Navigation, filters, and cart controls should be reachable without a shopper shifting their grip — a mobile filter drawer that opens from the bottom or the near edge, never a control that assumes a shopper's thumb can reach the top corner of a tall phone.
- **Scroll behavior is honest and predictable.** No scroll-jacking, no content that shifts position as images load (a real, hard performance requirement too — §10), no infinite scroll that silently discards a shopper's place if they navigate away and back.
- **Sticky actions earn their permanence.** A sticky bottom buy bar, a sticky filter-apply button — each stays visible because the action it enables is the entire reason the shopper is on that screen; a sticky element that isn't the page's primary action is clutter, not convenience (§2's decision-fatigue discipline, applied to real estate).
- **Touch targets meet a real minimum, everywhere, without exception** — 44×44px logical pixels, per §12's accessibility floor doubling as a mobile-usability floor; a target too small to comfortably tap is a bug, not a visual-density trade-off worth making.
- **Mobile checkout is not a shrunk desktop form.** A running order total stays visible without scrolling back up (`EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 33's own recommendation, elevated to permanent principle here); form fields are large enough to tap accurately the first time; autofill and numeric keyboards are used wherever the field's data type allows it.
- **Mobile product pages lead with the same decision-relevant rhythm as desktop** (§2, §6) but respect that a mobile shopper scrolls more and hovers never — every interaction that depended on hover on desktop (a secondary image reveal, a quick-action row) needs a real, first-class tap-based equivalent, never a feature that quietly stops working below a breakpoint.
- **Performance is a mobile-philosophy issue, not only a performance-philosophy one** (§10) — a shopper on a mid-range Android device on a metered mobile connection, a real and common member of this platform's actual audience, is the baseline the experience is designed for, not the edge case it's merely tested against.

---

## 10. Performance Philosophy

**Identifier: DNA:PERFORMANCE**

Every experience improvement this document ever motivates must preserve, never trade away:

- **Speed.** A "premium feeling" store that is measurably slow has failed §4's own visual-identity test — speed is not in tension with premium feeling here, it is a *component* of it, exactly as `04_MODULE_ARCHITECTURE.md`'s own §9.2 requirement already states for the storefront rendering choice at the architecture level ("fast first-paint for anonymous visitors... per `PRINCIPLES:MERCHANT_FIRST`").
- **SSR/SSG where the content allows it.** `STORE_FRONTEND_ARCHITECTURE.md` §2's own rendering-mode table (SSG+ISR for Product/Category/CMS, SSR only where genuinely request-specific) is not renegotiated by any experience proposal — a visual change that would force a currently-static page into always-dynamic rendering needs its own explicit justification and sign-off, never a silent side effect of a styling decision.
- **SEO.** Structured data, canonical URLs, and real metadata (§5 of `STORE_FRONTEND_ARCHITECTURE.md`) are load-bearing business infrastructure, not decoration — a merchant's ability to be found by a real search engine is exactly the kind of "merchant's operational reality" `PRINCIPLES:MERCHANT_FIRST` protects.
- **Core Web Vitals.** Every visual addition (a new badge, a new motion, a new below-the-fold rail) is checked against layout shift and interaction latency before it ships — `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md`'s own findings (no bundle-size budget, un-tuned image `sizes`, missing `generateStaticParams`) are named here as permanent categories of regression this document's principles must never reintroduce, not just historical bugs already fixed once.
- **Low bundle size.** New experience code composes existing primitives and existing libraries wherever possible (§7's "composition over proliferation") — a new micro-interaction or merchandising widget that requires a new client-side dependency needs to justify that cost explicitly, the same way `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` §9 already required for its own proposed changes.
- **Fast interaction.** Every button, drawer, and form must respond within the interaction budget a shopper actually perceives as instant — motion (§8) exists partly to make real latency *feel* shorter, but it must never be used to paper over latency that should be fixed at the data-fetching layer instead.
- **The rule that resolves every future tension between "this would look better" and "this would cost performance"**: performance wins, every time, unless the experience gain is large enough to warrant an explicit, documented, Product-Owner-level trade-off — mirroring exactly how `PRINCIPLES:PURPOSE`'s testable/enforceable bar governs every backend principle in this platform. A visual idea that cannot be built within this budget is not a bad idea — it is a *not-yet* idea, waiting on a real performance budget increase or a smarter implementation, never an excuse to quietly blow the budget once.

---

## 11. Trust Philosophy

**Identifier: DNA:TRUST**

**How trust is earned, stated as flatly as possible: by never once being caught showing something that isn't real.** Every other trust tactic is secondary to this one, because a single fabricated signal — a fake review, a fake stock count, a fake countdown — retroactively poisons every real signal on the same page. This platform's own history already proves the alternative works: honest "coming soon" states, honest empty states, and honest real data have been the storefront's actual, repeatedly-cited credibility asset across every prior milestone (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §4, `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md`'s governing constraint) — this document makes that pattern permanent law, not a per-sprint discipline that has to be re-argued every time.

Concretely:

- **Not fake reviews.** A review section with no real reviews shows a real, honest "no reviews yet" state — never a fabricated rating, never an empty star row that implies zero stars (a false signal, not an absence of one).
- **Not fake scarcity.** Covered fully in §2 — real stock counts and real order-velocity data are legitimate; anything invented is permanently forbidden.
- **Real badges only.** A trust badge, a payment-method icon, a courier badge exists on a page only when the underlying capability is real and live — `MERCHANT_CONVERSION_AUDIT.md`'s own "What Was Deliberately Not Built This Milestone" section (payment/courier rows withheld until a real payment integration existed) is the exact discipline this document generalizes: never claim a capability before it's real.
- **Honest failure, always.** `PRINCIPLES:EXPLICIT_FAILURE` applied to the storefront specifically: a failed add-to-cart, a checkout validation error, a payment that couldn't initiate — every one of these tells the shopper plainly what happened and what to do next, never silently retries, never hides behind a generic error, never leaves a shopper wondering whether their action worked.
- **Consistency is itself a trust signal.** A shopper who sees the same button, the same badge language, and the same price-formatting rule everywhere on the store learns, without being told, that the store is careful — inconsistency, even cosmetic, quietly erodes exactly the confidence §2 is trying to build.
- **Transparency about limits.** Where a real capability doesn't exist yet (search results, wishlist, reviews), the honest "coming soon" pattern this platform already uses is not a stopgap to be embarrassed about — it is itself a trust-building choice, because it tells a shopper the platform will never pretend on their behalf.
- **The AI-era extension of this rule, stated now so it never needs relitigating later** (ties directly to §13): any future AI-generated content shown to a customer — a summarized review, an AI product description, an AI-suggested bundle — must be clearly, honestly attributable as such, never presented as if it were a human merchant's own words or a customer's own review, mirroring `NEXGEN_PRODUCT_MASTER_VISION.md` §14's "transparency over magic" rule already binding for the merchant-facing side of the platform.

---

## 12. Accessibility Philosophy

**Identifier: DNA:ACCESSIBILITY**

Accessibility should improve conversion, not exist only for compliance — and the reasoning is not sentimental, it is structural: **every accessibility fix removes friction, and friction is what §2's entire psychology section exists to eliminate.**

- A properly labeled, keyboard-operable "Add to Cart" button is not just usable by a screen-reader shopper — it is a button every shopper can operate faster and more confidently, because a clear, unambiguous control is inherently less cognitively taxing (§2's decision fatigue, again).
- Sufficient color contrast doesn't just serve a low-vision shopper — it serves every shopper on a low-quality phone screen in bright outdoor sunlight, a real, common condition for this platform's own mobile-first Bangladeshi audience (§9).
- A real focus-visible ring and a logical tab order don't just serve a keyboard-only shopper — they are the same infrastructure that makes a fast-typing shopper's checkout form usable without ever touching a mouse or a trackpad.
- Alt text on product imagery doesn't just serve a screen-reader shopper — the same descriptive text is what a search engine indexes, directly serving §10's SEO requirement.
- A 44×44px minimum touch target doesn't just serve a shopper with motor-control needs — it is the same target size that prevents a hurried mobile shopper's mis-tap from adding the wrong product or navigating away accidentally.

**The permanent rule**: accessibility work is never "for the 5%" — every accessibility improvement, examined honestly, turns out to also be a usability improvement for the other 95%, and this document treats that as the actual justification, not a secondary benefit. No future theme, primitive, or page ships without meeting WCAG AA at minimum, and this bar is never traded away for a visual idea, per the same non-negotiable posture `PRINCIPLES:SECURITY_FIRST` holds for security: an inaccessible feature is not a feature with a known limitation, it is an incomplete feature.

---

## 13. Future AI Commerce

**Identifier: DNA:AI_COMMERCE**

`NEXGEN_PRODUCT_MASTER_VISION.md` already designed the merchant-facing half of this (§§6–8: Commerce Intelligence, the AI Copilot, Automation Studio) in real depth, governed by one hard line that this document inherits in full for the *customer*-facing storefront too: **AI recommends and assists; it does not silently decide, publish, or spend on anyone's behalf** — a customer-facing extension of `NEXGEN_PRODUCT_MASTER_VISION.md` §14's "the AI recommends; the merchant decides" rule, restated here as "the AI assists; the customer and the merchant each keep their own consent."

This document does not design any of the following — it states the shape each must fit, so building any of them later is additive, never a redesign:

- **AI shopping assistant.** A conversational or guided discovery layer *composes* real Catalog/Search/Recommendation data (`STOREFRONT_COMPONENT_ENGINE.md`'s own primitives) — it never becomes a second product database, never invents a product attribute, price, or stock claim the real Catalog doesn't already carry. Its output renders through the same `ProductCard`/`ProductGrid` primitives every other surface uses (§7), never a bespoke, one-off UI.
- **AI recommendations.** The real `getRecommendations()` infrastructure already exists and is already the single shared recommendation pathway every surface uses (`EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` §8's own "no duplicated components" confirmation). A future AI-driven personalization layer is a smarter *input* to that same pathway — a better `slot` resolution — never a second, parallel recommendation system.
- **AI merchant assistant.** Entirely the domain of `NEXGEN_PRODUCT_MASTER_VISION.md` §7's Copilot — this document's only contribution is confirming the storefront-side consequence: an AI-drafted homepage headline, product description, or campaign banner is always a **draft** a merchant reviews and publishes through the real CMS/Appearance surface (§5), never auto-published directly to a live storefront.
- **AI merchandising.** A "Trending" or "Recommended" rail that an AI helps curate is still, structurally, a real `ProductGrid` fed by a real, evaluated set of product ids — the AI's job is picking better inputs to an existing, honest rendering pipeline, never inventing a claim ("our most popular!") about a product with no real velocity data behind it.
- **AI search.** Composes the real Search module (`MODULE:SEARCH`, already real at the backend) — an AI layer may improve query understanding or ranking, but it must return real, existing Catalog products, respecting the same visibility/availability rules the real Search module already enforces (`04_MODULE_ARCHITECTURE.md` §5's own Search Security Considerations), never a hallucinated result.

**Why no redesign is required later**: every principle in §§2–12 above is already written in terms of *real data, real components, real consent* — an AI system is, structurally, just a new, smarter way of deciding *which* real data to surface *when*, not a new category of thing this document would need new rules for. The moment any future AI feature is proposed, it is checked against §0's anti-fabrication refusal and this section's consent boundary, the same way every other feature is checked against every other section — the test doesn't change; only the technology producing the input does.

---

## 14. Theme DNA

**Identifier: DNA:THEME_DNA**

`THEME_ENGINE_ARCHITECTURE.md` §§2–9 already built the real mechanism (the `ThemePackage` contract, additive-only token overrides, child-theme inheritance, dark-mode opt-out) that makes multiple, genuinely different-looking official themes possible without forking the platform. This section names what every one of those themes — a minimal, monochrome theme for a premium electronics brand and a warm, colorful theme for a fashion boutique alike — must still share, so a merchant, a shopper, or a future theme reviewer can always tell it's a neXgen store.

**What every official theme must preserve, regardless of its own visual choices:**

1. **The component contract, never the component's look.** Every theme implements the same `StorefrontPrimitiveName` set (`STOREFRONT_COMPONENT_ENGINE.md` §2) — the *shape* of a Product Card, a Buy Box, a Cart Drawer is fixed; the *skin* is the theme's own.
2. **The choice-architecture rhythm of §2 and §6** — Decide/Reassure/Learn bands on a Product Detail page, one dominant CTA per viewport, progressive disclosure over front-loading — a theme may restyle these bands entirely; it may never reorder them into a worse decision-fatigue shape or introduce a second competing CTA.
3. **The anti-fabrication discipline of §0 and §11.** A theme has zero ability to invent data (per §7's "data-in, markup-out" and `THEME_ENGINE_ARCHITECTURE.md` §4's "no Theme Package fetches data of its own") — this is enforced architecturally, not just by policy, which is precisely why it's safe to let themes vary freely everywhere else.
4. **The performance and accessibility floors of §10 and §12** — non-negotiable regardless of a theme's own visual ambition; a beautiful theme that fails Core Web Vitals or WCAG AA is not an acceptable neXgen theme, full stop.
5. **The motion restraint of §8** — a theme may choose its own transition curves and durations, but never motion that runs unprompted or exceeds the "confirmation, not spectacle" bar.
6. **The mobile-first floor of §9** — thumb-zone primary actions, a sticky mobile buy surface, real (not degraded) touch interaction parity with desktop — every theme's own mobile experience, not an afterthought variant of it.
7. **The honest-empty-state pattern of §7 and §11** — every theme's own implementation of every primitive must render a real, designed empty/loading/error state, never a blank space or an unstyled fallback that reveals the seams underneath.

**What every official theme is free to make its own, without limit:** color, typography, spacing scale (within token bounds), border radius, button style, imagery treatment, motion timing curves (within the restraint bar), page-level composition and Section ordering (via its own Templates, `THEME_ENGINE_ARCHITECTURE.md` §6), tone of voice in its own default copy.

**The test for "does this still feel like neXgen," concretely, for a future reviewer with no access to this document's author**: hand someone who has used one neXgen store a completely different neXgen theme with no branding shown. They should still be able to correctly guess where the primary action is, trust the price they see, find the same information in roughly the same place relative to the decision, and never once suspect the store is showing them something that isn't real. If a proposed theme fails any part of that test, it is a beautiful theme that is not yet a neXgen theme — the fix is never to loosen this document, it is to bring the theme back into alignment with it.

---

## 15. Design Rules — The Permanent Non-Negotiables

**Identifier: DNA:RULES**

Every future storefront implementation — every page, every primitive, every theme — must follow these. Each traces to a section above; none introduces anything new that section didn't already establish.

1. Never show data that isn't real. No fabricated price, discount, stock count, rating, review, viewer count, or countdown, ever, under any circumstance. (§0, §2, §11)
2. Where real data doesn't exist yet, show a real, honest, designed empty or "coming soon" state — never a blank space, a broken-looking gap, or a silently omitted feature. (§7, §11)
3. Exactly one primary call-to-action is visible per viewport on first paint. Never two competing high-emphasis buttons on screen at once. (§2, §4, §14)
4. A component never fetches or invents its own data — it renders only what it was given. (§7, §13)
5. A component's public props contract is stable; its internal implementation may vary freely across themes. (§7, §14)
6. New components are proposed only after confirming no existing primitive, composed differently, already serves the need. (§7, §10)
7. Every loading state is a skeleton shaped like the real content it precedes — never a generic spinner over a blank page. (§8)
8. Motion only ever confirms something the shopper just did or asked for — it never plays unprompted. (§8)
9. Every animation has a `prefers-reduced-motion`-respecting equivalent that conveys the same information instantly. (§8)
10. Micro-interaction weight is proportional to the real weight of the action it confirms. (§8)
11. Primary actions live within a mobile shopper's thumb reach by default, not as a later adaptation. (§9)
12. Every interactive element meets a 44×44px logical-pixel minimum touch target, without exception. (§9, §12)
13. Mobile checkout keeps the running order total visible without requiring the shopper to scroll back up. (§9)
14. Every feature available on desktop has a real, first-class mobile equivalent — never a feature that silently disappears below a breakpoint. (§9)
15. SSG/ISR is used for every page whose content doesn't genuinely vary per visitor; SSR is reserved for content that actually does. (§10)
16. No experience change may introduce measurable layout shift. (§10)
17. No experience change may add a new client-side dependency without an explicit, justified cost-benefit case. (§10)
18. Every product image ships with correctly tuned `sizes` and a real placeholder/blur strategy — never an untuned, over-fetching default. (§10)
19. Structured data, canonical URLs, and real per-entity metadata are present on every applicable page — never omitted for a visual-only reason. (§10)
20. Performance wins over a visual preference by default; overriding that requires an explicit, documented trade-off decision. (§10)
21. Every interactive control is fully keyboard-operable with a visible focus state. (§12)
22. Every page and theme meets WCAG AA contrast and semantics at minimum — never traded away for a visual idea. (§12)
23. All meaningful imagery carries real, descriptive alt text — never empty or auto-generated filler. (§12)
24. A failed action always tells the shopper what happened and what to do next — never a silent failure, a raw error, or an infinite spinner. (§11, §12)
25. Trust signals (badges, payment icons, courier logos) appear only for capabilities that are actually live today. (§11)
26. Scarcity and urgency signals require real, live backing data — a real stock count, a real order-velocity figure, a real campaign end-time — with no exception, ever. (§2, §11)
27. Consistency beats novelty: an existing pattern (badge shape, drawer behavior, price formatting) is reused unless demonstrably unfit, matching `PRINCIPLES:CONSISTENCY_OVER_NOVELTY`. (§7, §14)
28. Merchant-adjustable behavior is exposed as real configuration (Appearance, Theme, CMS) — never as a one-off code change for a single store. (§5)
29. Any future AI-generated customer-facing content is clearly, honestly attributed as AI-assisted — never presented as if written by a human merchant or a real customer. (§11, §13)
30. AI features render through the same primitives, recommendation pathway, and Catalog/Search rules every non-AI feature already uses — never a second, parallel system. (§13)
31. AI never auto-publishes customer-facing content, changes a live price, or completes a transaction without the merchant's or customer's own explicit action. (§13)
32. A landing page, campaign page, or any future funnel surface is a real CMS Page composed of real Sections — never a second, parallel page-building or checkout system. (§6, §14)
33. Every commerce fact shown anywhere in the storefront (price, discount, stock, shipping cost) is asked of its real owning backend module at render or interaction time — never recalculated, cached indefinitely, or guessed client-side. (§1, §7)
34. The Decide → Reassure → Learn rhythm governs every decision-stage page (principally Product Detail); decision-relevant facts are never buried beneath reassurance or educational content. (§2, §6)
35. Cart and Checkout minimize novelty and persuasion pressure relative to Discovery and Browsing — their job is calm clarity, not new merchandising. (§6)
36. The moment immediately after a successful purchase receives deliberate, restrained positive-emotion design — never the same flat tone as a routine confirmation. (§2, §3)
37. Every new primitive, Section, or Template is checked against this document before being proposed for implementation, the same way a backend proposal is checked against `02_PRODUCT_PRINCIPLES.md`. (§0)
38. A theme may restyle anything; it may never reorder core decision-architecture, weaken accessibility or performance floors, or gain the ability to fabricate data. (§14)
39. No storefront feature requires a merchant to also adopt an unrelated module or capability to use it, matching `VISION:NON_GOALS`'s anti-bundling rule extended to the storefront. (§0, §5)
40. Every principle in this document applies identically whether a merchant is on Beta-stage single-tenant infrastructure or a future multi-tenant SaaS deployment — none of it is infrastructure-dependent. (§0, §5)

---

## How This Document Should Be Used

Every future storefront proposal — a new primitive, a new page composition, a new theme, a new AI-assisted feature — should be able to answer, plainly: which section of this document does it serve, and which of the forty rules in §15 does it satisfy or risk violating? A proposal that cannot answer this has not yet been thought through at the right level, the same discipline `01_PRODUCT_VISION.md`'s own `VISION:DECISION_FILTER` already requires one layer up, and the same discipline `NEXGEN_PRODUCT_MASTER_VISION.md`'s own closing section already established for product strategy. This document does not expire when the next theme ships, the next AI feature lands, or the next merchant vertical is onboarded — it is the permanent measure every one of those is built against.

End of Document.

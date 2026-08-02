# neXgen Core
## 07_UI_DESIGN_SYSTEM

| Field | Value |
|---|---|
| **Title** | UI Design System |
| **Document ID** | UI |
| **Version** | 1.0 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer (independently reviewed and approved by Product & Solution Architect) |
| **Last Updated** | 2026-08-01 |
| **Parent Document** | 06_API_STANDARD |
| **Related Documents** | 00_PROJECT_GOVERNANCE, 01_PRODUCT_VISION, 02_PRODUCT_PRINCIPLES, 03_SYSTEM_ARCHITECTURE, 04_MODULE_ARCHITECTURE |
| **Applies To** | Every current and future interface any module presents, across storefront and admin |

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 0.1 | 2026-08-01 | Initial draft | First UI Design System draft |
| 1.0 | 2026-08-01 | Added `UI:VISUAL_HIERARCHY` (new §5: primary/secondary/tertiary emphasis, attention flow), `UI:DENSITY` (new §10: Comfortable/Compact/Dense modes and when each applies), and `UI:MICROINTERACTIONS` (new §17: interaction feedback philosophy covering hover/press/toggle/inline validation/success confirmation); renumbered §§5–28 to §§6–31 accordingly; strengthened `UI:THEME_SYSTEM` with the explicit rule "themes may change presentation but must never change interaction behaviour, information architecture, or business workflows," with rationale; added 3 Review Checklist items covering the new sections. Status changed to Accepted following independent review by the Product & Solution Architect and Product Owner approval | Independent review requested these refinements; no other architectural changes were made |

---

# 1. Purpose

**Identifier: UI:PURPOSE**

This document defines the platform-wide design system: the shared visual and interaction language every interface — storefront and admin alike — is built from. It is not a specification of any specific page, screen, or layout; it is the vocabulary and rule set a future page or screen is built with, the same relationship `06_API_STANDARD` has to any specific endpoint.

A design system exists so that a person moving between two different modules' screens experiences one coherent product, not a collection of independently designed surfaces that happen to share a domain. It also exists so that a new module can be built by composing already-defined patterns, rather than every module reinventing its own visual and interaction decisions from nothing.

---

# 2. Scope

**Identifier: UI:SCOPE**

This document covers design philosophy, design tokens, color, typography, spacing, grid and layout, responsive breakpoints, elevation, borders and radius, icons and illustration, motion, the component vocabulary, forms, tables, navigation, feedback states, empty states, loading states, error states, accessibility, internationalization, theming, and design stability levels.

It does **not** define page layouts, React components, CSS, Tailwind classes, or any other implementation detail. A drafter who finds themselves specifying a class name, a component's code structure, or a specific page's exact layout has drifted out of scope — those belong to future implementation-level work, not this document.

---

# 3. Authority

**Identifier: UI:AUTHORITY**

This document is subordinate to `00_PROJECT_GOVERNANCE`, `01_PRODUCT_VISION`, `02_PRODUCT_PRINCIPLES`, `03_SYSTEM_ARCHITECTURE`, and `04_MODULE_ARCHITECTURE`. It treats the frontend technology decisions in `ARCH:TECHNOLOGY_DECISIONS` §9.2 as implementation-level choices this document does not need or want to reference — per `GOVERNANCE:TECHNOLOGY_LEAKAGE`, `04_MODULE_ARCHITECTURE` classified Module Architecture as Mostly Technology Independent, and this document, one level further from implementation, holds itself to the same standard even more strictly.

Every future module-specific interface must be built from the vocabulary this document defines. If a future interface is found to require a pattern this document does not provide, the correct path is to propose an addition to this document, not to introduce a one-off pattern outside it.

---

# 4. Design Philosophy

**Identifier: UI:DESIGN_PHILOSOPHY**

- **Mobile-first.** Every pattern in this document is designed starting from the smallest, most constrained form factor. A larger screen is an enhancement of the mobile experience, never a prerequisite for it — this directly serves `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`, since an operator or customer without a desktop must still have a complete experience.
- **Enterprise-grade, never generic.** The platform must feel trustworthy and considered at the scale `VISION:AUDIENCE` describes — from an independent merchant to an eventual enterprise organization — without feeling cold, templated, or interchangeable with any other commerce tool. This is the visual expression of `VISION:NON_GOALS`'s rejection of the platform becoming "a website builder pretending to be an ERP."
- **Fast, in perception as much as in fact.** Interfaces must feel immediately responsive; this document's rules on loading states (`UI:LOADING_STATES`) and motion (`UI:MOTION_ANIMATION`) exist specifically to support perceived speed, not only actual speed, which is `09_ENGINEERING_STANDARD`'s concern.
- **Accessible by default, not by exception.** Detailed in `UI:ACCESSIBILITY`, but stated here as a philosophy: accessibility is a baseline property of every pattern in this document, not a separate compliance pass applied afterward.
- **Conversion-friendly.** The storefront exists to help a merchant sell — per `PRINCIPLES:MERCHANT_FIRST`, every storefront pattern in this document is evaluated on whether it helps a visitor find, understand, and complete a purchase, not merely on how it looks.
- **Highly configurable, never forked.** Per `PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`, a merchant's visual customization needs (`UI:THEME_SYSTEM`) are met through configuration of this system's tokens, never through a merchant-specific fork of the interface.
- **One design language, two frontends.** The storefront and admin interface are built on different rendering approaches (`ARCH:TECHNOLOGY_DECISIONS` §9.2) for reasons specific to their audiences, but per `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` they share one design system — a person who understands one should recognize the other as clearly part of the same product.

---

# 5. Visual Hierarchy

**Identifier: UI:VISUAL_HIERARCHY**

Every interface communicates what matters most through three levels of emphasis: **primary** (the one thing a screen wants the person to notice or do first — a main action, the central piece of information a screen exists to convey), **secondary** (supporting information or actions relevant to the primary emphasis, but not competing with it), and **tertiary** (available but deliberately de-emphasized — an option present for when it's needed, not vying for attention). A screen with more than one primary emphasis has failed this rule; a screen the platform expects a person to act on quickly cannot ask them to weigh several equally-loud options against each other.

This hierarchy is expressed through the token systems this document defines — color (`UI:COLOR_SYSTEM`), typography (`UI:TYPOGRAPHY`), and spacing (`UI:SPACING_SYSTEM`) — never through arbitrary per-screen choices. Attention flow (the order in which a person's attention is drawn across a screen) follows the same primary-to-tertiary logic: what the platform wants noticed first is emphasized first, and every other element is positioned and weighted in relation to it, not competing for the same initial attention.

This directly supports `UI:DESIGN_PHILOSOPHY`'s conversion-friendly and fast commitments — a storefront visitor or an operator should never have to work to figure out what a screen wants from them. This section defines the hierarchy and its rules; it does not describe any specific page's layout, which remains out of scope per `UI:SCOPE`.

---

# 6. Design Tokens

**Identifier: UI:DESIGN_TOKENS**

Every visual decision the platform makes — a color, a spacing value, a type size, a corner radius — is expressed as a named, reusable token, never as a one-off value chosen for a single screen. This is the design-system application of `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`: a token is defined once, referenced everywhere it applies, and changed once to propagate everywhere consistently — including through the theme system (`UI:THEME_SYSTEM`).

The categories of token this document establishes — color, typography, spacing, elevation, radius, and motion — are the platform's only source of visual truth. No module defines its own one-off value in place of an established token; where an existing token doesn't fit a genuine new need, the correct path is proposing a new token through this document, not inventing a local exception.

---

# 7. Color System

**Identifier: UI:COLOR_SYSTEM**

Color is organized around semantic roles, not literal palette values — this document defines that roles like primary, secondary, a neutral scale, and status colors (success, warning, danger, informational) exist and what each is for, not the specific values behind them, which belong to an implementation-level token definition. Every use of color in any interface refers to a semantic role, never a literal value chosen for one screen.

The color system must support theming (`UI:THEME_SYSTEM`) without redesign, and must meet the contrast requirements in `UI:ACCESSIBILITY` at every semantic role, in every theme — accessible contrast is a property the color system must hold everywhere it is used, not a check performed after the fact on a few screens.

---

# 8. Typography

**Identifier: UI:TYPOGRAPHY**

A small, deliberate type scale — a limited set of heading levels, body text, and supporting/meta text, each with a defined role in a page's hierarchy — replaces ad hoc font sizing decided per screen. This document defines the scale's roles and hierarchy rules, not a specific typeface, which is an implementation choice this document deliberately does not make.

Typography must remain legible at the smallest mobile viewport (per `UI:DESIGN_PHILOSOPHY`'s mobile-first commitment) and must accommodate the variable text length and script differences `UI:INTERNATIONALIZATION` requires without breaking the layout patterns in `UI:GRID_LAYOUT`.

---

# 9. Spacing System

**Identifier: UI:SPACING_SYSTEM**

A single spacing scale, built from one consistent base unit and its multiples, is used across every interface — no module invents its own spacing values. This is `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` applied to layout: the platform's rhythm should feel identical whether a person is looking at Catalog, Orders, or any future module's screens.

---

# 10. Density

**Identifier: UI:DENSITY**

The platform supports three density modes, each an application of `UI:SPACING_SYSTEM`'s scale rather than a separate system: **Comfortable** (the default — generous spacing suited to occasional or exploratory use, including most of the storefront and an operator's first experience of the admin interface), **Compact** (reduced spacing suited to an operator working through a task repeatedly, where screen efficiency starts to matter more than visual breathing room), and **Dense** (the least spacing, suited to specialists working with large data sets in tables (`UI:TABLES`) for extended periods, where seeing more rows at once outweighs comfort).

Density is a presentation adjustment, never a change to what information or capability is available — the same content and the same actions exist at every density, only their spacing changes. This directly serves `PRINCIPLES:OPERATIONAL_ACCESSIBILITY`: different operators have different needs depending on how they use the platform, and the platform should accommodate that without asking any of them to give up capability for comfort or vice versa.

---

# 11. Grid and Layout

**Identifier: UI:GRID_LAYOUT**

A shared layout grid — a defined column structure, gutter spacing (drawn from `UI:SPACING_SYSTEM`), and content-width behavior — is the structure every module's screens are composed within. Consistent with `UI:DESIGN_PHILOSOPHY`'s mobile-first commitment, the grid's smallest form factor is the default case every pattern must work within; larger viewports (`UI:RESPONSIVE_BREAKPOINTS`) add capability, they are never required for a screen to be usable.

---

# 12. Responsive Breakpoints

**Identifier: UI:RESPONSIVE_BREAKPOINTS**

The platform defines a limited, deliberate set of breakpoints platform-wide — a module never introduces its own breakpoint. Each breakpoint has a stated purpose (a mobile-class experience, a tablet-class experience, a desktop-class experience), and per the mobile-first philosophy (`UI:DESIGN_PHILOSOPHY`), the mobile-class experience is the complete, non-degraded baseline — larger breakpoints are additive enhancement, never a prerequisite for core functionality.

---

# 13. Elevation and Shadows

**Identifier: UI:ELEVATION_SHADOWS**

A small, deliberate set of elevation levels expresses layering hierarchy — that a modal sits above the page behind it, that a dropdown sits above the control that triggered it — consistently platform-wide. This document defines the levels and what each communicates, not the literal visual treatment implementing them.

---

# 14. Borders and Radius

**Identifier: UI:BORDERS_RADIUS**

A consistent border-weight and corner-radius scale is used across every component (`UI:COMPONENTS`) platform-wide, contributing directly to the "enterprise-grade, never generic" and "modern" commitments in `UI:DESIGN_PHILOSOPHY`. As with other token categories, this document establishes that the scale exists and how it is used, not its literal values.

---

# 15. Icons and Illustrations

**Identifier: UI:ICONS_ILLUSTRATIONS**

One consistent icon system — a single line weight, fill style, and size scale — is used platform-wide; no module introduces icons in a different visual style. The same discipline applies to illustration used in patterns like empty states (`UI:EMPTY_STATES`): one visual language, not ad hoc per-module art direction.

---

# 16. Motion and Animation

**Identifier: UI:MOTION_ANIMATION**

Motion is used purposefully — to communicate a state transition, confirm an action, or indicate progress — never decoratively. Excessive or gratuitous motion works directly against the "fast" and "enterprise-grade" commitments in `UI:DESIGN_PHILOSOPHY`: motion that exists for its own sake reads as slow and unserious, not modern.

Every use of motion must respect a reduced-motion preference where the person viewing the interface has expressed one, per the accessibility baseline in `UI:ACCESSIBILITY` — motion is never load-bearing for understanding what happened; it always accompanies a state change communicated some other way too (per `UI:FEEDBACK_STATES`), never the only signal of it.

---

# 17. Microinteractions

**Identifier: UI:MICROINTERACTIONS**

Every small interaction a person has with the interface — hovering over a control, pressing a button, toggling a setting, seeing a field validate as they type, confirming that an action succeeded — gives immediate, unambiguous feedback that the interaction registered. A control that gives no indication it was hovered, pressed, or toggled leaves a person unsure whether their action was received at all, which is a small-scale version of the silent failure `PRINCIPLES:EXPLICIT_FAILURE` exists to prevent.

This feedback is felt, not read — it is the difference between an interface that feels responsive and one that merely functions, directly supporting the "fast" commitment in `UI:DESIGN_PHILOSOPHY`. Inline validation and success confirmation specifically are the microinteraction-scale expression of `UI:FORMS` and `UI:FEEDBACK_STATES` — this section establishes that such feedback must exist and be immediate at the point of interaction, not only summarized after the fact. This section defines the philosophy and the categories of interaction that require feedback; it does not specify any animation's implementation, which `UI:MOTION_ANIMATION` and future implementation-level work govern.

---

# 18. Components

**Identifier: UI:COMPONENTS**

The design system defines a shared vocabulary of components — buttons, inputs, cards, modals, and the other recurring interface elements every module needs — along with the states and behavior each is expected to support. This document defines that vocabulary and its expected behavior, never a component's code implementation. Every module composes its screens from this shared vocabulary; a module inventing its own version of an already-defined component is exactly the inconsistency `PRINCIPLES:CONSISTENCY_OVER_NOVELTY` exists to prevent.

---

# 19. Forms

**Identifier: UI:FORMS**

Forms across the platform follow one consistent set of patterns: how a required field is indicated, when and where validation feedback appears, and how a successful submission is confirmed. Validation feedback must be immediate and specific enough to act on, per `PRINCIPLES:EXPLICIT_FAILURE` — a form that only indicates "something is wrong" without saying what has not met this document's standard.

Forms carry particular weight in this platform specifically because `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` depends on them — a form is how an operator configures the platform without engineering involvement, so form clarity and speed are not a cosmetic concern here.

---

# 20. Tables

**Identifier: UI:TABLES**

Data-dense modules rely heavily on tables, and the platform defines one consistent table pattern rather than letting each module invent its own: consistent visual affordances for the sorting and filtering capability `API:SORTING` and `API:FILTERING` already establish exists at the API layer, consistent pagination display reflecting `API:PAGINATION`, a defined approach to information density suited to operators working with large data sets, and a defined strategy for how a table adapts at the mobile breakpoint (`UI:RESPONSIVE_BREAKPOINTS`) rather than becoming unusable there.

---

# 21. Navigation

**Identifier: UI:NAVIGATION**

The admin interface and the storefront each have a consistent navigation pattern appropriate to their audience: the admin's navigation must scale to a growing number of modules (`04_MODULE_ARCHITECTURE`) without becoming unusable to an operator trying to find something, while the storefront's navigation is evaluated first against `UI:DESIGN_PHILOSOPHY`'s conversion-friendly commitment — helping a customer find what they came for. This document establishes that both have a defined, consistent pattern; it does not prescribe a specific menu structure, which depends on module content not yet built.

---

# 22. Feedback States

**Identifier: UI:FEEDBACK_STATES**

The platform has one consistent pattern for confirming success, surfacing a warning, or presenting an informational message to the person using it. Per `PRINCIPLES:EXPLICIT_FAILURE`, this cuts both directions: a successful action must be confirmed as clearly and consistently as a failure must be surfaced — silence after an action is never an acceptable feedback state.

---

# 23. Empty States

**Identifier: UI:EMPTY_STATES**

Every list or collection view has a defined empty-state pattern — a blank screen is never an acceptable outcome of having no data yet. An empty state guides the person toward their next reasonable action, consistent with `PRINCIPLES:OPERATIONAL_ACCESSIBILITY` on the admin side and the conversion-friendly commitment in `UI:DESIGN_PHILOSOPHY` on the storefront side (an empty search result should guide a customer toward another path forward, not end their visit).

---

# 24. Loading States

**Identifier: UI:LOADING_STATES**

A consistent loading pattern is used everywhere data is being fetched, sized and positioned so that the layout does not visibly shift once the content arrives. This is a direct contributor to the perceived-speed commitment in `UI:DESIGN_PHILOSOPHY` — no module invents its own loading treatment, and no view is ever left blank with no indication that something is happening.

---

# 25. Error States

**Identifier: UI:ERROR_STATES**

The platform has one consistent pattern for rendering the structured errors `API:ERROR_MODEL` already defines at the API layer. This document's job is to make sure every error a caller's API returns is rendered consistently and understandably to the person seeing it — never a generic, unhelpful failure message when the underlying API error was specific and actionable.

---

# 26. Accessibility

**Identifier: UI:ACCESSIBILITY**

Accessibility is a non-negotiable baseline of every pattern in this document, not a separate initiative layered on afterward. At minimum: every interactive element is reachable and operable by keyboard alone; every interface is usable with assistive technology such as a screen reader; color is never the only signal of meaning (status, error, or otherwise); contrast meets a defined minimum at every semantic color role (`UI:COLOR_SYSTEM`); focus state is always visible; and motion respects a stated reduced-motion preference (`UI:MOTION_ANIMATION`).

This baseline serves `PRINCIPLES:MERCHANT_FIRST` directly — a merchant's ability to serve every customer, and to employ every operator regardless of ability, is a real operational concern this document treats as such, not a compliance checkbox.

---

# 27. Internationalization

**Identifier: UI:INTERNATIONALIZATION**

Every pattern in this document must accommodate variable text length, right-to-left reading direction, and locale-specific formatting of dates, numbers, and currency, without requiring redesign when a new locale is introduced. This document does not choose any specific language or locale to support — it establishes that the system must never assume a single language or reading direction, consistent with `VISION:AUDIENCE`'s growing-business trajectory and the "highly configurable" commitment in `UI:DESIGN_PHILOSOPHY`.

---

# 28. Theme System

**Identifier: UI:THEME_SYSTEM**

The platform supports visual customization — at minimum a light and dark presentation, and merchant-level branding such as a primary color — entirely through the token system defined in `UI:DESIGN_TOKENS`. A merchant's visual customization need is met by adjusting tokens, never by forking or modifying the underlying component vocabulary (`UI:COMPONENTS`) — this is the direct visual-layer application of `VISION:NON_GOALS`'s rejection of customization that requires unrestricted core modification.

**Themes may change presentation but must never change interaction behaviour, information architecture, or business workflows.**

This rule exists because a theme is, by definition, a presentation-layer concept — the moment a theme is allowed to alter how something behaves, what order a workflow happens in, or where information lives in the platform's structure, it has stopped being a theme and become a second, divergent version of the product. A merchant using a customized theme and a merchant using the default must be able to follow the same instructions, complete the same workflows in the same order, and find the same information in the same place — only what it looks like may differ. This is also what keeps theming compatible with `04_MODULE_ARCHITECTURE`'s module boundaries and `UI:STABILITY_LEVELS`: a theme operates entirely within the presentation layer this document governs, and never reaches into behavior that belongs to a module's own logic.

---

# 29. Design Stability Levels

**Identifier: UI:STABILITY_LEVELS**

Mirroring `MODULE:STABILITY`, every token category and component is assigned a stability classification governing how freely it may change:

- **Core** — foundational tokens nearly everything else depends on: the color system's semantic roles, the typography scale, the spacing scale. A breaking change requires the same elevated justification `MODULE:STABILITY` requires of a Core module.
- **Stable** — the core component vocabulary (buttons, inputs, tables, navigation patterns) — depended upon widely, expected to change slowly, breaking changes possible but not routine.
- **Evolvable** — patterns still being refined as real modules are built against them (forms, feedback states, empty/loading/error state treatments) — may change through ordinary review without elevated justification.
- **Experimental** — new patterns not yet proven across more than one module (for example, this document's initial motion and illustration guidance) — may change freely until proven, the same logic `MODULE:STABILITY` applies to a newly-defined mechanism like `MODULE:EXTENSIBILITY_MECHANISM`.

---

# 30. Review Checklist

**Identifier: UI:REVIEW_CHECKLIST**

Before any new UI pattern or component is considered ready for implementation, it must satisfy:

- [ ] Every visual value it uses is an established token (`UI:DESIGN_TOKENS`), not a one-off value.
- [ ] It has exactly one primary emphasis, with secondary and tertiary elements clearly subordinate (`UI:VISUAL_HIERARCHY`).
- [ ] It functions completely at the mobile breakpoint before any larger breakpoint is considered (`UI:RESPONSIVE_BREAKPOINTS`).
- [ ] It behaves correctly across all three density modes without losing content or capability (`UI:DENSITY`).
- [ ] It meets the accessibility baseline in full — keyboard operability, screen-reader support, contrast, visible focus, reduced-motion respect (`UI:ACCESSIBILITY`).
- [ ] It accommodates variable text length and right-to-left layout without breaking (`UI:INTERNATIONALIZATION`).
- [ ] It reuses an existing component from `UI:COMPONENTS` rather than introducing a near-duplicate, unless a genuine new need has been identified and proposed as an addition to this document.
- [ ] Every interactive element gives immediate, unambiguous feedback on hover, press, and toggle (`UI:MICROINTERACTIONS`).
- [ ] Its loading, empty, and error states are defined, not left as an afterthought (`UI:LOADING_STATES`, `UI:EMPTY_STATES`, `UI:ERROR_STATES`).
- [ ] It works correctly under theming, including dark mode, and changes only presentation — never interaction behavior, information architecture, or workflow (`UI:THEME_SYSTEM`).
- [ ] Its stability level is explicit (`UI:STABILITY_LEVELS`).

---

# 31. Acceptance Criteria

**Identifier: UI:ACCEPTANCE_CRITERIA**

This document is ready for Accepted status only when:

1. It has been reviewed for internal consistency and consistency with `00`–`04`.
2. No page layout, component code, CSS, or framework-specific detail appears anywhere in the document.
3. Every token category and pattern has a stated purpose traceable to `01_PRODUCT_VISION` or `02_PRODUCT_PRINCIPLES`, not introduced as unexplained preference.
4. The Product Owner has confirmed this document does not constrain the product beyond what `03_SYSTEM_ARCHITECTURE` and `04_MODULE_ARCHITECTURE` already do.

Individual UI patterns and components built later are considered acceptable only when they satisfy the Review Checklist in `UI:REVIEW_CHECKLIST` in full.

---

End of Document

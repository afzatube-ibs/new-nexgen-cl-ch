# neXgen Core

An independent, enterprise-grade Commerce Operating System — built from scratch, not based on any existing ecommerce platform.

## Project Status

**Phase:** Documentation & Architecture
**Implementation:** Not yet authorized

neXgen Core is currently in its foundation-documentation phase. No implementation code exists yet. Every architectural, product, and engineering decision is being specified and reviewed as a formal document before any code is written. See [`docs/README.md`](docs/README.md) for the full documentation index and current status of each document.

## Why This Order

This project is deliberately documentation-first. Every module, API, and line of code that will eventually exist here must trace back to an accepted specification. This is not bureaucracy for its own sake — it exists to prevent the fragmentation and accumulated inconsistency that the project itself was created to solve for its future users. See [`docs/01_PRODUCT_VISION.md`](docs/01_PRODUCT_VISION.md) for why this project exists at all.

## Repository Structure

```
neXgen/
├── docs/           Governance, vision, and all foundation/architecture documents
│   ├── adr/        Architecture Decision Records
│   ├── decisions/  Other recorded project decisions
│   ├── diagrams/   Architecture and data-model diagrams
│   └── assets/     Supporting document assets
├── apps/           Deployable applications (empty until implementation is authorized)
├── packages/       Shared/internal packages and libraries (empty until implementation is authorized)
├── tooling/        Build and developer tooling (empty until implementation is authorized)
├── scripts/        Operational and maintenance scripts (empty until implementation is authorized)
├── tests/          Test suites (empty until implementation is authorized)
└── docker/         Container and local-development configuration (empty until implementation is authorized)
```

## Governance

This project follows a formal documentation hierarchy and review process defined in [`docs/00_PROJECT_GOVERNANCE.md`](docs/00_PROJECT_GOVERNANCE.md). No document is authoritative until it reaches **Accepted** status, and no lower-level document may contradict a higher-level one.

## License

See [`LICENSE`](LICENSE).

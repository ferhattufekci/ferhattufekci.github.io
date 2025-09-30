# Architecture Decision Records

**🇬🇧 English | [🇹🇷 Türkçe](README.tr.md)**

Each record states a decision that was actually taken in this repository, the context that
forced it, and what it costs. A record is written when a choice is not obvious from the code.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-static-site-no-framework.md) | Keep a static, framework-free site | Accepted |
| [0002](0002-exact-sha-release-gate.md) | Deploy only the exact SHA that was tested | Accepted |
| [0003](0003-recovery-observe-only.md) | Keep CI failure recovery observe-only | Accepted |
| [0004](0004-requirement-ids-in-test-titles.md) | Carry requirement ids in test titles and generate the matrix | Accepted |
| [0005](0005-validate-urls-at-generation-time.md) | Validate third-party URL schemes when data is generated | Accepted |

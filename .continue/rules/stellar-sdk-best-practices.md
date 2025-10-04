---
globs: "**/*.{ts,tsx}"
regex: "@stellar/stellar-sdk"
---

Always use direct imports from @stellar/stellar-sdk instead of dynamic constructor resolution. Use StellarSdk.Horizon.Server for server instances.
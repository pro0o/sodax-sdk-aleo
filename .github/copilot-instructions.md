# Sodax SDK Codebase Instructions for AI Agents

## Project Overview

Sodax Frontend is a monorepo containing multi-chain wallet SDKs and the Sodax protocol ecosystem implementation. The **core product composition**:

- **@sodax/sdk**: Main protocol SDK exposing swaps (intent solver), money market, bridging, migration, and staking across 9+ blockchains
  - Feature modules: `swap/`, `moneyMarket/`, `bridge/`, `migration/`, `staking/`
  - Shared entities: `shared/entities/` containing chain-specific spoke providers (AleoSpokeProvider, IconSpokeProvider, etc.)
  - Each spoke provider wraps wallet-sdk-core providers with protocol-specific logic
- **@sodax/wallet-sdk-core**: Multi-chain wallet provider abstraction (EVM, Sui, Solana, Stellar, Injective, ICON, Aleo)
- **@sodax/wallet-sdk-react**: React-specific wallet connectivity layer with state management
- **@sodax/dapp-kit**: Utility layer for React/Next.js apps combining SDK + wallet integration
- **@sodax/types**: Shared TypeScript type definitions across all packages
- **apps/web**: Next.js frontend application using all SDKs
- **apps/demo**: Vite-based demo application
- **sdk/** (root): In-repo Provable Aleo SDK (`@provablehq/sdk`) - canonical source for Aleo
- **aleo-dev-toolkit/**: In-repo Aleo wallet adapters and types - canonical source for Aleo wallets

## Architecture & Build System

### Monorepo Structure
- **Build tool**: Turbo with pnpm workspaces  
- **Task orchestration**: `turbo.json` defines `build`, `build:packages`, `test`, `lint`, `checkTs`, `dev`
- **Key scripts**: `pnpm build` builds all packages, `pnpm build:packages` rebuilds only SDKs, `pnpm test` runs all tests
- **Package format**: All SDKs use tsup with dual ESM/CJS exports + type definitions

### Critical Developer Workflows

```bash
# Setup
pnpm install
pnpm dev                    # Watch mode for all packages
pnpm build                  # Build all (dependencies first)
pnpm build:packages         # Rebuild only SDK packages (faster iteration)

# Quality gates (run before PR)
pnpm lint                   # Biome lint + fix
pnpm pretty                 # Biome format
pnpm checkTs                # TypeScript type check
pnpm test                   # Vitest suite

# Git workflow
# - Branch from main, create PR → main (squash merge)
# - QA tests on sodax-web-dev.vercel.app
# - main → staging → production (normal merge)
```

## Code Quality & Conventions

### TypeScript & Linting
- **Strict mode enforced**: No `any`, no non-null assertions (`!`), explicit return types required
- **Biome rules** (lines 2 spaces, 120 char width, single quotes, no imports without use):
  - `useImportType: warn` for type imports
  - `noNonNullAssertion: error`, `noExplicitAny: error`, `noImplicitAnyLet: error`
  - `useTemplate: error` for string templates, `noUselessElse: error`
- **File header**: Each source file starts with a one-line comment: `// packages/wallet-sdk-react/src/actions/connect.ts`

### File Structure Patterns

**SDK packages** (`wallet-sdk-core`, `wallet-sdk-react`, `dapp-kit`):
```
src/
  index.ts           # Main exports
  types/             # Type definitions  
  {domain}/          # Feature domains (e.g., actions, hooks, providers)
    index.ts
    [Feature].ts
  utils/             # Utility functions
  core/              # Core abstractions/logic
```

**@sodax/sdk specifically** (`packages/sdk`):
```
src/
  swap/              # Intent-based swap features
  moneyMarket/       # Lending/borrowing features
  bridge/            # Cross-chain bridging
  migration/         # Token migration
  staking/           # SODA staking
  shared/
    entities/        # Chain-specific spoke providers
      icon/IconSpokeProvider.ts
      sui/SuiSpokeProvider.ts
      aleo/AleoSpokeProvider.ts
      ...            # One per supported chain
    constants.ts
    config/
```

**wallet-sdk-react specifically**:
```
src/
  SodaxWalletProvider.tsx     # Main context provider
  Hydrate.ts                  # SSR hydration support
  xchains/                    # Per-chain adapters (evm/, sui/, solana/, etc.)
  actions/                    # Redux-like actions for wallet state
  hooks/                      # React hooks (useXConnect, useXConnectors, useXAccount)
  core/                       # Core wallet logic and state
  types/                      # Chain-specific types merged at root
  utils/                      # Chain-agnostic utilities
  useXWagmiStore.ts           # Wagmi store wrapper (for EVM)
```

## Multi-Chain Architecture

### Chain Adapter Pattern
- Each chain (EVM, Sui, Solana, Stellar, Injective, ICON, Aleo) has a dedicated adapter
- Adapters expose unified connectors/wallet interfaces through `wallet-sdk-react`
- **Key files**: `xchains/{chain}/` in wallet-sdk-react
- State management: **Zustand** for chain-specific state, **React Query** for async data

### Provider Pattern
- `SodaxWalletProvider` wraps the app and manages multi-chain wallet connections
- Chain providers initialized in order: EVM (wagmi) → Sui (dapp-kit) → others
- Wallet detection: EVM uses EIP-6963 standard discovery

### Type System
- `ReturnType` and `PublicClient` patterns used for chain-specific implementations
- No type wrapping/renaming—use original chain SDK types directly
- Shared types in `@sodax/types` (address formats, transaction types, etc.)

## Aleo-Specific Rules

**Source of Truth**: In-repo implementations take absolute precedence over published packages.

### For wallet-sdk-react (Aleo implementation)
**Location**: `packages/wallet-sdk-react/src/xchains/aleo/`

- Reference in-repo `aleo-dev-toolkit` packages as canonical source:
  - `aleo-dev-toolkit/packages/aleo-wallet-adaptor/{core,react,react-ui,wallets}`
  - `aleo-dev-toolkit/packages/aleo-wallet-standard`
  - `aleo-dev-toolkit/packages/aleo-types`
- **Published packages** (@provablehq/aleo-wallet-adaptor-*, @provablehq/aleo-types) → compiled artifacts only
- Match existing adapter patterns used by other chains (EVM, Sui, Solana, etc.)
- Support all features exposed by in-repo Aleo adapters
- Introduce no new abstractions, naming conventions, or flow changes
- If APIs diverge: adjust wallet-sdk-react to align, never modify in-repo Aleo adapters

### For wallet-sdk-core (Aleo implementation)
**Location**: `packages/wallet-sdk-core/src/wallet-providers/aleo/`

- Reference in-repo paths as canonical:
  - `sdk/` (root folder - Provable Aleo SDK)
  - `aleo-dev-toolkit/packages/aleo-types`
- **Published packages** (@provablehq/sdk, @provablehq/aleo-types) → compiled artifacts only
- Use Aleo SDK types directly without redefining/renaming
- Match core abstractions/patterns used by other chains (no new patterns)
- If APIs differ: adjust wallet-sdk-core to align with Aleo SDK

### For AleoSpokeProvider (protocol integration)
**Location**: `packages/sdk/src/shared/entities/aleo/`

- Treat in-repo Provable Aleo SDK as single source of truth:
  - `sdk/` (root folder containing @provablehq/sdk)
  - `aleo-dev-toolkit/packages/aleo-types`
- **Published packages** (@provablehq/sdk, @provablehq/aleo-types) → compiled artifacts only
- Match provider/connector patterns used by other spoke providers (Icon, Sui, Solana, etc.)
- Fully support all Aleo SDK features and types
- Introduce no new abstractions unless already in Aleo SDK
- If behavior differs: update AleoSpokeProvider to match SDK, never adapt SDK to fit provider assumptions

## Key Dependencies & Integration Points

**Peer dependencies (apps must provide)**:
- React ≥19, @tanstack/react-query latest (for wallet-sdk-react/dapp-kit)

**Critical chain integrations**:
- **EVM**: wagmi 2.x, viem 2.x, EIP-6963 wallet detection
- **Sui**: @mysten/dapp-kit, @mysten/sui, @mysten/wallet-standard
- **Solana**: @solana/wallet-adapter-react, @solana/web3.js
- **Stellar**: @creit.tech/stellar-wallets-kit, @stellar/stellar-sdk
- **Injective**: @injectivelabs/sdk-ts, @injectivelabs/wallet-* modules
- **ICON**: icon-sdk-js
- **Aleo/Provable**: @provablehq/sdk, @provablehq/aleo-wallet-adaptor-*

**State Management**: Zustand for wallet state, React Query for server state, immer for immutable updates

## Coding Process

1. **Understand first**: Read the chain adapter pattern in existing chains before implementing new features
2. **One file at a time**: Complete file fully before moving to next (document incomplete work with `TODO:` comments)
3. **Test locally**: `pnpm build:packages` then `pnpm dev` to verify watch mode works
4. **CI gates**: All PRs must pass `lint`, `checkTs`, `test` before merge
5. **Commit message**: Follow conventional commits (feat:, fix:, docs:, etc.)
6. **No documentation files**: Do NOT create separate docs, READMEs, or summary markdown files - summarize conclusions directly in chat

## Common Patterns in This Codebase

| Pattern | Location | Example |
|---------|----------|---------|
| Spoke providers | packages/sdk/src/shared/entities/{chain}/ | Each chain has SpokeProvider wrapping wallet-sdk-core provider |
| Provider initialization | SodaxWalletProvider.tsx | Chain providers composed with error handling |
| Wallet hooks | hooks/useX* | `useXConnect`, `useXAccount`, `useXConnectors` |
| Chain detection | xchains/{chain}/detector.ts | EIP-6963 for EVM, wallet selection for others |
| Type unions | types/index.ts | `Address` type valid across chains |
| Error boundaries | core/errors.ts | Chain-specific error standardization |
| State persistence | utils/storage.ts | localStorage for wallet connections |

---

For questions on specific implementations, start by finding the corresponding chain adapter in wallet-sdk-react/src/xchains as a reference pattern.

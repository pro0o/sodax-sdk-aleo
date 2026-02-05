---
applyTo: "packages/wallet-sdk-react/"
---

## Source of Truth

aleo-wallet-react-source-of-truth = "in-repo"

When working on **any Aleo-related code** inside `wallet-sdk-react`:

- Treat the **in-repo `aleo-dev-toolkit`** as the **canonical source of truth**
- Always reference the following **in-repo paths** for correctness and design alignment:

  - `packages/aleo-wallet-adaptor/core`
  - `packages/aleo-wallet-adaptor/react`
  - `packages/aleo-wallet-adaptor/react-ui`
  - `packages/aleo-wallet-adaptor/wallets`
  - `packages/aleo-wallet-standard`
  - `packages/aleo-types`

- Published packages  
  (`@provablehq/aleo-wallet-adaptor-*`, `@provablehq/aleo-wallet-standard`, `@provablehq/aleo-types`)  
  **must be treated strictly as compiled artifacts**, not design or behavioral references.

---

## Implementation Rules

The Aleo implementation in `wallet-sdk-react` **must**:

- Match existing **adapter and connector patterns** used by other chains
- Support **all features** exposed by the in-repo Aleo adapters
- Introduce **no new abstractions, naming conventions, or flow changes**
  unless they already exist in the in-repo implementation

If behavior or APIs differ:
- **Prefer the in-repo implementation**
- **Adjust `wallet-sdk-react` to align**
- Do **not** change the in-repo Aleo adapters to fit `wallet-sdk-react`

---

## Documentation Constraints

- **Do NOT** create separate docs, READMEs, or summary files
- Any conclusions or notable changes should be **summarized directly in chat**
- No markdown reports or additional documentation artifacts

---

## Lint / Rules

- Ensure all Aleo-related code in `wallet-sdk-react` passes existing linting rules
- No new linting rules specific to Aleo should be introduced

---

## Coding Style

- Each file **must start** with its `path/filename` as a one-line comment
- Comments should describe **purpose first**, effects only when necessary
- Prioritize:
  - Modularity
  - DRY principles
  - Performance
  - Security

---

## Coding Process

- Show **concise, step-by-step reasoning**
- Clearly **prioritize tasks/steps** addressed in each response
- **Finish one file before moving to the next**
- If a file cannot be completed, add clear `TODO:` comments
- If interrupted, explicitly ask to continue
- No extra commentary beyond what is necessary
---
applyTo: "packages/sdk/shared/entities"
---

## Source of Truth

aleo-spoke-provider-source-of-truth = "provable-sdk (in-repo)"

When working on **AleoSpokeProvider** or any Aleo-specific provider logic:

Treat the **in-repo Provable Aleo SDK** as the **canonical source of truth**

- Always reference the following **in-repo paths** for correctness and design alignment:

  - `provablehq/sdk`
  - `provablehq/aleo-types inside root/aleo-dev-toolkit` 

- Published packages  
  (`@provablehq/sdk`, `@provablehq/aleo-types inside /aleo-dev-toolkit`)  
  **must be treated strictly as compiled artifacts**, not design or behavioral references.

---

## Implementation Rules

The Aleo implementation in `AleoSpokeProvider` **must**:

- Match existing **provider/connector patterns/abstractions** already used by other chains
- Support **all features** exposed by the in-repo the Provable Aleo SDK
- Introduce **no new abstractions, naming conventions, or flow changes**
  unless they already exist in the in-repo implementation

If behavior or APIs differ:
- **Prefer the in-repo implementation**
- **Adjust `AleoSpokeProvider` to align**
- Do **not** change the in-repo Aleo adapters to fit `AleoSpokeProvider`

---

## Documentation Constraints

- **Do NOT** create separate docs, READMEs, or summary files
- Any conclusions or notable changes should be **summarized directly in chat**
- No markdown reports or additional documentation artifacts

---

## Lint / Rules

- Ensure all Aleo-related code in `packages/sdk/shared/entities` passes existing linting rules
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
# Instructions

## 0. Context Restoration

When starting a new session or restoring context, read `docs/blog.md` to understand recent updates, current progress, and any pending tasks.

## 1. Architectural & Coding Standards

### The Twelve-Factor App Principles (Cloud-Native Architecture)
* **Statelessness:** The Agent is a dumb, stateless execution node. NEVER store configuration or state permanently on the Agent's local file system unless explicitly designed as a temporary cache.
* **Config via Env:** All plugin inputs and external configurations MUST be passed via Environment Variables. Do not hardcode URLs, credentials, or paths in the codebase.
* **Control Plane vs. Edge:** The Server is the single source of truth (Control Plane). It dictates what the Agent does. The Agent must never make assumptions about backend routing (e.g., hardcoding download URLs).

### Google Engineering Practices (Code Quality)
* **Readability > Cleverness:** Write code for humans to read, not just for machines to execute. Avoid overly clever one-liners if they sacrifice clarity.
* **No Premature Abstraction:** Apply the "Rule of Three". Do NOT create heavy generic frameworks, abstract interfaces, or base classes for a single use case. Build lightweight SDKs/utilities instead of heavy Inversion-of-Control (IoC) frameworks.
* **Explicit Error Handling:** NEVER swallow errors. If an error occurs, it must be handled or returned with full context (e.g., `fmt.Errorf("failed to do X: %w", err)`).

### Language-Specific Guidelines
* **Golang (Backend & Agent):** Adhere strictly to the **Uber Go Style Guide**. Keep functions small and focused. Use pointers only when mutability or nil-checks are necessary; prefer passing structs by value for safety.
* **React/TypeScript (Frontend):** Adhere to the **Airbnb React/JSX Style Guide**. Strictly use Functional Components and Hooks. Ensure strict TypeScript typing. Avoid `any` unless absolutely necessary. Keep UI components visually decoupled from complex data-fetching logic.

## 2. Development Workflow Rules

### Planning & Execution
* **Describe First, Wait for Approval:** Before writing any code, describe your approach and wait for user approval.
* **Clarify Ambiguous Requirements:** If requirements are unclear or ambiguous, ask clarifying questions before writing code.
* **Plan Mode - No Code:** In Plan mode, do not write any code. Only describe the plan and approach.
* **Split Large Tasks:** If a task requires modifying more than 3 files, stop and split it into smaller tasks.

### Code Quality & Testing
* **English Only:** All code, variable names, comments, and documentation must be in English only.
* **Edge Cases & Tests:** After completing any code, list edge cases and suggest test cases to cover them.
* **Bug Fix TDD:** When encountering a bug, first write a test that reproduces it, then fix the code until the test passes.

### Continuous Improvement
* **Reflect on Corrections:** When corrected by the user, reflect on what was wrong and create a plan to avoid repeating the mistake.

## 3. Critical Policies & Safety Rules

### 📝 Documentation & Conventions
* **Documentation Synchronization:** All documents in the `docs/` directory are maintained in Chinese, with corresponding English translations in the `docs/en/` directory. When you update any document in `docs/`, you **MUST** simultaneously update its English counterpart in `docs/en/` to ensure content parity.
* **Adhere to Conventions:** You must also adhere to all rules and conventions outlined in `prompts/project.md`.

## 4. Multi-Level Settings

This file serves as the **project-level** settings. For module-specific settings, create a `CLAUDE.md` in the relevant subdirectory. For user-level global settings, use `~/.claude/CLAUDE.md`.

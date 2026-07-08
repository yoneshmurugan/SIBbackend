# Contributing to SIBbackend

Thank you for your interest in contributing to SIBbackend.  
This document outlines the contribution workflow, coding standards, and review process to ensure a smooth and consistent experience for all contributors.

---

## How to Fork & Clone the Repository

1. **Fork the repository**  
    Click the **Fork** button on the top-right of the repository page.

2. **Clone your fork locally**
    ```sh
    git clone https://github.com/<your-username>/SIBbackend.git
    cd SIBbackend
    ```

3. **Add the upstream repository**
    ```sh
    git remote add upstream https://github.com/prem-ramamoorthy/SIBbackend.git
    ```

4. **Keep your fork updated**
    ```sh
    git fetch upstream
    git checkout main
    git merge upstream/main
    ```

---

## Branch Naming Convention

- Always create a new branch for your work.
- **Format:**  
  `<type>/<short-description>`

  **Examples:**
  - `feature/add-event-api`
  - `fix/member-auth-bug`
  - `docs/update-readme`
  - `refactor/middleware-cleanup`

**Rules:**
- Do **NOT** commit directly to `main`
- One feature or fix per branch

---

## Commit Message Format

- Follow a clear and consistent commit message format.
- **Format:**  
  `<type>: <short summary>`

  **Types:**
  - `feat` – New feature
  - `fix` – Bug fix
  - `docs` – Documentation changes
  - `refactor` – Code refactoring
  - `chore` – Maintenance tasks

  **Examples:**
  - `feat: add reports route for admin users`
  - `fix: resolve session validation issue`
  - `docs: update contribution guidelines`

---

## Pull Request (PR) Guidelines

Before submitting a PR, ensure:

- Your code compiles and runs locally
- No unrelated changes are included
- Code follows project structure and conventions
- You have rebased your branch with the latest `main`

**PR Title Format:**  
`<type>: <clear description>`

  **Example:**  
  `feat: implement reports module APIs`

**PR Description Must Include:**
- What problem the PR solves
- What changes were made
- Related issue number (e.g., Closes #12)
- Screenshots or logs (if applicable)

---

## Code Style Rules

- Use **ES Modules only** (`.mjs`)
- Follow existing folder and file naming conventions
- Route files must follow: `<feature>Route.mjs`
- Keep business logic out of `app.mjs`
- Centralize:
  - Validation → `validators.mjs`
  - Schemas → `schemas.mjs`
  - Shared logic → `utils/` or `middlewares.mjs`
- Write readable, maintainable code over clever code

---

## How Mentors Review PRs

Mentors and maintainers review PRs based on:

- **Correctness**
  - Does the feature work as expected?
  - Are edge cases handled?
- **Code Quality**
  - Clear structure and naming
  - No duplication
  - Proper error handling
- **Architecture Compliance**
  - Follows domain-based routing
  - Uses shared utilities correctly
- **Commit & PR Hygiene**
  - Clean commit history
  - Meaningful PR description

**Review Outcomes:**
- ✅ **Approved** – Ready to merge
- 🔁 **Changes Requested** – Feedback must be addressed
- ❌ **Rejected** – Explanation provided

Contributors are encouraged to ask questions and iterate based on feedback.

---

## Communication & Support

- Use **GitHub Issues** for bugs and feature discussions
- Use **Pull Request comments** for code-specific questions
- Be respectful and constructive in all communications

---

## Code of Conduct

By contributing, you agree to follow the project’s Code of Conduct and maintain a welcoming, inclusive environment for everyone.

## React SPA Boilerplate

### Requirements

- [Node.js](https://nodejs.org) (version specified in [.nvmrc](./.nvmrc))
- [Nvm](https://github.com/nvm-sh/nvm) recommended for managing Node.js versions. On windows [Fnm](https://github.com/Schniz/fnm) can be used
- `npm` as package manager

### Code Quality & Linting

- **Biome** - JavaScript/TypeScript linting and formatting
- **Stylelint** - CSS linting with Tailwind CSS 4.0 support
- **Commitlint** - Enforces Conventional Commits format

### Git hooks
Removed commit-msg hook for simplicity, now only pre-commit hook is used
- `commit-msg` – runs `commitlint` (follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0)); each commit message should have a `[type]` prefix
- `pre-commit` – runs Biome and Stylelint on staged files (auto-fixes issues)

### Getting started

1. Clone the repo
2. Install dependencies: `npm install`
3. Ensure git hooks are executable
4. Update the title in [index.html](./index.html)
5. Replace [favicon.svg](./public/favicon.svg)
6. Create `.env` file (see [.env.example](./.env.example))

### Available scripts

- `npm run dev` – start dev server
- `npm run build` – build for production
- `npm run preview` – preview the build locally
- `npm run prepare` – set up Husky
- `npm run test` – run tests once
- `npm run test:watch` – run tests in watch mode
- `npm run lint` – check all code (Biome + Stylelint)
- `npm run lint:fix` – fix all code issues
- `npm run format` – format code with Biome
- `npm run lint:css` – check CSS only
- `npm run lint:css:fix` – fix CSS issues only

### Main libraries

- [Vite](https://vitejs.dev)
- [Shadcn](https://ui.shadcn.com) + [Tailwind](https://tailwindcss.com)
- [Sonner](https://sonner.emilkowal.ski)
- [React Router](https://reactrouter.com)
- [Axios](https://axios-http.com)
- [Auth0](https://auth0.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zod](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)
- [Vitest](https://vitest.dev)
- [React Testing Library](https://testing-library.com)
- [React PDF](https://react-pdf.org)
- [Framer Motion](https://www.framer.com/motion)

### Code Style Guidelines

TypeScript type conventions are documented in [`.mdc/types.mdc`](../.cursor/rules/types.mdc):

- ✅ Always use `type` instead of `interface`
- ✅ Sort properties by name length (shortest → longest)
- ✅ Place functions at the end of type definitions
- ✅ Use `const` arrow functions for components and handlers

See the MDC file for detailed examples and best practices.


### Commit Message Format (Conventional Commits)

This project follows the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification.

#### Structure:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Required Elements:

**Type** (REQUIRED):
- `feat` – A new feature (correlates with MINOR in SemVer)
- `fix` – A bug fix (correlates with PATCH in SemVer)
- `docs` – Documentation only changes
- `style` – Code style changes (formatting, missing semi-colons, etc; not CSS)
- `refactor` – Code change that neither fixes a bug nor adds a feature
- `perf` – Performance improvements
- `test` – Adding missing tests or correcting existing tests
- `build` – Changes that affect the build system or external dependencies
- `ci` – Changes to CI configuration files and scripts
- `chore` – Other changes that don't modify src or test files
- `revert` – Reverts a previous commit

**Scope** (OPTIONAL): A noun describing a section of the codebase, e.g., `(api)`, `(components)`, `(auth)`

**Description** (REQUIRED): A short summary in present tense. Not capitalized. No period at the end.

**Body** (OPTIONAL): Additional contextual information about the changes.

**Footer** (OPTIONAL): Information about breaking changes and reference issues.

#### Breaking Changes:

Use `BREAKING CHANGE:` in the footer or add `!` after the type/scope:

```bash
feat!: send email to customer when product is shipped
```

or

```bash
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

### ✅ Good Commit Examples:

**Simple commits:**
```bash
git commit -m "feat: add Stylelint for CSS linting"
git commit -m "fix: add alt text to Loader image"
git commit -m "docs: update README with new scripts"
```

**With scope:**
```bash
git commit -m "feat(auth): add OAuth2 authentication"
git commit -m "fix(api): resolve timeout issue in user endpoint"
git commit -m "refactor(components): convert functions to const"
```

**With breaking change:**
```bash
git commit -m "feat!: drop support for Node 16"
```

**With body and footer:**
```bash
git commit -m "fix: prevent racing of requests

Introduce a request id and a reference to latest request.
Dismiss incoming responses other than from latest request.

Refs: #123"
```

### ❌ Bad Commit Examples:

```bash
git commit -m "ini"                    # ❌ No type, unclear subject
git commit -m "update"                 # ❌ No type
git commit -m "feat"                   # ❌ No subject/description
git commit -m "Feat: new feature"      # ❌ Type should be lowercase
git commit -m "feat: New feature."     # ❌ Description should not be capitalized or end with period
```

### Commit Message Rules:
- Header (first line) max length: 100 characters
- Type must be lowercase
- Description must not be empty
- Description should use imperative, present tense: "change" not "changed" nor "changes"
- Description should not be capitalized
- Description should not end with a period


### CI pipeline

The monorepo pipeline builds and deploys the frontend in stages **build-frontend** and **deploy-frontend**. Build uses `npm install`, `npm run codegen`, and `npm run build`; `VITE_*` env vars come from the dotenv report (generate-dotenv-*). Deploy runs `aws s3 sync` and CloudFront invalidation. **Environments:** dev = branch `main`, staging = branch `release/*`, production = tag `release/*`. See root [SETUP.md](../SETUP.md) and [.github/workflows/](../.github/workflows/) for the full pipeline.
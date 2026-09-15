# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

The architecture and product rationale live in [README.md](README.md). This file is
only about **working here without breaking things** — principally the traps that
have already cost real debugging time.

---

## Two runtimes, one codebase

| | Desktop | Browser |
|---|---|---|
| Host | Electron main process | Web page |
| Database | sql.js on the filesystem | sql.js (WASM) + IndexedDB |
| `window.api` provided by | `src/preload/index.ts` (IPC) | `src/renderer/core/ipc/web-api.ts` (real SQL) |

The renderer never touches a database. It talks to a `window.api` contract. That is
why one set of module code runs unchanged in both hosts. **Do not add code paths that
branch on "am I in Electron" for data access** — implement the domain in `web-api.ts`
and add a capability flag if the *runtime* genuinely cannot do the thing.

## Quality gates — run all of these before you claim something works

```bash
npx tsc --noEmit -p tsconfig.main.json
npx tsc --noEmit -p tsconfig.preload.json
npx tsc --noEmit -p tsconfig.renderer.json
npm test
npx vite build
```

Type-checking is split by target on purpose. `tsconfig.renderer.json` alone will not
catch a broken main-process build.

**Rebuilding is mandatory, not optional.** The desktop app runs compiled output from
`out/`, so an edit to `src/renderer/**` is invisible until you rebuild:

```bash
npx vite build     # renderer only
npm run build      # renderer + main + preload (required after touching src/main or src/preload)
```

If a change "does not show up", check the build time in the app's **Settings → About**
before debugging anything else. It is injected at build time for exactly this reason.

## Traps that have already bitten

### 1. The database schema is shared — never fork it

`src/shared/db/schema.ts` is the single source of truth, executed by **both** runtimes
through `src/shared/db/migrations.ts`. Adding a table or column means editing that one
file; both hosts pick it up. A second copy of the schema anywhere is a bug.

Migrations are append-only and go through `runMigrations()`. Never remove or rename an
existing migration: some user's database has already recorded it.

### 2. Renaming the app can silently destroy user data

The desktop app pins its data directory (see `src/main/index.ts`). Because each rename
changes that directory, there is a migration chain:

```ts
const APP_DATA_DIR = 'near'
const LEGACY_APP_DATA_DIRS = ['小零', 'ai-workspace'] as const
```

**If you rename the product again, append the previous directory to that list.** Skip
this step and every existing user's todos, notes and calendar vanish on upgrade, with
no error message.

### 3. Runtime-loaded assets need an explicit base path

`base: './'` in `vite.config.ts` makes *bundled* assets relative, but sql.js resolves
its `.wasm` file **at runtime**, so Vite cannot rewrite that URL. The base path is
therefore injected at build time (`__APP_BASE__`) and surfaced via
`src/renderer/core/build-info.ts` → `assetUrl()`.

Always resolve such assets through `assetUrl()`. Do not derive a path from
`window.location.pathname`: under a sub-path deployment (GitHub Pages serves this repo
at `/near/`) it produces `/near/near/sql-wasm.wasm`, and because static hosts answer
missing paths with `index.html`, the failure surfaces as WebAssembly's famously
unhelpful error:

```
expected magic word 00 61 73 6d, found 3c 21 64 6f
```

That means "you fetched HTML, not wasm" — it is a **path** bug, not a corrupted asset.
`tests/asset-url.test.ts` guards the two shapes that matter.

### 4. One import path per file, or Vite gives you two modules

Vite treats `@core/db/browser-db` and `../db/browser-db` as **different modules** for
the same file. Both get their own module state, which breaks anything holding module
level state (the database handle, for instance) and produces the confusing symptom of
one module having initialised while another reports it has not.

Keep the resolution style consistent within a file's import graph. This already broke
`main.tsx` vs `web-api.ts` once.

### 5. The UI component library is Base UI, not Radix

Components come from `@base-ui/react`. Radix-only props such as `asChild` and
`delayDuration` do nothing here and will fail type-checking. Use Base UI's composition
API instead (`render={<Button />}` on triggers, `delay={200}` on providers).

### 6. Test isolation does not come for free

`vi.resetModules()` resets modules but **not** IndexedDB, and `fake-indexeddb` is shared
across a test file. A test that assumes a clean database will silently read the previous
test's persisted data — it looks like a logic bug in application code when it is not.

Use the helpers in `tests/web-api.test.ts`: `bootFresh()` for a deterministic empty
database, and `bootFresh({ isolate: false })` to simulate a page reload with data
intact. Database/store names are imported from source rather than duplicated, so a
rename cannot desynchronise them.

### 7. `db.export()` serialises the whole database

Both runtimes export the entire database on write, which is fine at current sizes but
does not scale. In the browser this is mitigated by debouncing (400 ms) plus a flush on
`visibilitychange`/`pagehide` — do **not** call `persistNow()` on every keystroke or
render. Moving to incremental persistence is a known open task, not a finished one.

## Conventions

- **Comments explain why, not what.** Where a decision looks odd, record the reason: the
  cost of a surprising line is paid on every future read.
- **Chinese UI copy, English code.** Identifiers, comments and docs are English; the
  interface is currently Chinese (i18n is planned, not done).
- **State the truth in docs.** If something is unimplemented, say so in README rather
  than implying it works.
- **Commits** use `type: summary` (`feat` / `fix` / `docs` / `ci` / `chore`), and explain
  the *reasoning* — especially for anything that fixes a non-obvious bug.
- **Do not commit internal notes.** `.agent-notes/` holds planning drafts and is ignored
  on purpose. `docs/` is public and currently holds only README screenshots — published
  material, not working notes.

## Environment notes

In restricted sandboxes, `vite build`, `vitest`, `vite preview` and launching Electron
can fail with `spawn EPERM` because esbuild needs a child process. That is an
environment restriction, **not a code failure** — do not "fix" it by restructuring the
build. Background jobs often cannot receive the wider permissions that foreground
commands can.

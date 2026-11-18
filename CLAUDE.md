# CLAUDE.md

Read `docs/PLAN.md` first. It holds every agreed decision. Do not expand the scope beyond it. If something is unclear or a decision is missing, stop and ask instead of guessing.

## Rules

- Monorepo with pnpm workspaces: `apps/extension` (WXT + React + TS), `apps/web` (Next.js), `packages/core` (shared).
- Work directly on `main`. After each small, self-contained chunk (one feature, one fix, one file group), run the relevant checks, then commit with a clear conventional message (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) and push. Never make empty or cosmetic-only commits to inflate the count.
- Never commit API keys, `.env` files or secrets. User keys live only in the browser.
- Never add challenge or "Day N" badges anywhere.
- Before saying a chunk is done, run `pnpm typecheck`, `pnpm test` and `pnpm build` for the packages you touched.
- Keep dependencies minimal. Prefer provider REST APIs via `fetch` over heavy SDKs when that's simpler.
- Track progress by checking items off in `docs/TASKS.md`.

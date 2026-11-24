# jessyux repo

## Whisker Isles deploy rule (read before any deploy)

**Always commit and push before deploying Whisker Isles. Deploy only from `whisker-isles`, after pulling.**

1. `git checkout whisker-isles && git pull origin whisker-isles`
2. Make the change, run `node --test tests/*.cjs tests/*.mjs`
3. `git commit` and `git push origin whisker-isles`, and confirm `git status` shows nothing ahead or uncommitted
4. Only then: `node build-game.mjs && npx --yes wrangler@4 deploy`

**Why:** `wrangler deploy` uploads whatever files are on the machine, not what's on GitHub. On 24 Nov 2026 a session deployed commits that were never pushed. A later session then deployed from GitHub, which was a day behind, and wiped chat, rematch and the loading fix off the live game until it was rolled back.

- Never deploy from another branch, a worktree that isn't up to date with `origin/whisker-isles`, or uncommitted files.
- If a push is rejected because GitHub has newer commits, merge them in and test again before deploying. Never force-push.
- After deploying, report the Cloudflare version ID and the commit SHA it was built from.
- Live site: `whisker.jessyux.com` (Worker `whisker-isles`). To undo a bad deploy: `npx wrangler deployments list --name whisker-isles`, then `npx wrangler rollback <previous version id> --name whisker-isles`.

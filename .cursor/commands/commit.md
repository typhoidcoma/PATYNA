# Smart Commit

Run `git diff --cached` to review all staged changes. Then write a commit message following these rules:

- Use a concise subject line (imperative mood, ≤72 chars) that describes **why**, not just **what**
- If the change spans multiple concerns, add a blank line and bullet-point body
- Match the style of recent commits (run `git log --oneline -10` to check)
- Categorize the change: feat, fix, refactor, docs, chore, etc.
- Stage any unstaged files only if I explicitly ask — otherwise commit only what's already staged

After drafting the message, present it to me for review. **Do NOT run `git commit` automatically.** Wait for my explicit approval before committing.

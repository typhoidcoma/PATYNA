# Remove AI code slop

Check the diff against main, and remove all AI generated slop introduced in this branch.

This includes:

- Extra comments that a human wouldn't add or is inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted / validated codepaths)
- Casts to `any` to get around type issues
- Unnecessary `console.log` or `print` statements left behind
- Overly broad `except Exception` or bare `except:` blocks in Python when a narrower exception type is appropriate
- Redundant or auto-generated docstrings/JSDoc that just restate the function signature
- Unnecessary `isinstance` checks or type guards that the caller already guarantees
- Over-abstraction or wrapper functions that add indirection without value
- Any other style that is inconsistent with the file

Report at the end with only a 1-3 sentence summary of what you changed.

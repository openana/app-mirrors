# Issue tracker

## Location

Local markdown files under `.scratch/<feature>/`.

## How it works

1. **Create an issue:** Add a markdown file to `.scratch/<feature>/` (e.g., `.scratch/auth/add-login-form.md`).
2. **Track progress:** Update the file as work progresses.
3. **Close an issue:** Delete or archive the file when done.

## File format

Use whatever structure fits the task. A simple template:

```markdown
# Issue title

## Description

What needs to be done.

## Status

- [ ] Step 1
- [ ] Step 2
```

## Conventions

- One directory per feature or work stream
- Keep file names descriptive and kebab-case
- Agents should read `.scratch/<feature>/` to find current work items

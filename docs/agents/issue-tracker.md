# Issue Tracker

## Type: Local Markdown

Issues live as markdown files under `.scratch/` in this repository.

## Layout

```
.scratch/
└── <feature-or-bug-slug>/
    └── issue.md
```

## How agents interact

- **Create an issue**: write a new `issue.md` under `.scratch/<slug>/`
- **List issues**: read all files matching `.scratch/*/issue.md`
- **Update an issue**: edit the relevant `issue.md` in place (add triage label in frontmatter)
- **Close an issue**: move the folder to `.scratch/done/<slug>/` or add `status: done` to frontmatter

## Issue file format

```markdown
---
title: Short description
status: needs-triage
created: YYYY-MM-DD
---

## Problem

What is broken or missing.

## Expected behaviour

What should happen instead.

## Steps to reproduce (if applicable)

1. …
```

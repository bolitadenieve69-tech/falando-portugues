# Triage Labels

These are the five canonical triage states used in this project.
For local-markdown issues they appear as the `status:` field in frontmatter.

| Role | String | Meaning |
|------|--------|---------|
| Needs evaluation | `needs-triage` | A maintainer must review this issue before anything else |
| Waiting on reporter | `needs-info` | Blocked — more information is needed from the person who filed it |
| Ready for an agent | `ready-for-agent` | Fully specified; an AFK agent can pick it up with no human context |
| Ready for a human | `ready-for-human` | Fully specified but requires human judgement or implementation |
| Won't fix | `wontfix` | Acknowledged but will not be actioned |

## Usage

When triaging, set `status:` in the issue frontmatter to one of the strings above.
When an issue is resolved, set `status: done`.

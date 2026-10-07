# Project instructions

@AGENTS.md

AGENTS.md is the canonical repository rule source. Do not duplicate its rules here.
Read applicable nested instructions before editing their files.

For shared UI creation or API/behavior changes, load
`.claude/skills/shared-ui-component/SKILL.md` on demand.
Do not import the entire skill into this file: routine tasks should only load the
workflow when relevant.

If an import is unavailable in the current client, read AGENTS.md explicitly
before making changes. Use the actual repository and current phase specification;
planned paths do not imply that implementation already exists.

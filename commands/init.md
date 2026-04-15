---
description: Initialize project - analyzes structure, creates AGENTS.md, sets up multi-agent system and memory
agent: coordinator
---

Initialize this project with OpenCode:

1. Analyze project structure and create AGENTS.md with project insights
2. Create .opencode/ directory if not exists
3. Create .opencode/agents/ and symlink to global agents (advisor, builder, reviewer, coordinator)
4. Create .opencode/memory/ directory for session dumps
5. Create .opencode/memory-meta.json with project config
6. Update global memory index (~/.config/opencode/memory/index.json)
7. Show confirmation of setup

This extends the default /init with multi-agent system and memory setup.
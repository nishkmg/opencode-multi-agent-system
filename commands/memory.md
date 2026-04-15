---
description: Memory system - Usage: /memory [search|recall|index] [query|project-name]
agent: coordinator
---

Manage cross-project memory system.

Usage:
- `/memory search [query]` - Search all project memories for a pattern
- `/memory recall [project]` - Load a specific project's memory
- `/memory index` - Update the global memory index

1. For search: Search through all .opencode/memory/ files in known projects
2. For recall: Load the project's summary.md file
3. For index: Scan projects and update the global index

Global index is at: ~/.opencode/memory/index.json
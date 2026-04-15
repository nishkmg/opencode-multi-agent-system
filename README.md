# OpenCode Multi-Agent System

A powerful multi-agent delegation system with memory management for [OpenCode](https://opencode.ai).

## What This Solves

### The Problem
- Single-agent sessions become context-heavy and inefficient
- No standardized way to delegate complex tasks to specialized agents
- Session context is lost between sessions or when context overflows
- No cross-project memory to leverage past solutions

### The Solution
This system provides:
1. **Multi-Agent Delegation** — Pre-defined roles (advisor, builder, reviewer) that can invoke each other dynamically
2. **Persistent Memory** — Per-project memory with global index for cross-project recall
3. **Auto-Context Dumping** — Automatic session dumps at 70% context threshold
4. **Interactive Model Selection** — Easy model switching per agent role

## Features

### Agent Roles

| Agent | Role | Model (Default) | Purpose |
|-------|------|-----------------|---------|
| **coordinator** | primary | Sonnet 4.6 | Main agent that coordinates and delegates |
| **advisor** | subagent | Opus 4.6 | Deep analysis, architecture, reasoning |
| **builder** | subagent | Sonnet 4.6 | Implementation, code execution |
| **reviewer** | subagent | Haiku 4.5 | Validation, code review |

### Dynamic Delegation
Any agent can invoke any other agent when needed:
- Builder遇到复杂逻辑 → invokes @advisor for thinking
- Builder完成实现 → invokes @reviewer for validation
- Reviewer发现设计问题 → invokes @advisor for clarification

### Memory System

- **Per-project memory** — `.opencode/memory/` in each project
- **Global index** — `~/.config/opencode/memory/index.json` links all projects
- **Cross-project recall** — Search memories across all projects

### Auto Context Dumping

When session compacts (at ~70% context):
1. Current session dumped to `.opencode/memory/`
2. Project summary updated
3. Global index refreshed
4. Memory reference injected into compacted context

## Installation

### Quick Setup

```bash
# 1. Clone this repository
git clone https://github.com/nishant-jha/opencode-multi-agent-system.git
cd opencode-multi-agent-system

# 2. Copy files to OpenCode config
cp -r agents ~/.config/opencode/
cp -r commands ~/.config/opencode/
cp -r plugins ~/.config/opencode/
cp -r memory ~/.config/opencode/
cp opencode.json ~/.config/opencode/

# 3. Restart OpenCode
opencode

# 4. Initialize a project
cd your-project
/init
```

### Manual Setup

If you prefer to add incrementally:

1. **Agents** — Copy `agents/` to `~/.config/opencode/agents/`
2. **Config** — Merge `opencode.json` into your existing config (or replace)
3. **Plugin** — Copy `plugins/` to `~/.config/opencode/plugins/`
4. **Commands** — Copy `commands/` to `~/.config/opencode/commands/`
5. **Memory** — Copy `memory/` to `~/.config/opencode/memory/`

## Usage

### Initialize a Project

```bash
opencode
/init
```

This will:
- Analyze project structure
- Create AGENTS.md
- Set up memory directory
- Link agents
- Update global index

### Invoke Agents

Use `@mention` to invoke subagents:

```
@advisor analyze this requirements document and design the architecture
@builder implement the authentication system based on the design
@reviewer validate the implementation for security and best practices
```

### Change Agent Models

```bash
/set-agent advisor anthropic-billing/claude-opus-4-6
```

Or use the plugin tool directly:
```
set-agent advisor
```

### Memory Commands

```bash
# Search across all project memories
/memory search auth pattern

# Recall specific project memory
/memory recall project-name

# Update global index
/memory index
```

Or use plugin tools:
```
memory-search "auth pattern"
memory-recall my-project
dump-memory "session summary"
```

### Custom Tools Available

| Tool | Purpose |
|------|---------|
| `set-agent` | Set model for agent role |
| `memory-search` | Search memories across all projects |
| `memory-recall` | Load specific project memory |
| `dump-memory` | Manual session dump |
| `memory-index` | Update global memory index |
| `list-agents` | List all agent configs |

## Configuration

### Customizing Models

Edit agent files in `~/.config/opencode/agents/`:

```yaml
---
name: advisor
model: your-provider/your-model
---
```

### Adding Custom Agents

1. Create agent file in `~/.config/opencode/agents/`
2. Add to `delegation` in `opencode.json`
3. Agents can invoke your custom agent via `@your-agent`

### Providers

The config includes these providers by default. Add your own in `opencode.json`:

```json
"provider": {
  "your-provider": {
    "npm": "@ai-sdk/your-sdk",
    "models": {
      "your-model": { "name": "Your Model" }
    }
  }
}
```

## Project Structure

```
~/.config/opencode/
├── agents/                    # Agent definitions
│   ├── advisor.md
│   ├── builder.md
│   ├── reviewer.md
│   └── coordinator.md
├── commands/                  # Custom commands
│   ├── init.md
│   ├── memory.md
│   └── set-agent.md
├── plugins/                   # Plugin with custom tools
│   └── agent-memory-system.ts
├── memory/                    # Global memory index
│   └── index.json
└── opencode.json              # Main config
```

## Memory Storage

### Per-Project (`.opencode/memory/`)

```
project/.opencode/memory/
├── session-2024-01-15.md     # Session dumps
├── session-2024-01-16.md
└── summary.md                # Project summary
```

### Global Index (`~/.config/opencode/memory/index.json`)

```json
{
  "projects": [
    {"path": "/path/to/projectA", "name": "ProjectA", "lastSession": "..."},
    {"path": "/path/to/projectB", "name": "ProjectB", "lastSession": "..."}
  ]
}
```

## Troubleshooting

### Agents not appearing

Restart OpenCode after adding agents:
```bash
opencode --restart
```

### Plugin not loading

Check plugin path in `opencode.json`:
```json
"plugin": ["./plugins/agent-memory-system.ts"]
```

Path must be relative to config directory.

### Memory search returns nothing

Ensure projects are indexed:
```bash
/memory index
```

Or use plugin tool:
```
memory-index
```

## Requirements

- OpenCode installed
- At least one LLM provider configured
- Node.js (for plugin dependencies)

## License

MIT License — feel free to use and modify.

## Credits

Built on [OpenCode](https://opencode.ai) — the open source AI coding agent.

---

For issues or contributions, visit: https://github.com/nishant-jha/opencode-multi-agent-system
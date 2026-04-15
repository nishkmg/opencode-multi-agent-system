---
description: Set model for an agent - Usage: /set-agent [agent-name] [model]
agent: coordinator
---

Update the model for agent `$1` to `$2` in the OpenCode config.

1. Read the current opencode.json
2. Update the agent's model field
3. Show confirmation

Available agents: coordinator, advisor, builder, reviewer
Available models: anthropic-billing/claude-opus-4-6, anthropic-billing/claude-sonnet-4-6, anthropic-billing/claude-haiku-4-5
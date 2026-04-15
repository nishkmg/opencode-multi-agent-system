import { type Plugin, tool, client } from "@opencode-ai/plugin"
import fs from "node:fs"
import path from "node:path"

const GLOBAL_CONFIG_DIR = path.join(process.env.HOME || "", ".config", "opencode")
const GLOBAL_MEMORY_INDEX = path.join(GLOBAL_CONFIG_DIR, "memory", "index.json")

interface AgentConfig {
  name: string
  description: string
  model: string
  mode: "primary" | "subagent"
}

interface ProjectMemory {
  path: string
  name: string
  lastSession: string
  summary?: string
}

interface MemoryIndex {
  projects: ProjectMemory[]
  lastUpdated: string
}

function getGlobalIndex(): MemoryIndex {
  try {
    if (fs.existsSync(GLOBAL_MEMORY_INDEX)) {
      return JSON.parse(fs.readFileSync(GLOBAL_MEMORY_INDEX, "utf-8"))
    }
  } catch {}
  return { projects: [], lastUpdated: new Date().toISOString() }
}

function saveGlobalIndex(index: MemoryIndex): void {
  const dir = path.dirname(GLOBAL_MEMORY_INDEX)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  index.lastUpdated = new Date().toISOString()
  fs.writeFileSync(GLOBAL_MEMORY_INDEX, JSON.stringify(index, null, 2))
}

function getProjectMemoryDir(projectPath: string): string {
  return path.join(projectPath, ".opencode", "memory")
}

function ensureProjectMemory(projectPath: string): void {
  const memDir = getProjectMemoryDir(projectPath)
  if (!fs.existsSync(memDir)) {
    fs.mkdirSync(memDir, { recursive: true })
  }
  const metaPath = path.join(projectPath, ".opencode", "memory-meta.json")
  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, JSON.stringify({
      projectPath,
      created: new Date().toISOString(),
      agentsLinked: ["advisor", "builder", "reviewer", "coordinator"]
    }, null, 2))
  }
}

async function searchInProject(projectPath: string, query: string): Promise<string[]> {
  const results: string[] = []
  const memDir = getProjectMemoryDir(projectPath)
  
  if (!fs.existsSync(memDir)) return results
  
  const files = fs.readdirSync(memDir)
  for (const file of files) {
    if (!file.endsWith(".md")) continue
    const filePath = path.join(memDir, file)
    const content = fs.readFileSync(filePath, "utf-8")
    if (content.toLowerCase().includes(query.toLowerCase())) {
      results.push(`## ${file} (${path.basename(projectPath)})\n${content.slice(0, 500)}...`)
    }
  }
  return results
}

async function getProjectSummary(projectPath: string): Promise<string | null> {
  const summaryPath = path.join(getProjectMemoryDir(projectPath), "summary.md")
  if (fs.existsSync(summaryPath)) {
    return fs.readFileSync(summaryPath, "utf-8")
  }
  return null
}

export const AgentMemorySystem: Plugin = async (ctx) => {
  const { directory: projectDir, client: appClient } = ctx
  
  // Initialize project memory on load
  ensureProjectMemory(projectDir)
  
  // Register project in global index if not present
  const globalIndex = getGlobalIndex()
  const projectName = path.basename(projectDir)
  const existingIndex = globalIndex.projects.findIndex(p => p.path === projectDir)
  
  if (existingIndex === -1) {
    globalIndex.projects.push({
      path: projectDir,
      name: projectName,
      lastSession: new Date().toISOString()
    })
    saveGlobalIndex(globalIndex)
  }

  return {
    // Custom tool: Interactive model selector
    tool: {
      "set-agent": tool({
        description: "Set model for an agent role",
        args: {
          agent: tool.schema.enum(["advisor", "builder", "reviewer", "coordinator"]).optional()
        },
        async execute(args, context) {
          const { directory: cwd } = context
          const agent = args.agent || "advisor"
          
          // Get available models from config
          const configPath = path.join(GLOBAL_CONFIG_DIR, "opencode.json")
          let availableModels: string[] = []
          
          try {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"))
            if (config.provider) {
              for (const [providerName, providerConfig] of Object.entries(config.provider)) {
                const pc = providerConfig as { models?: Record<string, { name: string }> }
                if (pc.models) {
                  for (const [modelKey, modelConfig] of Object.entries(pc.models)) {
                    const mc = modelConfig as { name: string }
                    availableModels.push(`${providerName}/${modelKey}`)
                  }
                }
              }
            }
          } catch {
            // Use defaults
            availableModels = [
              "anthropic-billing/claude-opus-4-6",
              "anthropic-billing/claude-sonnet-4-6", 
              "anthropic-billing/claude-haiku-4-5",
              "nvidiacustom/minimaxai/minimax-m2.7",
              "nvidiacustom/google/gemma-4-31b-it"
            ]
          }

          // For now, cycle through available models
          const currentModel = availableModels[Math.floor(Date.now() / 10000) % availableModels.length]
          
          // Update agent config
          const agentFilePath = path.join(GLOBAL_CONFIG_DIR, "agents", `${agent}.md`)
          if (fs.existsSync(agentFilePath)) {
            let content = fs.readFileSync(agentFilePath, "utf-8")
            // Update model line
            if (content.includes("model:")) {
              content = content.replace(/model:.*\n/, `model: ${currentModel}\n`)
              fs.writeFileSync(agentFilePath, content)
            }
          }
          
          return `Model for ${agent} set to ${currentModel}`
        }
      }),
      
      "memory-search": tool({
        description: "Search memories across all projects",
        args: {
          query: tool.schema.string()
        },
        async execute(args, context) {
          const { directory } = context
          const query = args.query
          const globalIndex = getGlobalIndex()
          const allResults: string[] = []
          
          for (const project of globalIndex.projects) {
            const results = await searchInProject(project.path, query)
            if (results.length > 0) {
              allResults.push(`\n# ${project.name}\n${results.join("\n\n")}`)
            }
          }
          
          if (allResults.length === 0) {
            return `No results found for "${query}"`
          }
          
          return allResults.join("\n\n---\n\n").slice(0, 3000)
        }
      }),
      
      "memory-recall": tool({
        description: "Load memory from a specific project",
        args: {
          project: tool.schema.string().optional()
        },
        async execute(args, context) {
          const { directory } = context
          const projectName = args.project || path.basename(directory)
          const globalIndex = getGlobalIndex()
          
          const project = globalIndex.projects.find(p => 
            p.name.toLowerCase() === projectName.toLowerCase() ||
            p.path.toLowerCase().includes(projectName.toLowerCase())
          )
          
          if (!project) {
            return `Project "${projectName}" not found in memory index`
          }
          
          const summary = await getProjectSummary(project.path)
          if (!summary) {
            return `No summary found for project "${projectName}"`
          }
          
          return `## Memory: ${project.name}\n\n${summary}`
        }
      }),
      
      "memory-index": tool({
        description: "Update global memory index",
        args: {},
        async execute(args, context) {
          const { directory } = context
          const globalIndex = getGlobalIndex()
          const projectName = path.basename(directory)
          
          const existingIndex = globalIndex.projects.findIndex(p => p.path === directory)
          if (existingIndex >= 0) {
            globalIndex.projects[existingIndex].lastSession = new Date().toISOString()
          } else {
            globalIndex.projects.push({
              path: directory,
              name: projectName,
              lastSession: new Date().toISOString()
            })
          }
          
          saveGlobalIndex(globalIndex)
          
          return `Global index updated with ${globalIndex.projects.length} projects`
        }
      }),
      
      "dump-memory": tool({
        description: "Dump current session context to memory",
        args: {
          summary: tool.schema.string().optional()
        },
        async execute(args, context) {
          const { directory } = context
          const memDir = getProjectMemoryDir(directory)
          ensureProjectMemory(directory)
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
          const sessionFile = path.join(memDir, `session-${timestamp}.md`)
          
          const summary = args.summary || `Session dumped at ${timestamp}`
          
          fs.writeFileSync(sessionFile, `# Session ${timestamp}\n\n${summary}\n`)
          
          // Update summary
          const summaryFile = path.join(memDir, "summary.md")
          const existingSummary = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf-8") : ""
          const newSummary = `# ${projectDir}\nLast updated: ${timestamp}\n\n${summary}\n\n---\n\n${existingSummary}`.slice(0, 5000)
          fs.writeFileSync(summaryFile, newSummary)
          
          // Update global index
          const globalIndex = getGlobalIndex()
          const projIdx = globalIndex.projects.findIndex(p => p.path === directory)
          if (projIdx >= 0) {
            globalIndex.projects[projIdx].lastSession = timestamp
            globalIndex.projects[projIdx].summary = summary
          }
          saveGlobalIndex(globalIndex)
          
          return `Session dumped to ${path.basename(directory)}/.opencode/memory/`
        }
      }),
      
      "list-agents": tool({
        description: "List all agents with their configs",
        args: {},
        async execute(args, context) {
          const agentsDir = path.join(GLOBAL_CONFIG_DIR, "agents")
          if (!fs.existsSync(agentsDir)) {
            return "No team agents found"
          }
          
          const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith(".md"))
          const result: string[] = ["# Team Agents\n"]
          
          for (const agentFile of ["coordinator.md", "advisor.md", "builder.md", "reviewer.md"]) {
            if (agents.includes(agentFile)) {
              const content = fs.readFileSync(path.join(agentsDir, agentFile), "utf-8")
              const name = agentFile.replace(".md", "")
              const descMatch = content.match(/description:.*?(?=\n)/)
              const modelMatch = content.match(/model:.*?(?=\n)/)
              const desc = descMatch ? descMatch[0].replace("description:", "").trim() : "No description"
              const model = modelMatch ? modelMatch[0].replace("model:", "").trim() : "default"
              result.push(`- **${name}**: ${desc} (model: ${model})`)
            }
          }
          
          return result.join("\n")
        }
      })
    },
    
    // Hook into compaction to dump memory at 70%
    "experimental.session.compacting": async (input, output) => {
      const { directory, client } = ctx
      
      // Check context usage - if we're compacting, dump to memory first
      const timestamp = new Date().toISOString()
      const memDir = getProjectMemoryDir(directory)
      ensureProjectMemory(directory)
      
      const sessionFile = path.join(memDir, `session-${timestamp.replace(/[:.]/g, "-")}.md`)
      
      // Generate summary from current context
      const summary = `## Session Summary
Generated: ${timestamp}

### Key Points
- Current task context preserved through compaction

### Files Modified
(Summarize from recent tool executions in context)
`
      
      fs.writeFileSync(sessionFile, summary)
      
      // Update project summary
      const summaryFile = path.join(memDir, "summary.md")
      fs.writeFileSync(summaryFile, summary)
      
      // Inject memory reference into compaction
      output.context.push(`## Session Memory
Previous session context saved to: ${path.basename(memDir)}/
Latest session: ${path.basename(sessionFile)}
Reference this memory when resuming work.
`)
    }
  }
}
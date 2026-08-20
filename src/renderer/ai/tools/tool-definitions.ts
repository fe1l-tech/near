/**
 * AI 工具定义 — Function Calling 工具注册表
 * 参考 Claude Code 的能力清单
 */

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
}

export const availableTools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: '读取文件内容',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: '文件路径' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'write_file',
    description: '写入文件',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: '文件路径' },
        content: { type: 'string', description: '文件内容' },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'list_files',
    description: '列出目录中的文件',
    parameters: {
      type: 'object',
      properties: {
        dirPath: { type: 'string', description: '目录路径' },
      },
      required: ['dirPath'],
    },
  },
  {
    name: 'execute_command',
    description: '执行 Shell 命令',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: '要执行的命令' },
        cwd: { type: 'string', description: '工作目录（可选）' },
      },
      required: ['command'],
    },
  },
]

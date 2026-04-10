import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { app } from 'electron'
import { createRetrieveTool } from './tools'
import { createAgent } from "langchain";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatDeepSeek } from "@langchain/deepseek";

// 加载.env文件中的环境变量
dotenv.config()

// 消息接口定义
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatContext {
  paperId?: number
  paperTitle?: string
  currentPage?: number | null
  selectedText?: string
  quickAction?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  context?: ChatContext
}

// 读取系统提示
const systemPromptPath = path.join(app.getAppPath(), 'resources', 'system.md')
let systemPrompt = ''
try {
  systemPrompt = fs.readFileSync(systemPromptPath, 'utf8')
} catch (error) {
  console.error('read system prompt file failed:', error)
  systemPrompt = '你是一个智能助手，帮助用户解答问题。'
}

// 初始化 OpenAI 客户端
const deepseek = new ChatDeepSeek({
  model: 'deepseek-chat',
  configuration: {
    baseURL: 'https://api.deepseek.com',
  },
})

const responseTemplate = [
  '请使用如下统一结构输出（无信息可得时要明确说明）：',
  '【要点速览】3-5条',
  '【正文解读】按用户问题展开',
  '【阅读建议】1-3条可执行下一步'
].join('\n')

function buildSystemPrompt(context: ChatContext): string {
  const scopedPaperPrompt =
    context.paperId && context.paperId > 0
      ? `当前会话必须优先基于 paperId=${context.paperId}（${context.paperTitle || '当前论文'}）检索并回答。`
      : '当前会话是通用会话，可跨文献检索。'
  const pagePrompt =
    typeof context.currentPage === 'number' && context.currentPage > 0
      ? `用户当前阅读页码：${context.currentPage}。`
      : '未提供当前页码。'
  const selectedTextPrompt =
    context.selectedText?.trim()
      ? `用户圈定文本如下，请优先解释该片段：\n${context.selectedText.trim()}`
      : '未提供圈定文本。'
  const quickActionPrompt = context.quickAction
    ? `本次请求触发快捷动作：${context.quickAction}，回答应保持简洁并直接可用。`
    : '本次请求未触发快捷动作。'

  return `${systemPrompt}\n\n${responseTemplate}\n\n${scopedPaperPrompt}\n${pagePrompt}\n${quickActionPrompt}\n${selectedTextPrompt}`
}

function toTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text: unknown }).text ?? '')
        }
        return ''
      })
      .join('\n')
      .trim()
  }
  return String(content ?? '')
}

/**
 * AI 服务类（后端）
 * 封装 DeepSeek API 调用
 */
export class AIService {

  /**
   * 发送聊天消息并获取 AI 回复
   * @param messages 消息数组，包含用户和系统消息
   * @returns AI 回复内容
   */
  static async chat(request: ChatRequest | ChatMessage[]): Promise<string> {
    try {
      const normalizedRequest: ChatRequest = Array.isArray(request)
        ? { messages: request, context: {} }
        : request
      const runtimeContext = normalizedRequest.context ?? {}
      const retrieveTool = createRetrieveTool({ paperId: runtimeContext.paperId })
      const agent = createAgent({
        model: deepseek,
        tools: [retrieveTool],
      })

      const messagesWithSystemPrompt: Array<ChatMessage> = [
      { role: 'system', content: buildSystemPrompt(runtimeContext) },
      ...normalizedRequest.messages
      ]

      // 转换为 LangChain 消息格式
      const langchainMessages = messagesWithSystemPrompt.map(msg => {
        switch (msg.role) {
          case 'user':
            return new HumanMessage(msg.content)
          case 'assistant':
            return new AIMessage(msg.content)
          case 'system':
            return new SystemMessage(msg.content)
          default:
            return new HumanMessage(msg.content)
        }
      })

      // 使用agent代替直接调用OpenAI API
      const result = await agent.invoke({
        messages: langchainMessages,
      })

      const content = toTextContent(result.messages[result.messages.length - 1].content)

      if (!content) {
        throw new Error('AI 返回了空内容')
      }

      return content as string
    } catch (error) {
      console.error('AI 服务调用失败:', error)

      if (error instanceof Error) {
        // 处理不同类型的错误
        if (error.message.includes('API Key')) {
          throw new Error('API Key 配置错误，请检查环境变量')
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('网络连接失败，请检查网络设置')
        } else {
          throw new Error(`AI 服务错误: ${error.message}`)
        }
      }

      throw new Error('AI 服务调用失败，请稍后重试')
    }
  }

}

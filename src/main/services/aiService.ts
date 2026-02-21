import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { app } from 'electron'
import { ChatModalConfig, EmbeddingModalConfig } from '../config'
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFParse } from "pdf-parse";

// 加载.env文件中的环境变量
dotenv.config()

// 消息接口定义
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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
const openai = new OpenAI({
  baseURL: ChatModalConfig.baseURL,
  apiKey: ChatModalConfig.apiKey,
})

/**
 * AI 服务类（后端）
 * 封装 DeepSeek API 调用
 */
export class AIService {
  static vectorStore: MemoryVectorStore | null = null

  /**
   * 发送聊天消息并获取 AI 回复
   * @param messages 消息数组，包含用户和系统消息
   * @returns AI 回复内容
   */
  static async chat(messages: ChatMessage[]): Promise<string> {
    try {
      if (!process.env.VITE_DEEPSEEK_API_KEY) {
        throw new Error('API Key 未配置，请在环境变量中设置 VITE_DEEPSEEK_API_KEY')
      }

      const messagesWithSystemPrompt: Array<ChatMessage> = [
        // { role: 'system', content: systemPrompt }, // 暂时不添加系统提示
        ...messages
      ]

      const completion = await openai.chat.completions.create({
        model: ChatModalConfig.model,
        messages: messagesWithSystemPrompt
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('AI 返回了空内容')
      }

      return content
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

  /**
   * 处理PDF文本的向量化
   * @param path PDF文件路径
   */
  static async processPDFVectorization(path: string): Promise<void> {
    try {
      // 读取PDF文件内容
      const buffer = fs.readFileSync(path);

      const parser = new PDFParse({
        data: buffer
      });

      const content = await parser.getText();
      console.log('===', content)

      // 使用@langchain/textsplitters进行文本分割
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      })
      const chunks = await splitter.splitText(content.text)
      console.log('=== chunks', chunks)

      // 使用OpenAI进行向量化（如果需要其他嵌入模型可以替换）
      const embeddings = new OpenAIEmbeddings({
        configuration: {
          baseURL: EmbeddingModalConfig.baseURL,
          apiKey: EmbeddingModalConfig.apiKey
        },
        model: EmbeddingModalConfig.model
      })
      
      this.vectorStore = await MemoryVectorStore.fromTexts(chunks, [], embeddings)

      console.log('PDF vector OK, chunks length = ', chunks.length)
    } catch (error) {
      console.error('PDF vector failed:', error)
      this.vectorStore = null
    }
  }
}

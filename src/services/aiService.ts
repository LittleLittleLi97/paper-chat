import OpenAI from 'openai'
import systemPrompt from '../renderer/src/assets/prompts/system.md?raw'

// 消息接口定义
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  dangerouslyAllowBrowser: true
})

/**
 * AI 服务类
 * 封装 DeepSeek API 调用
 */
export class AIService {
  /**
   * 发送聊天消息并获取 AI 回复
   * @param messages 消息数组，包含用户和系统消息
   * @returns AI 回复内容
   */
  static async chat(messages: ChatMessage[]): Promise<string> {
    try {
      if (!import.meta.env.VITE_DEEPSEEK_API_KEY) {
        throw new Error('API Key 未配置，请在 .env 文件中设置 VITE_DEEPSEEK_API_KEY')
      }

      const messagesWithSystemPrompt: Array<ChatMessage> = [
        { role: 'system', content: systemPrompt },
        ...messages
      ]

      const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: messagesWithSystemPrompt,
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
}

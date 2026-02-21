export const ChatModalConfig = {
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.VITE_DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
}

export const EmbeddingModalConfig = {
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'qwen/qwen3-embedding-8b',
}

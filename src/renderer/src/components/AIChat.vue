<template>
  <div class="ai-chat">
    <h3>AI 聊天</h3>
    <div class="chat-messages">
      <div v-for="message in messages" :key="message.id" class="message">
        <strong>{{ message.sender }}:</strong> {{ message.text }}
      </div>
    </div>
    <div class="chat-input">
      <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="输入消息..." />
      <button @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Message {
  id: number
  sender: string
  text: string
}

const messages = ref<Message[]>([
  { id: 1, sender: 'AI', text: '你好！有什么关于论文的问题吗？' }
])

const newMessage = ref('')

const sendMessage = () => {
  if (newMessage.value.trim()) {
    messages.value.push({
      id: Date.now(),
      sender: '用户',
      text: newMessage.value
    })
    newMessage.value = ''
    // 这里可以调用AI API
  }
}
</script>

<style scoped>
.ai-chat {
  width: 100%;
  height: 100%;
  background-color: #252526;
  color: #cccccc;
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

h3 {
  margin: 0 0 10px 0;
  color: #cccccc;
  font-size: 14px;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
}

.message {
  margin-bottom: 10px;
  padding: 8px 10px;
  background-color: #37373d;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.chat-input {
  display: flex;
  gap: 5px;
}

input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  background-color: #3c3c3c;
  color: #cccccc;
  font-size: 13px;
}

input::placeholder {
  color: #888;
}

button {
  padding: 8px 12px;
  background-color: #0e639c;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.1s;
}

button:hover {
  background-color: #1177bb;
}
</style>
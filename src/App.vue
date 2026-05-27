<script setup lang="ts">
import { ref } from 'vue';
import { useChat } from './composables/useChat';
import { useFileUpload } from './composables/useFileUpload';
import { marked } from 'marked';

const { messages, loading, isStreaming, sendMessage, stopGeneration, clearMessages } = useChat();
const { fileName, handleFileUpload, retrieveRelevantChunks, clearFile } = useFileUpload();

const userInput = ref('');
const enableRag = ref(true);
const enableAgent = ref(true);

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    handleFileUpload(input.files[0]);
  }
};

const onSubmit = async () => {
  if (!userInput.value.trim() || loading.value) return;
  let ragContext = '';
  if (enableRag.value && fileName.value) {
    const chunks = retrieveRelevantChunks(userInput.value, 3);
    ragContext = chunks.join('\n\n---\n\n');
  }
  await sendMessage(userInput.value, ragContext, enableAgent.value);
  userInput.value = '';
};

const copyMessage = (text: string) => {
  navigator.clipboard.writeText(text);
  alert('已复制');
};

const formatMessage = (content: string, role: string) => {
  if (role === 'assistant') {
    return marked.parse(content, { async: false }) as string;
  }
  return content.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
};
</script>

<template>
  <div class="app">
    <header>
      <h1>🤖 AI 助手</h1>
      <div class="controls">
        <label><input type="checkbox" v-model="enableRag" /> 📄 文档问答</label>
        <label><input type="checkbox" v-model="enableAgent" /> 🛠️ 工具调用</label>
        <button @click="clearMessages" class="clear-btn">清空对话</button>
      </div>
    </header>

    <div v-if="enableRag" class="upload-area">
      <input type="file" accept=".txt" @change="onFileChange" />
      <span>{{ fileName || '未上传文档（仅支持 .txt）' }}</span>
      <button v-if="fileName" @click="clearFile" class="clear-file">清除</button>
    </div>

    <div class="messages">
      <div v-for="(msg, idx) in messages" :key="idx" :class="['message', msg.role]">
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="bubble" v-html="formatMessage(msg.content as string, msg.role)"></div>
        <button class="copy-btn" @click="copyMessage(msg.content as string)">📋</button>
      </div>
      <div v-if="loading && !isStreaming" class="message assistant">
        <div class="avatar">🤖</div>
        <div class="bubble thinking">思考中...</div>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="userInput"
        @keyup.enter="onSubmit"
        :disabled="loading"
        placeholder="输入消息..."
      />
      <button v-if="!isStreaming" @click="onSubmit" :disabled="loading">发送</button>
      <button v-else @click="stopGeneration" class="stop-btn">⏹️ 停止</button>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
}
header {
  margin-bottom: 12px;
}
h1 {
  font-size: 1.5rem;
  margin: 0 0 8px;
}
.controls {
  display: flex;
  gap: 16px;
  align-items: center;
}
.controls label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}
.clear-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}
.upload-area {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}
.clear-file {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
}
.messages {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 16px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.message.user {
  flex-direction: row-reverse;
}
.message.user .bubble {
  background-color: #dcf8c5;
}
.message.user .avatar {
  margin-left: 8px;
}
.avatar {
  width: 32px;
  height: 32px;
  background: #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bubble {
  max-width: 70%;
  padding: 8px 14px;
  border-radius: 20px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  word-break: break-word;
}
.thinking {
  color: gray;
  font-style: italic;
}
.copy-btn {
  background: none;
  border: none;
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
  font-size: 14px;
}
.message:hover .copy-btn {
  opacity: 0.6;
}
.input-area {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.input-area input {
  flex: 1;
  padding: 10px 16px;
  border-radius: 40px;
  border: 1px solid #ccc;
  outline: none;
}
.input-area button {
  padding: 8px 20px;
  border-radius: 40px;
  border: none;
  background: #007bff;
  color: white;
  cursor: pointer;
}
.stop-btn {
  background: #dc3545 !important;
}
</style>

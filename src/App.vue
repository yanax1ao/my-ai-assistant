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
        <div class="message-row">
          <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="bubble" v-html="formatMessage(msg.content as string, msg.role)"></div>
        </div>
        <button class="copy-btn" @click="copyMessage(msg.content as string)">📋 复制</button>
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
* {
  box-sizing: border-box;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 12px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  height: 100dvh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
}

header {
  margin-bottom: 10px;
  flex-shrink: 0;
}

h1 {
  font-size: 1.25rem;
  margin: 0 0 6px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.clear-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
}

.upload-area {
  background: #f5f5f5;
  padding: 10px 12px;
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  flex-shrink: 0;
}

.upload-area input[type="file"] {
  max-width: 100%;
  font-size: 12px;
}

.clear-file {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 13px;
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 12px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}

.message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.message.user {
  align-items: flex-end;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.message.user .message-row {
  flex-direction: row-reverse;
}

.message.user .bubble {
  background-color: #dcf8c5;
}

.avatar {
  width: 30px;
  height: 30px;
  background: #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 15px;
}

.bubble {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
}

.thinking {
  color: gray;
  font-style: italic;
}

.copy-btn {
  background: none;
  border: none;
  opacity: 0;
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px 2px 24px;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  color: #999;
  transition: opacity 0.15s;
}

.message:hover .copy-btn {
  opacity: 0.7;
}

.input-area {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-shrink: 0;
}

.input-area input {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 40px;
  border: 1px solid #ccc;
  outline: none;
  font-size: 15px;
}

.input-area button {
  padding: 10px 18px;
  border-radius: 40px;
  border: none;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}

.stop-btn {
  background: #dc3545 !important;
}

@media (max-width: 480px) {
  .app {
    padding: 8px;
    padding-top: max(8px, env(safe-area-inset-top));
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }

  h1 {
    font-size: 1.1rem;
  }

  .controls {
    gap: 6px 10px;
  }

  .controls label {
    font-size: 12px;
  }

  .clear-btn {
    font-size: 12px;
    padding: 3px 10px;
  }

  .upload-area {
    font-size: 12px;
    padding: 8px 10px;
  }

  .avatar {
    width: 26px;
    height: 26px;
    font-size: 13px;
  }

  .bubble {
    max-width: 82%;
    font-size: 13px;
    padding: 7px 10px;
  }

  .messages {
    padding: 10px;
    gap: 8px;
    border-radius: 12px;
  }

  .input-area input {
    font-size: 14px;
    padding: 10px 12px;
  }

  .input-area button {
    font-size: 13px;
    padding: 10px 14px;
  }
}
</style>

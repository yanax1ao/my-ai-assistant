<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useChat } from '../composables/useChat';
import { useFileUpload } from '../composables/useFileUpload';
import { marked } from 'marked';
import { skills } from '../skills';

const { messages, loading, isStreaming, sendMessage, stopGeneration, clearMessages } = useChat();
const { fileName, handleFileUpload, retrieveRelevantChunks, clearFile } = useFileUpload();

const userInput = ref('');
const enableRag = ref(true);
const enableAgent = ref(true);

const showSkills = ref(false);
const chatPanel = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (chatPanel.value) {
      chatPanel.value.scrollTop = chatPanel.value.scrollHeight;
    }
  });
}

watch(
  () => messages.value.length,
  () => scrollToBottom()
);

watch(
  () => messages.value[messages.value.length - 1]?.content,
  () => scrollToBottom()
);
const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) {
    handleFileUpload(input.files[0]);
  }
};
function fillExample(text: string) {
  userInput.value = text;
  showSkills.value = false;
}
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

const copyMessage = (text: string | null) => {
  if (text) navigator.clipboard.writeText(text);
};

const formatMessage = (content: string | null, role: string) => {
  if (!content) return '';
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
  <div class="chat-page">
    <button
      class="skills-toggle"
      @click="showSkills = !showSkills"
      :title="showSkills ? '关闭技能面板' : '技能列表'"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
      <span class="skill-text">技能</span>
    </button>
    <div class="skills-overlay" v-if="showSkills" @click="showSkills = false"></div>
    <aside class="skills-panel" v-if="showSkills">
      <div class="skills-header">
        <h3>可用技能</h3>
        <button class="skills-close" @click="showSkills = false">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <ul>
        <li v-for="skill in skills" :key="skill.name" @click="fillExample(skill.example)">
          <strong>{{ skill.name }}</strong>
          <span class="example">{{ skill.example }}</span>
          <p class="desc">{{ skill.description }}</p>
        </li>
      </ul>
    </aside>
    <header class="topbar">
      <div class="brand">
        <div class="logo">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1>AI Assistant</h1>
      </div>
      <div class="actions">
        <label class="toggle" title="文档问答">
          <input type="checkbox" v-model="enableRag" />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-label">文档</span>
        </label>
        <label class="toggle" title="工具调用">
          <input type="checkbox" v-model="enableAgent" />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-label">工具</span>
        </label>
        <button @click="clearMessages" class="btn-clear">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            />
          </svg>
        </button>
      </div>
    </header>

    <div v-if="enableRag" class="upload-bar">
      <svg
        class="upload-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        />
      </svg>
      <label class="file-label">
        <input type="file" accept=".txt" @change="onFileChange" />
        <span class="file-btn">选择文件</span>
      </label>
      <span class="file-name">{{ fileName || '未上传文档（仅支持 .txt）' }}</span>
      <button v-if="fileName" @click="clearFile" class="btn-clear-file">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div ref="chatPanel" class="chat-panel">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <p class="empty-text">开始一段对话吧</p>
        <p class="empty-sub">我可以帮你解答问题、处理文档和分析数据</p>
      </div>

      <div v-for="(msg, idx) in messages" :key="idx" :class="['msg', msg.role]">
        <div class="msg-row">
          <div class="avatar">
            <svg
              v-if="msg.role === 'user'"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <svg
              v-else
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div class="bubble" v-html="formatMessage(msg.content, msg.role)"></div>
        </div>
        <button class="copy-btn" @click="copyMessage(msg.content)">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      <div v-if="loading && !isStreaming" class="msg assistant">
        <div class="msg-row">
          <div class="avatar">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div class="bubble thinking">
            <span class="thinking-text">思考中</span>
            <span class="dot-pulse">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="input-panel">
      <div class="input-wrapper">
        <input
          v-model="userInput"
          @keyup.enter="onSubmit"
          :disabled="loading"
          placeholder="输入消息..."
          class="input-field"
        />
        <button
          v-if="!isStreaming"
          @click="onSubmit"
          :disabled="loading || !userInput.trim()"
          class="btn-send"
          title="发送"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
        <button v-else @click="stopGeneration" class="btn-stop" title="停止">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './chat.css';
</style>

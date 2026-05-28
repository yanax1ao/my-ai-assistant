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
    <!-- 背景装饰爪印 -->
    <div class="bg-paws">
      <span class="paw paw-1">🐾</span>
      <span class="paw paw-2">🐾</span>
      <span class="paw paw-3">🐾</span>
      <span class="paw paw-4">🐾</span>
    </div>

    <header class="topbar">
      <div class="brand">
        <span class="logo">🐱</span>
        <h1>喵~ AI 助手</h1>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </header>

    <div v-if="enableRag" class="upload-bar">
      <span class="upload-icon">📎</span>
      <label class="file-label">
        <input type="file" accept=".txt" @change="onFileChange" />
        <span class="file-btn">🐾 选择文件</span>
      </label>
      <span class="file-name">{{ fileName || '还没上传文档哦（仅支持 .txt）' }}</span>
      <button v-if="fileName" @click="clearFile" class="btn-clear-file">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="chat-panel">
      <!-- 聊天面板顶部猫耳装饰 -->
      <div class="cat-ears">
        <span class="cat-ear ear-left"></span>
        <span class="cat-ear ear-right"></span>
      </div>

      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-cat">
          <span class="cat-head">🐱</span>
          <span class="cat-paw-l">🐾</span>
          <span class="cat-paw-r">🐾</span>
        </div>
        <p class="empty-text">喵~ 开始一段对话吧</p>
        <p class="empty-sub">我会努力帮你解答问题的！</p>
      </div>

      <div v-for="(msg, idx) in messages" :key="idx" :class="['msg', msg.role]">
        <div class="msg-row">
          <div class="avatar">
            <span v-if="msg.role === 'user'">😺</span>
            <span v-else class="cat-avatar">🐱</span>
          </div>
          <div class="bubble" v-html="formatMessage(msg.content as string, msg.role)"></div>
        </div>
        <button class="copy-btn" @click="copyMessage(msg.content as string)">
          <span class="copy-paw">🐾</span>
        </button>
      </div>

      <div v-if="loading && !isStreaming" class="msg assistant">
        <div class="msg-row">
          <div class="avatar">🐱</div>
          <div class="bubble thinking">
            <span class="thinking-text">喵喵思考中</span>
            <span class="paw-dots">
              <span class="paw-dot">🐾</span>
              <span class="paw-dot">🐾</span>
              <span class="paw-dot">🐾</span>
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
          placeholder="喵~ 想说点什么..."
          class="input-field"
        />
        <button
          v-if="!isStreaming"
          @click="onSubmit"
          :disabled="loading || !userInput.trim()"
          class="btn-send"
          title="发送"
        >
          🐾
        </button>
        <button v-else @click="stopGeneration" class="btn-stop" title="停止">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  height: 100dvh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(180deg, #fff5f9 0%, #fff0f5 40%, #fce7f3 100%);
  position: relative;
  overflow: hidden;
}

/* ── Background Paw Prints ── */
.bg-paws {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.paw {
  position: absolute;
  font-size: 40px;
  opacity: .06;
  transform: rotate(-15deg);
}

.paw-1 { top: 8%;  right: 5%;  font-size: 48px; transform: rotate(-20deg); }
.paw-2 { top: 25%; left:  3%;  font-size: 36px; transform: rotate(15deg);  }
.paw-3 { top: 55%; right: 8%;  font-size: 44px; transform: rotate(-10deg); }
.paw-4 { top: 75%; left:  6%;  font-size: 38px; transform: rotate(25deg);  }

/* ── Top Bar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  font-size: 28px;
  animation: catBounce 2s ease-in-out infinite;
}

@keyframes catBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.brand h1 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #831843;
  letter-spacing: -0.01em;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Toggle ── */
.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  width: 34px;
  height: 20px;
  border-radius: 20px;
  background: #e4d4dc;
  position: relative;
  transition: background 0.25s;
}

.toggle input:checked + .toggle-track {
  background: #F472B6;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.12);
  transition: transform 0.25s cubic-bezier(.34,1.56,.64,1);
}

.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(14px);
}

.toggle-label {
  font-size: 12px;
  color: #9d7a8b;
  font-weight: 500;
}

/* ── Clear Button ── */
.btn-clear {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: #fdf2f8;
  color: #d8a3bb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.btn-clear:hover {
  background: #fce7f3;
  color: #be185d;
}

/* ── Upload Bar ── */
.upload-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(255,255,255,.65);
  border: 1px solid #f5e1eb;
  border-radius: 14px;
  margin-bottom: 12px;
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 1;
}

.upload-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-label {
  position: relative;
  overflow: hidden;
}

.file-label input[type="file"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 16px;
  border-radius: 10px;
  background: #F472B6;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s, box-shadow .15s, transform .15s;
  box-shadow: 0 2px 6px rgba(244,114,182,.3);
}

.file-btn:hover {
  background: #EC4899;
  box-shadow: 0 4px 12px rgba(244,114,182,.4);
  transform: translateY(-1px);
}

.file-btn:active {
  transform: translateY(0);
}

.file-name {
  flex: 1;
  font-size: 12px;
  color: #c9a0b5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-clear-file {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: none;
  color: #d0a7bb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.btn-clear-file:hover {
  color: #ef4444;
}

/* ── Chat Panel ── */
.chat-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-radius: 20px;
  padding: 28px 20px 20px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(190,24,93,.04), 0 4px 24px rgba(190,24,93,.06);
  display: flex;
  flex-direction: column;
  gap: 20px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.chat-panel::-webkit-scrollbar { width: 4px; }
.chat-panel::-webkit-scrollbar-track { background: transparent; }
.chat-panel::-webkit-scrollbar-thumb { background: #fce7f3; border-radius: 4px; }

/* ── Cat Ears Decoration ── */
.cat-ears {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 40px;
  pointer-events: none;
}

.cat-ear {
  display: block;
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-bottom: 20px solid #fff;
  filter: drop-shadow(0 -2px 2px rgba(190,24,93,.08));
  position: relative;
}

.cat-ear::after {
  content: '';
  position: absolute;
  top: 6px;
  left: -8px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid #fce7f3;
}

/* ── Empty State ── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-cat {
  position: relative;
  margin-bottom: 8px;
}

.cat-head {
  font-size: 64px;
  display: block;
  animation: catFloat 3s ease-in-out infinite;
}

@keyframes catFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.cat-paw-l,
.cat-paw-r {
  position: absolute;
  bottom: 4px;
  font-size: 20px;
  opacity: .7;
  animation: pawTap .8s ease-in-out infinite alternate;
}

.cat-paw-l { left: -14px; animation-delay: 0s; }
.cat-paw-r { right: -14px; animation-delay: .4s; }

@keyframes pawTap {
  0% { transform: scale(1); }
  100% { transform: scale(1.2) translateY(-2px); }
}

.empty-text {
  font-size: 16px;
  color: #be185d;
  font-weight: 600;
}

.empty-sub {
  font-size: 13px;
  color: #d8a3bb;
}

/* ── Messages ── */
.msg {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  animation: fadeUp .35s cubic-bezier(.34,1.56,.64,1);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.msg.user {
  align-items: flex-end;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.msg.user .msg-row {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.msg.user .avatar {
  background: linear-gradient(135deg, #F472B6 0%, #EC4899 100%);
}

.cat-avatar {
  animation: catWink 4s ease-in-out infinite;
}

@keyframes catWink {
  0%, 95%, 100% { transform: scaleY(1); }
  97% { transform: scaleY(.1); }
}

.bubble {
  max-width: 72%;
  padding: 10px 16px;
  border-radius: 18px;
  background: #fdf2f8;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.65;
  color: #5c3048;
  position: relative;
}

.msg.user .bubble {
  background: linear-gradient(135deg, #F472B6 0%, #DB2777 100%);
  color: #fff;
  border-bottom-right-radius: 8px;
}

.msg.assistant .bubble {
  border-bottom-left-radius: 8px;
}

/* ── Thinking ── */
.thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
}

.thinking-text {
  color: #d8a3bb;
  font-size: 13px;
  font-weight: 500;
}

.paw-dots {
  display: flex;
  gap: 2px;
}

.paw-dot {
  font-size: 12px;
  animation: pawBounce 1.4s ease infinite;
  opacity: .5;
}

.paw-dot:nth-child(1) { animation-delay: 0s; }
.paw-dot:nth-child(2) { animation-delay: .2s; }
.paw-dot:nth-child(3) { animation-delay: .4s; }

@keyframes pawBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: .3; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ── Copy Button ── */
.copy-btn {
  background: none;
  border: none;
  opacity: 0;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 8px;
  color: #d8a3bb;
  transition: opacity .15s, color .15s;
  border-radius: 4px;
}

.copy-btn:hover {
  color: #F472B6;
}

.msg:hover .copy-btn {
  opacity: 1;
}

.copy-paw {
  font-size: 12px;
}

/* ── Input Panel ── */
.input-panel {
  flex-shrink: 0;
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 20px;
  padding: 4px 4px 4px 18px;
  box-shadow: 0 1px 3px rgba(190,24,93,.05), 0 4px 16px rgba(190,24,93,.06);
  border: 1px solid #f5e1eb;
  transition: border-color .2s, box-shadow .2s;
}

.input-wrapper:focus-within {
  border-color: #FBCFE8;
  box-shadow: 0 1px 3px rgba(244,114,182,.1), 0 4px 20px rgba(244,114,182,.1);
}

.input-field {
  flex: 1;
  min-width: 0;
  padding: 10px 0;
  border: none;
  outline: none;
  font-size: 14px;
  color: #5c3048;
  background: transparent;
}

.input-field::placeholder {
  color: #e8c4d5;
}

.btn-send,
.btn-stop {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background .15s, transform .15s, opacity .15s;
  font-size: 18px;
}

.btn-send {
  background: #F472B6;
  box-shadow: 0 2px 8px rgba(244,114,182,.35);
}

.btn-send:hover:not(:disabled) {
  background: #EC4899;
  transform: scale(1.08);
}

.btn-send:active:not(:disabled) {
  transform: scale(.95);
}

.btn-send:disabled {
  opacity: .3;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-stop {
  background: #fdf2f8;
  color: #ef4444;
}

.btn-stop:hover {
  background: #fee2e2;
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .app {
    padding: 10px;
    padding-top: max(10px, env(safe-area-inset-top));
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .brand h1 { font-size: 1rem; }
  .logo { font-size: 24px; }

  .toggle-label { display: none; }

  .chat-panel {
    padding: 24px 14px 14px;
    gap: 16px;
    border-radius: 16px;
  }

  .cat-ears { gap: 30px; top: -8px; }
  .cat-ear { border-left-width: 11px; border-right-width: 11px; border-bottom-width: 16px; }
  .cat-ear::after { left: -6px; border-left-width: 6px; border-right-width: 6px; border-bottom-width: 9px; top: 5px; }

  .cat-head { font-size: 52px; }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 12px;
    font-size: 16px;
  }

  .bubble {
    max-width: 80%;
    font-size: 13px;
    padding: 9px 14px;
    border-radius: 16px;
  }

  .msg-row { gap: 8px; }

  .input-wrapper { border-radius: 16px; padding-left: 14px; }
  .input-field { font-size: 14px; }
  .btn-send, .btn-stop { width: 38px; height: 38px; font-size: 16px; }
}
</style>

<script setup lang="ts">
import { ref } from "vue";
import { chatWithDeepseek } from "./api/deepseek";
import { marked } from "marked";

const replyMessage = ref("");
const userInput = ref("");
const loading = ref(false);

const messages = ref([{ role: "system", content: "你是一个友好的助手" }]);
const sendMessage = async () => {
  if (!userInput.value.trim()) return;
  const userMessage = userInput.value;
  userInput.value = "";
  replyMessage.value = "";
  messages.value.push({ role: "user", content: userMessage });
  loading.value = true;
  try {
    const reply = await chatWithDeepseek(messages.value);
    messages.value.push({ role: "assistant", content: reply });
    loading.value = false;
  } catch (err) {
    loading.value = false;
    messages.value.push({ role: "assistant", content: "抱歉，出错了" });
    console.log(err);
  }
};

// const escapeHtml = (str: string) => {
//   const div = document.createElement("div");
//   div.textContent = str;
//   console.log("div.innerHTM", div.innerHTML);

//   return div.innerHTML;
// };
const formatMessage = (msg: { role: string; content: string }) => {
  if (msg.role === "assistant") {
    return marked.parse(msg.content, { async: false }) as string;
  }
  return msg.content;
};
const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    alert("复制成功");
  } catch (err) {
    console.error("复制失败", err);
  }
};
</script>

<template>
  <div class="chat-container">
    <h1>🤖 我的 AI 助手</h1>
    <div class="message-list">
      <div
        v-for="(item, idx) in messages"
        :key="idx"
        :class="['message', item.role === 'user' ? 'user' : 'assistant']"
      >
        <div class="avatar">{{ item.role === "user" ? "👤" : "🤖" }}</div>
        <div v-html="formatMessage(item)" class="bubble"></div>
        <button
          class="copy-btn"
          @click="copyMessage(item.content)"
          title="复制内容"
        >
          📋
        </button>
      </div>
      <div v-if="loading" class="message assistant">
        <div class="avatar">🤖</div>
        <div class="bubble thinking">思考中...</div>
      </div>
    </div>
    <div class="input-area">
      <input
        v-model="userInput"
        @keyup.enter="sendMessage"
        placeholder="输入消息..."
        :disabled="loading"
      />
      <button @click="sendMessage" :disabled="loading">发送</button>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  height: 93vh;
  display: flex;
  flex-direction: column;
  font-family: sans-serif;
}
h1 {
  text-align: center;
  font-size: 1.5rem;
}
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
  background: #f9f9f9;
  height: 80%;
}
.message {
  display: flex;
  margin-bottom: 12px;
  align-items: center;
}
.message.user {
  justify-content: flex-end;
}
.message.user .bubble {
  background-color: #dcf8c5;
  order: 2;
}
.message.user .avatar {
  order: 3;
  margin-left: 8px;
}
.message.assistant .bubble {
  background-color: white;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ccc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
}
.bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
}
.thinking {
  color: gray;
  font-style: italic;
}
.input-area {
  display: flex;
  gap: 8px;
}
.input-area input {
  flex: 1;
  padding: 10px;
  border-radius: 20px;
  border: 1px solid #ccc;
  outline: none;
}
.input-area button {
  padding: 10px 20px;
  border-radius: 20px;
  border: none;
  background: #007bff;
  color: white;
  cursor: pointer;
}
.input-area button:disabled {
  background: #aaa;
}
.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 5px;
}
.message:hover .copy-btn {
  opacity: 0.6;
}
.copy-btn:hover {
  opacity: 1 !important;
}
</style>

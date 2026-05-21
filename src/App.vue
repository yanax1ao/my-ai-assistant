<script setup lang="ts">
import { ref } from "vue";
import { streamChat } from "./api/deepseek";
import { marked } from "marked";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

const userInput = ref("");
const loading = ref(false);
const isStreaming = ref(false);
const messages = ref<Array<{ role: string; content: string }>>([]);
let abortController: AbortController | null = null;

// rag
const uploadedText = ref(""); //原始文档文本
const chunks = ref<string[]>([]); //切分后的段落
const fileName = ref(""); //文件名

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  let text = "";
  try {
    if (file.type === "text/plain") {
      text = await file.text();
    } else if (file.type === "application/pdf") {
      // const arrayBuffer = await file.arrayBuffer();
      // const pdfData = await pdfParse(arrayBuffer);
      // console.log(pdfData);
      // text = pdfData.text;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer); // 转换为 Buffer
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else {
      alert("请上传txt或pdf格式的文件");
      return;
    }
    uploadedText.value = text;
    chunks.value = text.split(/\n\s*\n/).filter((c) => c.trim().length > 0);
    alert(`文件加载完成，共${chunks.value.length}个段落。现在可以开始提问了！`);
  } catch (err) {
    console.error("文件解析失败", err);
    alert("文件解析失败，请重试");
  }
};

const retrieveRelevantChunks = (
  question: string,
  topK: number = 3,
): string[] => {
  if (chunks.value.length === 0) return [];
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const scores = chunks.value.map((c) => {
    const lowerChunk = c.toLowerCase();
    let score = 0;
    keywords.map((key) => {
      if (lowerChunk.includes(key)) {
        score++;
      }
    });
    return score;
  });
  const chunckIdx = scores.map((score, index) => ({ score, index }));
  chunckIdx.sort((a, b) => b.score - a.score);
  const idxs = chunckIdx.slice(0, topK).map((item) => item.index);
  return idxs.map((idx) => chunks.value[idx]);
};

const stopGeneration = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
    loading.value = false;
    isStreaming.value = false;
    const lastMessage = messages.value[messages.value.length - 1];
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      !lastMessage.content
    ) {
      messages.value.pop();
    }
  }
};
const sendMessage = async () => {
  // 空输入直接返回
  if (!userInput.value.trim() && loading.value === true) return;
  // 保存用户输入并清空输入框
  const userMessage = userInput.value;
  // 1. 先在界面上显示用户原始问题
  messages.value.push({ role: "user", content: userMessage });
  userInput.value = "";

  let context = "";
  if (chunks.value.length > 0) {
    const content = retrieveRelevantChunks(userMessage, 3);
    if (content.length > 0) {
      context = `以下是相关文档内容:\n\n${content.join("\n\n")}`;
    }
  }
  // 3. 构建最终发给 AI 的用户消息内容（包含上下文）
  const finalUserContent = context
    ? `基于以下文档内容回答问题。\n\n${context}\n\n问题：${userMessage}`
    : userMessage;

  // 添加用户消息+搜到的文档 到列表
  const assistantMessageIndex = messages.value.length;
  messages.value.push({ role: "assistant", content: "" });
  isStreaming.value = true;
  loading.value = true;
  abortController = new AbortController();
  try {
    const historyForAPI = messages.value.slice(0, -1); // 去掉最后一条空助手消息
    historyForAPI[historyForAPI.length - 1] = {
      role: "user",
      content: finalUserContent,
    };

    await streamChat(
      historyForAPI,
      (content) => {
        messages.value[assistantMessageIndex].content += content;
      },
      abortController.signal,
    );
    loading.value = false;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("用户停止了生成");
    } else {
      console.error("流式请求失败", err);
      messages.value[assistantMessageIndex].content = "⚠️ 出错：" + err.message;
    }
  } finally {
    loading.value = false;
    isStreaming.value = false;
    abortController = null;
  }
};

const escapeHtml = (str: string) => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};
const formatMessage = (msg: { role: string; content: string }) => {
  if (msg.role === "assistant") {
    return marked.parse(msg.content, { async: false }) as string;
  }
  return escapeHtml(msg.content);
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
    <h1>🤖 AI 助手 + RAG（文档问答）</h1>
    <!-- 文件上传区域 -->
    <div class="upload-area">
      <input type="file" accept=".txt,.pdf" @change="handleFileUpload" />
      <span v-if="fileName">已加载：{{ fileName }}</span>
      <span v-else>上传 .txt 或 .pdf 文件，AI 将基于内容回答问题</span>
    </div>
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
    </div>
    <div class="input-area">
      <input
        v-model="userInput"
        @keyup.enter="sendMessage"
        placeholder="输入消息..."
        :disabled="loading"
      />
      <button v-if="!isStreaming" @click="sendMessage" :disabled="loading">
        发送
      </button>
      <button v-else @click="stopGeneration" class="stop-btn">⏹️ 停止</button>
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
.upload-area {
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
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
.stop-btn {
  background: #dc3545 !important;
}
</style>

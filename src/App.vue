<script setup lang="ts">
import { ref } from "vue";
import { chatWithTools } from "./api/deepseek";
import { marked } from "marked";
import { tools, executeTool } from "./tools";
//  @ts-nocheck
// import * as pdfjsLib from "pdfjs-dist";
// 引入 worker 文件（Vite 会将此文件作为静态资源处理）
// import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
// pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
    }
    //  else if (file.type === "application/pdf") {
    //   try {
    //     const arrayBuffer = await file.arrayBuffer();
    //     const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    //     const pdf = await loadingTask.promise;
    //     let fullText = "";
    //     for (let i = 1; i <= pdf.numPages; i++) {
    //       const page = await pdf.getPage(i);
    //       const textContent = await page.getTextContent();
    //       const pageText = textContent.items
    //         .map((item: any) => item.str)
    //         .join(" ");
    //       fullText += pageText + "\n";
    //     }
    //     text = fullText;
    //   } catch (error) {
    //     console.error("PDF 解析失败", error);
    //     alert("PDF 解析失败，请确保文件不是扫描图片版");
    //     return;
    //   }
    // }
    else {
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
async function sendMessage() {
  if (!userInput.value.trim() || loading.value) return;

  const userQuestion = userInput.value;
  userInput.value = "";

  // 显示用户消息
  messages.value.push({ role: "user", content: userQuestion });

  loading.value = true;

  // 深拷贝当前消息历史（不包括界面显示，仅用于 API 调用）
  let currentMessages = messages.value.map((msg) => ({ ...msg }));

  try {
    let maxIterations = 5;
    let finalAnswer = "";

    while (maxIterations-- > 0) {
      // 调用非流式工具 API
      const response = await chatWithTools(currentMessages, tools);
      const assistantMessage = response.choices[0].message;

      // 将助手的原始回复加入历史（后续上下文需要）
      currentMessages.push(assistantMessage);

      // 检查是否有工具调用
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        // 执行每个工具调用
        for (const tc of assistantMessage.tool_calls) {
          const args = JSON.parse(tc.function.arguments || "{}");
          const toolResult = await executeTool(tc.function.name, args);
          const toolMessage = {
            role: "tool",
            content: toolResult,
            tool_call_id: tc.id,
          };
          currentMessages.push(toolMessage);
        }
        // 继续循环，不在界面上显示中间消息
        continue;
      }

      // 没有工具调用 => 最终回答
      finalAnswer = assistantMessage.content;
      // 在界面上添加一个空的助手消息
      messages.value.push({ role: "assistant", content: "" });
      const assistantMsgIndex = messages.value.length - 1;
      // 模拟打字机效果逐字显示
      await simulateTyping(assistantMsgIndex, finalAnswer);
      break;
    }

    if (maxIterations <= 0) {
      messages.value.push({
        role: "assistant",
        content: "工具调用次数过多，已停止。",
      });
    }
  } catch (error: any) {
    console.error("Agent 错误:", error);
    messages.value.push({
      role: "assistant",
      content: `出错：${error.message}`,
    });
  } finally {
    loading.value = false;
  }
}

// 模拟打字机效果
async function simulateTyping(index: number, fullText: string) {
  for (let i = 0; i <= fullText.length; i++) {
    messages.value[index].content = fullText.slice(0, i);
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

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
      <button @click="sendMessage" :disabled="loading">发送</button>
      <!-- <button v-else @click="stopGeneration" class="stop-btn">⏹️ 停止</button> -->
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

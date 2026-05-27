import { ref } from 'vue';
import { streamChat, chatWithTools } from '../api/deepseek';
import { tools, executeTool } from '../tools';

export function useChat() {
  interface Message {
    role: string;
    content: string | null;
    tool_calls?: any;
    tool_call_id?: string;
  }

  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const isStreaming = ref(false);
  let abortController: AbortController | null = null;

  // 模拟打字机效果
  const simulateTyping = async (index: number, fullText: string, onFinish?: () => void) => {
    for (let i = 0; i <= fullText.length; i++) {
      messages.value[index].content = fullText.slice(0, i);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    onFinish?.();
  };

  const sendMessage = async (
    userInput: string,
    ragContext?: string, // 可选：RAG 检索到的上下文
    enableAgent: boolean = true
  ) => {
    if (!userInput.trim() || loading.value) return;

    // 显示用户消息
    messages.value.push({ role: 'user', content: userInput });

    loading.value = true;
    isStreaming.value = false;
    abortController = null;

    // 构建最终 prompt（如果启用 RAG 且有上下文）
    let finalUserContent = userInput;
    if (ragContext && ragContext.length > 0) {
      finalUserContent = `基于以下文档内容回答问题。\n\n${ragContext}\n\n问题：${userInput}`;
    }

    // 深拷贝当前消息历史（用于 API）
    let currentMessages = messages.value.map((m) => ({ ...m }));
    // 替换最后一条用户消息的内容为 finalUserContent
    if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'user') {
      currentMessages[currentMessages.length - 1].content = finalUserContent;
    }

    try {
      if (enableAgent) {
        // ========= Agent 模式（非流式 + 工具调用） =========
        let maxIterations = 5;
        let finalAnswer = '';

        while (maxIterations-- > 0) {
          const response = await chatWithTools(currentMessages, tools);
          const assistantMsg = response.choices[0].message;

          // 将 assistant 原始消息加入历史
          currentMessages.push(assistantMsg);

          // 如果有工具调用
          if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
            for (const tc of assistantMsg.tool_calls) {
              const args = JSON.parse(tc.function.arguments || '{}');
              const toolResult = await executeTool(tc.function.name, args);
              currentMessages.push({
                role: 'tool',
                content: toolResult,
                tool_call_id: tc.id,
              });
            }
            continue; // 继续下一轮
          }

          // 没有工具调用：最终答案
          finalAnswer = assistantMsg.content || '';
          // 在界面上添加助手消息并模拟打字
          messages.value.push({ role: 'assistant', content: '' });
          const idx = messages.value.length - 1;
          await simulateTyping(idx, finalAnswer);
          break;
        }
        if (maxIterations <= 0) {
          messages.value.push({ role: 'assistant', content: '工具调用次数过多，已停止。' });
        }
      } else {
        // ========= 普通流式对话（无工具） =========
        messages.value.push({ role: 'assistant', content: '' });
        const assistantIdx = messages.value.length - 1;
        abortController = new AbortController();
        isStreaming.value = true;

        await streamChat(
          currentMessages.map((m) => ({ role: m.role, content: m.content || '' })),
          (chunk) => {
            messages.value[assistantIdx].content =
              (messages.value[assistantIdx].content || '') + chunk;
          },
          abortController.signal
        );
        isStreaming.value = false;
        abortController = null;
      }
    } catch (error: any) {
      console.error(error);
      messages.value.push({ role: 'assistant', content: `错误：${error.message}` });
    } finally {
      loading.value = false;
      isStreaming.value = false;
      abortController = null;
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
      isStreaming.value = false;
      loading.value = false;
      // 如果最后一条消息是空的助手消息，删除它
      const last = messages.value[messages.value.length - 1];
      if (last && last.role === 'assistant' && !last.content) {
        messages.value.pop();
      }
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  return {
    messages,
    loading,
    isStreaming,
    sendMessage,
    stopGeneration,
    clearMessages,
  };
}

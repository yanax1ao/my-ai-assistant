const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) {}
      }
    }
  }
}

export async function chatWithTools(messages: any[], tools: any[]): Promise<{ content: string }> {
  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, tools }),
  });
  const data = await response.json();

  if (data.error) throw new Error(data.error);
  return { content: data.content };
}

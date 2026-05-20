const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function streamChat(
    userMessage: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
): Promise<void> {
    const formattedMessages = userMessage.map((msg) => ({
        role: msg.role,
        content: msg.content,
        type: "text", // 添加这一行
    }));
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: formattedMessages,
            stream: true,
        }),
        signal,
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 调用失败：${response.status}${errorText}`);
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (reader) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
            if (trimmedLine.startsWith("data: ")) {
                try {
                    const jsonStr = trimmedLine.slice(6);
                    const data = JSON.parse(jsonStr);
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                } catch (err) {
                    console.log("接续数据流失败：", err);
                }
            }
        }
    }
}

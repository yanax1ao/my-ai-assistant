const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function streamChat(
    userMessage: Array<{ role: string; content: string }>,
    tools: any[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
): Promise<any> {
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
            tools:tools,
            stream: false,
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
    let fullContent = '';
    let toolCalls:any[]=[];
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
                    const delta =  data.choices?.[0]?.delta
                    if(delta?.content){
                        // 普通文本内容
                        fullContent += delta.content;
                        onChunk(delta.content);
                        
                    }
                    if(delta?.tool_calls){
                        for(const item of delta.tool_calls){
                            const index=  item.index;
                            console.log('item tool',item);
                            
                            if(!toolCalls[index]) toolCalls[index]={
                                id:item.id,type:item.type,function:{name:'',arguments:''}
                            }
                            if(item.id) toolCalls[index].id = item.id
                            if(item.function?.name) toolCalls[index].function.name += item.function.name
                            if(item.function?.arguments) toolCalls[index].function.arguments += item.function.arguments
                        }
                    }
                } catch (err) {
                    console.log("接续数据流失败：", err);
                }
            }
        }
    }
    // 如果有工具调用，返回工具调用信息
    if(toolCalls.length>0&&toolCalls[0]?.function.name){
        return {toolsCalls:toolCalls.filter(t=>t)}
    }
      // 否则返回普通内容（已经通过 onChunk 输出，这里返回空）
      return { content: fullContent };
}

export async function chatWithTools(
  messages: any[],
  tools: any[]
): Promise<any> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      tools: tools,
      stream: false,     // 非流式
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data;
}

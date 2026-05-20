import axios from "axios";
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';


export async function chatWithDeepseek(userMessage: Array<{role: string, content: string}>){
    try{
        const formattedMessages = userMessage.map(msg => ({
        role: msg.role,
        content: msg.content,
        type: 'text',   // 添加这一行
        }));
        const response = await axios.post(
            API_URL,
            {
                model: 'deepseek-chat',
                messages: formattedMessages,
                stream:false
            },
            {
                headers:{
                    'Content-Type':'application/json',
                    'Authorization':`Bearer ${API_KEY}`
                }
            }
        )
        return response.data.choices[0].message.content
    }catch(err){
        console.log('API 调用失败：',err)
        throw err
        
    }
}
export const tools = [
    {
        type:'function',
        function:{
            name:'get_current_time',
            description:'获取当前日期和时间',
            parameters:{
                type:'object',
                properties:{},
                required:[]
            }
        }
    },
    {
        type:'function',
        function:{
            name:'calculate',
            description:'执行基础数学运算',
            parameters:{
                type:'object',
                properties:{
                    expression:{
                        type:'string',
                        description:'数学表达式，例如 “2 + 2 * 4'
                    }
                },
                required:['expression']

            }
        }
    },
    {
        type:'function',
        function:{
            name:'get_weather',
            description:'获取指定城市的天气（模拟）',
            parameters:{
                type:'object',
                properties:{
                    city:{
                        type:'string',
                        description:'城市名称，如”杭州“'
                    }
                },
                required:['city']
            }
        }
    }
]

export async function executeTool(toolName:string,args:any):Promise<string>{
    switch(toolName){
        case 'get_current_time':
            return new Date().toLocaleDateString();
        case 'calculate':
            try{
                const result = eval(args.expression)
                return `计算结果：${result}`
            }catch(e){
                return `计算错误${e}`
            }
        case 'get_weather':
            const weatherMap: Record<string,string>={
                '杭州': '晴天，25°C，湿度60%',
                '北京': '多云，28°C，湿度40%',
                '上海': '阵雨，24°C，湿度80%',
            }
            return weatherMap[args.city] || `未找到${args.city}的天气数据，请尝试其他城市`
        default:
            return `工具 ${toolName} 未实现`
    }
}
export const tools = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: '获取当前时间',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: '执行数学计算',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: '数学表达式，如 "2 + 3 * 4"' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取城市天气（模拟）',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称，如 "杭州"' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_person',
      description: '获取某个人的信息',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '姓名，如 "张三"' },
        },
        required: ['name'],
      },
    },
  },
];

export async function executeTool(name: string, args: any): Promise<string> {
  switch (name) {
    case 'get_current_time':
      return new Date().toLocaleString();
    case 'calculate':
      try {
        // 注意：仅用于学习，生产环境请用 math.js 等安全库
        return `计算结果：${eval(args.expression)}`;
      } catch (e: any) {
        return `计算错误：${e.message}`;
      }
    case 'get_weather': {
      const mock: Record<string, string> = {
        杭州: '晴天 25°C 湿度60%',
        北京: '多云 28°C 湿度40%',
        上海: '小雨 22°C 湿度85%',
      };
      return mock[args.city] || `未找到 ${args.city} 的天气`;
    }
    case 'get_person': {
      const mock: Record<string, string> = {
        张礼彪: '外号：狗猪 年龄：18 性格：憨 爱好：睡觉 居住地：四川 秘密：暗恋娜娜',
        肖雅娜: '外号：娜娜 年龄：18 性格：萌 爱好：看书 居住地：临安',
      };
      return mock[args.name] || `未找到 ${args.name} 的信息`;
    }
    default:
      return `未知工具 ${name}`;
  }
}

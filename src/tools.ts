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
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: '发送一封电子邮件。需要提供收件人地址、主题、正文内容。',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: '收件人邮箱地址' },
          subject: { type: 'string', description: '邮件主题' },
          body: { type: 'string', description: '邮件正文' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
];

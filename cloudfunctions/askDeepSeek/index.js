const cloud = require('wx-server-sdk');
const axios = require('axios');
const moment = require('moment');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 从环境变量读取密钥（在微信云开发控制台「环境设置-环境变量」中配置）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const WX_APPID = process.env.WX_APPID;
const WX_APPSECRET = process.env.WX_APPSECRET;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { task } = event;

  if (!task) {
    return {
      success: false,
      error: '任务不能为空'
    };
  }

  try {
    if (!DEEPSEEK_API_KEY) {
      return {
        success: false,
        error: 'DeepSeek API Key 未配置'
      };
    }

    const prompt = `你是一个专业的任务拆解教练。用户有一个感到困难或拖延的任务："${task}"。

请将这个任务拆解为3-5个极度简单、微小的行动步骤，并提供心理建设建议。

请返回严格的JSON格式，不要有任何其他内容：
{
  "encouragement": "一句温暖的心理建设/鼓励语（20字以内）",
  "steps": [
    {
      "emoji": "一个相关的emoji",
      "title": "步骤标题（10字以内）",
      "description": "步骤描述（20字以内）"
    }
  ],
  "tips": [
    "心理建设建议1",
    "心理建设建议2"
  ]
}`;

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的任务拆解教练，擅长将复杂任务拆解为简单步骤，并用温暖的语言鼓励用户。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        success: false,
        error: 'AI 返回格式错误'
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    const taskRecord = {
      openid: openid,
      task: task,
      encouragement: result.encouragement,
      steps: result.steps,
      tips: result.tips,
      createTime: db.serverDate()
    };

    await db.collection('tasks').add({
      data: taskRecord
    });

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error.message || '请求失败'
    };
  }
};

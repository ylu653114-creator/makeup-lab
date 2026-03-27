import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { action, faceShape } = await req.json();

    // 场景 A：点击“完成”后的【人格分析】
    if (action === 'analyze_persona') {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一位高奢男士理容专家。请根据用户的理容选择，生成一个极其简短、高级、电影感的理容人格名字（4个字以内）、一段富有诗意的评价（30字以内）、以及一位最相似的男士明星名字。请严格按照 JSON 格式返回：{\"name\": \"xxx\", \"desc\": \"xxx\", \"star\": \"xxx\"}"
          },
          {
            role: "user",
            content: "我已经完成了理容模拟，请为我定义人格。"
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return NextResponse.json(result);
    }

    // 场景 B：初始拍照后的【理容建议】
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "你是一位男士理容专家。请针对用户拍照后的面部光影，给出一段极其精简（20字以内）的专业修容建议。"
        },
        {
          role: "user",
          content: `我的面部轮廓类型是：${faceShape || 'custom'}，请给出理容建议。`
        }
      ],
    });

    return NextResponse.json({ advice: completion.choices[0].message.content });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      name: "旷野绅士", 
      desc: "坚毅的轮廓中透着柔和的细节处理，展现出极具深度的男士理容美学。", 
      star: "陈坤" 
    });
  }
}
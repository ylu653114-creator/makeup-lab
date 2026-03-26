import OpenAI from "openai";
import { NextResponse } from "next/server";

// 1. 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // 2. 接收前端传来的数据
    const { faceShape } = await req.json();

    // 3. 调用 ChatGPT (使用 gpt-4o-mini，速度快且便宜)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "你是一位专业的男士理容专家。请为用户提供极简、日常、自然的化妆建议。" },
        { role: "user", content: `我的脸型是：${faceShape}。请提供极简的修容（Contour）和提亮（Highlight）步骤，不要超过4步。` }
      ],
    });

    const advice = completion.choices[0].message.content;

    // 4. 返回 AI 的回答
    return NextResponse.json({ advice });

  } catch (error) {
    console.error("OpenAI 报错详情:", error);
    return NextResponse.json({ error: "AI 暂时走神了", details: error }, { status: 500 });
  }
}
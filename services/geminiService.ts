
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const analyzeFile = async (fileName: string, fileType: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `分析以下文件信息并用中文给出一个简短的描述或分类建议：文件名: ${fileName}, 类型: ${fileType}。请保持在30字以内。`,
    });
    return response.text || "无法生成描述";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "分析失败，请检查网络";
  }
};

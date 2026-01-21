
import { GoogleGenAI } from "@google/genai";
import { Mistake, Language, AIModel } from "../types";

const CLT_TEACHER_INSTRUCTION = `
你是一名精通教育心理学和 CLT（交际教学法）的资深名师。
你的回复准则：
1. **零废话**：不使用任何客套话。
2. **结构化**：严格按照标题输出。
3. **专业性**：对于理科，给出详细推导；对于文科，解释语境。
`;

// Helper: Convert URL to Base64 (needed for Gemini InlineData)
const urlToBase64 = async (url: string): Promise<{ data: string, mimeType: string }> => {
    try {
        // IMPORTANT: 'anonymous' is crucial for Supabase Storage CORS
        const response = await fetch(url, { 
            method: 'GET',
            mode: 'cors', // Ensure CORS is handled
            credentials: 'omit', // Do not send cookies to Storage to avoid Auth errors on public buckets
            headers: {
                'Origin': window.location.origin 
            }
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Format is "data:image/png;base64,....."
                const parts = base64String.split(',');
                const mimeType = parts[0].split(':')[1].split(';')[0];
                const data = parts[1];
                resolve({ data, mimeType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to convert image URL to base64", e);
        throw new Error("AI 无法读取图片。请检查：1. Supabase Storage 桶是否公开 2. 是否已配置 CORS 允许当前域名访问。");
    }
};

export const fetchOpenRouterModels = async (apiKey: string, baseUrl: string = 'https://openrouter.ai/api/v1'): Promise<AIModel[]> => {
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // OpenRouter returns { data: [{ id, name, architecture: { modality: "text+image->text" } }] }
        if (data.data && Array.isArray(data.data)) {
            return data.data.map((m: any) => ({
                id: m.id,
                name: m.name || m.id,
                description: m.description || '',
                context_length: m.context_length,
                is_multimodal: m.architecture?.modality?.includes('image') || false
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        throw error;
    }
};

export const analyzeMistakeWithGemini = async (
  mistake: Mistake,
  modelName: string,
  language: Language = 'zh',
  config?: { 
      geminiApiKey?: string; 
      openRouterApiKey?: string;
      openRouterBaseUrl?: string;
  }
): Promise<string> => {
  const prompt = `
    请严格按照以下格式解析错题：
    
    ### 1. 问题分析
    [简述题目考察的核心点或误区]
    
    ### 2. 解题步骤
    [步骤一：...]
    [步骤二：...]
    
    ### 3. 最终结果
    **[标准答案内容]**
    
    科目: ${mistake.subject}
    题目信息: ${mistake.questionText || "见图"}
  `;

  // 1. Determine Provider Logic
  const useGeminiSDK = modelName.toLowerCase().startsWith('gemini') && !!config?.geminiApiKey;
  
  // --- Google GenAI SDK Path ---
  if (useGeminiSDK) {
    const apiKey = config?.geminiApiKey;
    if (!apiKey) throw new Error("缺少 Gemini API Key");

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const parts: any[] = [];
        
        if (mistake.imageUrl) {
            let base64Data = "";
            let mimeType = "image/jpeg";

            // Case A: Image is a URL (Supabase/Cloud)
            if (mistake.imageUrl.startsWith('http')) {
                const result = await urlToBase64(mistake.imageUrl);
                base64Data = result.data;
                mimeType = result.mimeType;
            } 
            // Case B: Image is already Base64
            else if (mistake.imageUrl.startsWith('data:')) {
                base64Data = mistake.imageUrl.split(',')[1];
                mimeType = mistake.imageUrl.split(';')[0].split(':')[1];
            }

            if (base64Data) {
                parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
            }
        }
        
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: modelName, 
            contents: { parts: parts },
            config: {
                systemInstruction: CLT_TEACHER_INSTRUCTION
            }
        });
        
        return response.text?.trim() || "解析生成失败，请重试。";
    } catch (error: any) {
        console.error("Gemini API Error details:", error);
        throw new Error(`Gemini AI 分析失败: ${error.message || "请检查 API Key 或网络"}`);
    }
  } 
  
  // --- OpenRouter / OpenAI Compatible Path ---
  else {
      const apiKey = config?.openRouterApiKey;
      if (!apiKey) {
          throw new Error("请配置 OpenRouter API Key (或者为 Gemini 模型配置 Gemini API Key)");
      }
      
      const baseUrl = config?.openRouterBaseUrl || "https://openrouter.ai/api/v1";
      const endpoint = baseUrl.endsWith('/chat/completions') 
          ? baseUrl 
          : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

      try {
          const contentParts = [];
          contentParts.push({ type: "text", text: CLT_TEACHER_INSTRUCTION + "\n" + prompt });
          
          if (mistake.imageUrl) {
              contentParts.push({
                  type: "image_url",
                  image_url: {
                      url: mistake.imageUrl // OpenRouter supports URLs directly
                  }
              });
          }

          const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": window.location.origin,
              },
              body: JSON.stringify({
                  model: modelName,
                  messages: [
                      { role: "user", content: contentParts }
                  ]
              })
          });

          if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error?.message || err.message || `Request Failed: ${response.status}`);
          }

          const data = await response.json();
          return data.choices?.[0]?.message?.content || "无返回内容";

      } catch (error: any) {
          console.error("OpenRouter/API Error:", error);
          throw new Error("AI 分析失败: " + (error.message || "Unknown error"));
      }
  }
};

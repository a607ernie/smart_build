import { GoogleGenAI, Type } from "@google/genai";
import { Material } from "../types";
import { PROJECT_HIERARCHY } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to resolve human readable location
const getLocationName = (projectId: string, siteId: string, groupId: string) => {
  const project = PROJECT_HIERARCHY.find(p => p.id === projectId);
  const site = project?.sites.find(s => s.id === siteId);
  const group = site?.groups.find(g => g.id === groupId);
  return `${project?.name || projectId} > ${site?.name || siteId} > ${group?.name || groupId}`;
};

export const getAllocationSuggestion = async (
  query: string, 
  inventory: Material[]
): Promise<any> => {
  
  const inventorySummary = inventory.map(item => ({
    name: item.name,
    spec: item.spec,
    status: item.status,
    locationPath: getLocationName(item.projectId, item.siteId, item.groupId),
    quantity: item.quantity,
    reuseCount: item.reuseCount
  }));

  const prompt = `
    你是一位專業的營建材料管理專家。
    使用者需求: "${query}"
    
    目前庫存數據 (JSON):
    ${JSON.stringify(inventorySummary)}
    
    你的任務:
    1. 分析使用者的需求。
    2. 建議材料調配計畫。
    3. **關鍵規則**: 優先建議使用 'USED' (可用餘料) 以促進永續發展。只有在餘料不足時才建議使用 'NEW' (新品)。
    4. 考慮地點距離。優先在同一專案或工區內調動，優於跨專案調度。
    5. **請以繁體中文 (Traditional Chinese) 回覆**。
    6. 以結構化的 JSON 格式回傳結果。
    
    如果找不到請求的材料，請在 reasoning 中說明。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  materialName: { type: Type.STRING },
                  action: { type: Type.STRING, description: "例如：從台北總部調撥、從庫存領用" },
                  quantity: { type: Type.NUMBER },
                  sourceLocation: { type: Type.STRING },
                  sourceStatus: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                },
                required: ["materialName", "quantity", "reasoning", "sourceStatus", "sourceLocation"]
              }
            },
            summary: { type: Type.STRING, description: "給使用者的簡短摘要" },
            isSustainable: { type: Type.BOOLEAN }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      suggestions: [],
      summary: "AI 服務目前暫時無法使用，請改用人工查詢。",
      isSustainable: false
    };
  }
};

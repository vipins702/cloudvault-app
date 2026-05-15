/**
 * CLOUDVAULT AI SERVICE
 * Handles Duplicate Detection, NSFW Filtering, and Image Analysis
 */
const OpenAI = require('openai');

const AIService = {
  /**
   * DUPLICATE DETECTION
   * Finds potential duplicates based on filename, size, and type within a tenant.
   */
  /**
   * NSFW & SAFETY SCAN (Mock Implementation)
   * In production, this calls Google Vision API or AWS Rekognition.
   */
  analyzeSafety: async (fileUrl) => {
    // Simulation logic
    const isSuspicious = fileUrl.includes('adult') || fileUrl.includes('nsfw');
    return {
      safe: !isSuspicious,
      confidence: 0.98,
      labels: isSuspicious ? ['Adult Content'] : ['Safe']
    };
  },

  /**
   * OBJECT DETECTION (Smart Search)
   * Labels the image for categorization (Nature, Beach, Dog, etc.)
   */
  detectObjects: async (fileUrl, fileName, base64Data, settings = {}) => {
    const provider = settings.active_llm_provider || 'openai';
    const config = settings.llm_config || {};
    
    let apiKey = process.env.OPENAI_API_KEY;
    let baseURL = undefined;
    let model = 'gpt-4o-mini';

    if (provider === 'gemini') {
      apiKey = config.gemini_api_key || process.env.GEMINI_API_KEY;
      baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      model = config.gemini_model || 'gemini-1.5-flash';
    } else if (provider === 'qwen') {
      apiKey = config.qwen_api_key;
      baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      model = config.qwen_model || 'qwen-vl-max';
    } else if (provider === 'glm') {
      apiKey = config.glm_api_key;
      baseURL = 'https://open.bigmodel.cn/api/paas/v4/';
      model = config.glm_model || 'glm-4v';
    } else if (provider === 'custom') {
      apiKey = config.custom_api_key;
      baseURL = config.custom_base_url;
      model = config.custom_model;
    } else {
      // openai
      apiKey = config.openai_api_key || process.env.OPENAI_API_KEY;
      model = config.openai_model || 'gpt-4o-mini';
    }

    // 1. If API key exists and base64Data is provided, use the Vision Model
    if (apiKey && base64Data) {
      try {
        console.log(`[AIService] Analyzing image with ${provider} model: ${model}...`);
        const openai = new OpenAI({ apiKey, baseURL });
        
        // We use the base64 data to avoid Vercel blob cold starts / public URL issues
        const mimeType = fileName?.toLowerCase().match(/\.(png|gif|webp)$/) ? 
          `image/${fileName.split('.').pop()}` : 'image/jpeg';
        
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this image and return ONLY a JSON array of 4 to 6 relevant descriptive tags. Return no other text, just the raw JSON array of strings (e.g., [\"Nature\", \"Beach\", \"Vacation\"])." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
              ],
            },
          ],
          response_format: { type: "json_object" } // Enforce JSON response if supported, or just rely on prompt
        });

        const content = response.choices[0].message.content.trim();
        // Fallback parsing just in case
        const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 6);
        } else if (parsed && parsed.tags && Array.isArray(parsed.tags)) {
          return parsed.tags.slice(0, 6);
        }
      } catch (err) {
        console.error(`[AIService] ${provider} Vision Model Error:`, err.message);
        // Fallthrough to fallback logic if AI fails
      }
    }

    // 2. Simulated AI Vision tagging fallback
    const name = (fileName || '').toLowerCase();
    const tags = [];
    
    if (name.includes('beach') || name.includes('sea') || name.includes('ocean')) tags.push('Beach', 'Water', 'Nature', 'Outdoors');
    if (name.includes('dog') || name.includes('cat') || name.includes('pet')) tags.push('Animal', 'Pet', 'Cute');
    if (name.includes('doc') || name.includes('pdf') || name.includes('invoice') || name.includes('receipt')) tags.push('Document', 'Text', 'Finance');
    if (name.includes('car') || name.includes('auto') || name.includes('vehicle')) tags.push('Vehicle', 'Automotive', 'Transportation');
    
    if (tags.length === 0) {
      if (name.match(/\.(pdf|docx|xlsx|txt)$/)) tags.push('Document', 'File');
      else tags.push('Photo', 'Image');
    }
    
    return tags;
  },

  /**
   * OPTICAL CHARACTER RECOGNITION (OCR)
   * Extracts text from images or documents using Vision LLM.
   */
  performOCR: async (base64Data, settings = {}) => {
    const provider = settings.active_llm_provider || 'openai';
    const config = settings.llm_config || {};
    
    let apiKey = provider === 'gemini' ? (config.gemini_api_key || process.env.GEMINI_API_KEY) : (config.openai_api_key || process.env.OPENAI_API_KEY);
    let baseURL = provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : undefined;
    let model = provider === 'gemini' ? (config.gemini_model || 'gemini-1.5-flash') : (config.openai_model || 'gpt-4o-mini');

    if (!apiKey || !base64Data) return null;

    try {
      const openai = new OpenAI({ apiKey, baseURL });
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Read all the text in this image. If it is an invoice or receipt, extract the Merchant Name, Date, and Total Amount. Return the result as a clean text summary or JSON." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
            ],
          },
        ],
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.error(`[AIService] OCR Error:`, err.message);
      return null;
    }
  },

  /**
   * DUPLICATE DETECTION
   * Returns files grouped by similarity.
   */
  findDuplicates: async (sql, tenantId) => {
    const rows = await sql`
      SELECT f1.id, f1.name, f1.storage_url, f1.size_bytes, f1.folder
      FROM files f1
      WHERE f1.tenant_id = ${tenantId}
      AND EXISTS (
        SELECT 1 FROM files f2 
        WHERE f1.id <> f2.id 
        AND f1.tenant_id = f2.tenant_id
        AND f1.size_bytes = f2.size_bytes
        AND (f1.name = f2.name OR f1.name LIKE '%' || f2.name || '%' OR f2.name LIKE '%' || f1.name || '%')
      )
      ORDER BY f1.size_bytes DESC, f1.name
    `;

    // Grouping by size and name similarity for the UI
    const groups = {};
    rows.forEach(row => {
      const key = `${row.size_bytes}`; // Basic grouping by size
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    return Object.values(groups).filter(g => g.length > 1);
  },
};

module.exports = AIService;

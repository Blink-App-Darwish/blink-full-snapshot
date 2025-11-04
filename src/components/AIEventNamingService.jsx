import { base44 } from "@/api/base44Client";

/**
 * AI Event Naming Service
 * Generates creative event names and unique identifiers
 */
class AIEventNamingService {
  
  /**
   * Category code mapping for UID generation
   */
  static CATEGORY_CODES = {
    wedding: "WED",
    birthday: "BIR",
    corporate: "COR",
    conference: "CNF",
    product_launch: "PLN",
    baby_shower: "BSH",
    dinner: "DIN",
    other: "OTH"
  };

  /**
   * Generate creative event name using AI
   * @param {Object} eventData - Event details
   * @returns {Promise<Object>} - { displayName, keywords, alternatives }
   */
  static async generateCreativeName(eventData) {
    const {
      hostNickname,
      type,
      location,
      theme,
      vibe,
      selectedCategories = [],
      budget,
      guestCount
    } = eventData;

    try {
      console.log("🎨 Generating creative event name...", eventData);

      const prompt = `Generate a creative, elegant event name for:
- Host nickname: ${hostNickname || "Host"}
- Event type: ${type}
- Location: ${location || "unspecified"}
- Theme: ${theme || "unspecified"}
- Vibe: ${vibe || "elegant"}
- Services: ${selectedCategories.join(", ") || "various"}
- Budget range: ${budget ? `$${budget}` : "flexible"}
- Guest count: ${guestCount || "medium size"}

Requirements:
1. Start with host's nickname: "${hostNickname},"
2. Follow with 3-5 creative words that capture the event's essence
3. Make it memorable, elegant, and unique
4. Avoid generic terms like "event", "party", "celebration"
5. Use evocative, imagery-rich language

Examples:
- "Sarah, Golden Dunes Gala"
- "Mike, The Summit Soirée"
- "Emma, Blue Horizon Gathering"
- "Alex, Starlit Garden Affair"

Also provide:
- 2 alternative names
- 2-3 keywords that capture the essence (for UID generation)`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            primary_name: { type: "string" },
            keywords: {
              type: "array",
              items: { type: "string" },
              maxItems: 3
            },
            alternatives: {
              type: "array",
              items: { type: "string" },
              maxItems: 2
            }
          },
          required: ["primary_name", "keywords"]
        }
      });

      console.log("✅ AI name generated:", response);

      return {
        displayName: response.primary_name,
        keywords: response.keywords || [],
        alternatives: response.alternatives || [],
        metadata: {
          generated_at: new Date().toISOString(),
          ai_model: "gpt-4",
          generation_prompt: prompt
        }
      };

    } catch (error) {
      console.error("❌ Error generating creative name:", error);
      
      // Fallback to manual generation
      const fallbackName = this.generateFallbackName(eventData);
      return {
        displayName: fallbackName,
        keywords: [type, location || "local"].filter(Boolean),
        alternatives: [],
        metadata: {
          generated_at: new Date().toISOString(),
          ai_model: "fallback",
          error: error.message
        }
      };
    }
  }

  /**
   * Generate fallback name if AI fails
   */
  static generateFallbackName(eventData) {
    const { hostNickname, type, location } = eventData;
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    const locationPart = location ? ` in ${location}` : '';
    return `${hostNickname || "Host"}, ${typeLabel}${locationPart}`;
  }

  /**
   * Generate unique event UID
   * Format: [BLK]-[DDMM]-[CAT]-[AIKeyword]-[XXXX]
   * @param {Object} params - UID generation parameters
   * @returns {Promise<string>} - Unique event UID
   */
  static async generateUniqueUID(params) {
    const {
      type,
      keywords = [],
      createdDate = new Date()
    } = params;

    // BLK - Static prefix
    const prefix = "BLK";

    // DDMM - Day + Month of creation
    const day = String(createdDate.getDate()).padStart(2, '0');
    const month = String(createdDate.getMonth() + 1).padStart(2, '0');
    const dateCode = `${day}${month}`;

    // CAT - 3-letter category code
    const categoryCode = this.CATEGORY_CODES[type] || "OTH";

    // AIKeyword - 1-2 creative words from AI
    const keywordPart = keywords.length > 0
      ? keywords[0].substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '')
      : "EVNT";

    // XXXX - Sequential number or hash
    let sequential = await this.getNextSequentialNumber(type, dateCode);

    // Build initial UID
    let uid = `${prefix}-${dateCode}-${categoryCode}-${keywordPart}-${String(sequential).padStart(4, '0')}`;

    // Check for duplicates and handle collisions
    uid = await this.ensureUniqueUID(uid, type, dateCode, categoryCode, keywordPart);

    console.log("✅ Generated unique UID:", uid);
    return uid;
  }

  /**
   * Get next sequential number for the day/type combination
   */
  static async getNextSequentialNumber(type, dateCode) {
    try {
      const { Event } = await import("@/api/entities");
      
      // Get all events created today with this type
      const todayEvents = await Event.list("-created_date", 1000);
      const matchingEvents = todayEvents.filter(e => 
        e.event_uid && e.event_uid.includes(dateCode) && e.type === type
      );

      return matchingEvents.length + 1;
    } catch (error) {
      console.warn("Could not get sequential number, using random:", error);
      return Math.floor(Math.random() * 9999) + 1;
    }
  }

  /**
   * Ensure UID is unique, handle collisions
   */
  static async ensureUniqueUID(baseUID, type, dateCode, categoryCode, keywordPart) {
    try {
      const { Event } = await import("@/api/entities");
      
      // Check if UID exists
      const existingEvents = await Event.list("-created_date", 10000);
      const uidExists = existingEvents.some(e => e.event_uid === baseUID);

      if (!uidExists) {
        return baseUID;
      }

      console.warn("⚠️ UID collision detected, generating alternative...");

      // Collision detected - append random 3-digit hash
      const hash = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      const newUID = `BLK-${dateCode}-${categoryCode}-${keywordPart}-${hash}`;

      // Recursive check (with max depth protection)
      return await this.ensureUniqueUID(newUID, type, dateCode, categoryCode, keywordPart);

    } catch (error) {
      console.error("Error checking UID uniqueness:", error);
      return baseUID; // Return base UID if check fails
    }
  }

  /**
   * Complete event naming flow
   * Generates both creative name and unique UID
   */
  static async generateCompleteEventIdentity(eventData) {
    console.log("🚀 Starting complete event identity generation...");

    try {
      // Generate creative name with AI
      const nameResult = await this.generateCreativeName(eventData);

      // Generate unique UID
      const uid = await this.generateUniqueUID({
        type: eventData.type,
        keywords: nameResult.keywords,
        createdDate: new Date()
      });

      const result = {
        display_name: nameResult.displayName,
        event_uid: uid,
        ai_keywords: nameResult.keywords,
        name: nameResult.displayName, // Legacy field
        name_generation_metadata: {
          ...nameResult.metadata,
          alternatives: nameResult.alternatives
        }
      };

      console.log("✅ Complete event identity generated:", result);
      return result;

    } catch (error) {
      console.error("❌ Error in complete identity generation:", error);
      throw error;
    }
  }

  /**
   * Validate event UID format
   */
  static validateUID(uid) {
    const pattern = /^BLK-\d{4}-[A-Z]{3}-[A-Z]{4}-\d{3,4}$/;
    return pattern.test(uid);
  }

  /**
   * Parse UID components
   */
  static parseUID(uid) {
    if (!this.validateUID(uid)) {
      throw new Error("Invalid UID format");
    }

    const parts = uid.split('-');
    return {
      prefix: parts[0],
      dateCode: parts[1],
      day: parts[1].substring(0, 2),
      month: parts[1].substring(2, 4),
      categoryCode: parts[2],
      keyword: parts[3],
      sequential: parts[4]
    };
  }
}

export default AIEventNamingService;
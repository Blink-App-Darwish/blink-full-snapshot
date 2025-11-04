/**
 * Optimized Image Generation Component
 * Handles AI image generation with timeout, retry, and fallback logic
 */

import { GenerateImage } from "@/api/integrations";

class OptimizedImageGenerator {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.maxRetries = 2;
    this.timeoutMs = 15000; // 15 seconds
  }

  /**
   * Generate image with retry logic and caching
   */
  async generateImage(prompt, options = {}) {
    const {
      cacheKey = null,
      retries = this.maxRetries,
      timeout = this.timeoutMs,
      onProgress = null
    } = options;

    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      return { success: true, url: this.cache.get(cacheKey), cached: true };
    }

    // Check if same request is already pending
    if (cacheKey && this.pendingRequests.has(cacheKey)) {
      return await this.pendingRequests.get(cacheKey);
    }

    // Create promise for this request
    const requestPromise = this._generateWithRetry(prompt, retries, timeout, onProgress);
    
    if (cacheKey) {
      this.pendingRequests.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;
      
      // Cache successful result
      if (result.success && result.url && cacheKey) {
        this.cache.set(cacheKey, result.url);
      }
      
      return result;
    } finally {
      if (cacheKey) {
        this.pendingRequests.delete(cacheKey);
      }
    }
  }

  /**
   * Internal method with retry logic
   */
  async _generateWithRetry(prompt, retriesLeft, timeout, onProgress) {
    try {
      if (onProgress) onProgress({ status: 'generating', retriesLeft });

      // Race between image generation and timeout
      const result = await Promise.race([
        GenerateImage({ prompt }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image generation timeout')), timeout)
        )
      ]);

      if (onProgress) onProgress({ status: 'success' });
      return { success: true, url: result.url, retries: this.maxRetries - retriesLeft };

    } catch (error) {
      console.warn(`Image generation failed (${retriesLeft} retries left):`, error.message);

      // Retry logic
      if (retriesLeft > 0) {
        if (onProgress) onProgress({ status: 'retrying', retriesLeft: retriesLeft - 1 });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, (this.maxRetries - retriesLeft + 1) * 1000));
        return this._generateWithRetry(prompt, retriesLeft - 1, timeout, onProgress);
      }

      // All retries exhausted
      if (onProgress) onProgress({ status: 'failed', error: error.message });
      return { 
        success: false, 
        error: error.message,
        retries: this.maxRetries
      };
    }
  }

  /**
   * Batch generate multiple images with concurrency control
   */
  async generateBatch(prompts, options = {}) {
    const { concurrency = 2, onProgress = null } = options;
    const results = [];
    
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map((prompt, idx) => 
          this.generateImage(prompt, {
            ...options,
            cacheKey: `batch_${i + idx}`,
            onProgress: onProgress ? (progress) => onProgress({ 
              ...progress, 
              index: i + idx, 
              total: prompts.length 
            }) : null
          })
        )
      );
      
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }));
    }
    
    return results;
  }

  /**
   * Clear cache
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get fallback image URL based on event type
   */
  getFallbackImage(eventType) {
    const fallbacks = {
      wedding: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
      birthday: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
      corporate: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
      conference: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80",
      product_launch: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
      baby_shower: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80",
      dinner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
      other: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"
    };
    
    return fallbacks[eventType] || fallbacks.other;
  }
}

// Singleton instance
const imageGenerator = new OptimizedImageGenerator();

export default imageGenerator;
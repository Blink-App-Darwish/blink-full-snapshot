/**
 * Security Validator
 * Input validation, sanitization, and security checks
 */

class SecurityValidator {
  constructor() {
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    this.maxImageSize = 5 * 1024 * 1024; // 5MB
    this.maxDocumentSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    if (!email) return { valid: false, error: "Email is required" };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: "Invalid email format" };
    }
    
    return { valid: true };
  }

  /**
   * Validate phone number
   */
  validatePhone(phone) {
    if (!phone) return { valid: false, error: "Phone number is required" };
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length < 10 || digits.length > 15) {
      return { valid: false, error: "Phone number must be 10-15 digits" };
    }
    
    return { valid: true, sanitized: digits };
  }

  /**
   * Validate and sanitize text input
   */
  validateText(text, options = {}) {
    const {
      minLength = 0,
      maxLength = 10000,
      required = false,
      fieldName = "Field"
    } = options;

    if (!text || text.trim() === '') {
      if (required) {
        return { valid: false, error: `${fieldName} is required` };
      }
      return { valid: true, sanitized: '' };
    }

    const trimmed = text.trim();

    if (trimmed.length < minLength) {
      return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
    }

    if (trimmed.length > maxLength) {
      return { valid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
    }

    // Remove potentially dangerous HTML/scripts
    const sanitized = this._sanitizeHTML(trimmed);

    return { valid: true, sanitized };
  }

  /**
   * Validate number
   */
  validateNumber(value, options = {}) {
    const {
      min = Number.MIN_SAFE_INTEGER,
      max = Number.MAX_SAFE_INTEGER,
      required = false,
      fieldName = "Field"
    } = options;

    if (value === null || value === undefined || value === '') {
      if (required) {
        return { valid: false, error: `${fieldName} is required` };
      }
      return { valid: true, sanitized: null };
    }

    const num = Number(value);

    if (isNaN(num)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }

    if (num < min) {
      return { valid: false, error: `${fieldName} must be at least ${min}` };
    }

    if (num > max) {
      return { valid: false, error: `${fieldName} must be no more than ${max}` };
    }

    return { valid: true, sanitized: num };
  }

  /**
   * Validate file upload
   */
  validateFile(file, options = {}) {
    const {
      type = 'image', // 'image' or 'document'
      maxSize = type === 'image' ? this.maxImageSize : this.maxDocumentSize
    } = options;

    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    // Check file type
    const allowedTypes = type === 'image' ? this.allowedImageTypes : this.allowedDocumentTypes;
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
      };
    }

    // Check filename for suspicious patterns
    const filename = file.name.toLowerCase();
    const suspiciousPatterns = ['.exe', '.sh', '.bat', '.cmd', '.php', '.js'];
    
    for (const pattern of suspiciousPatterns) {
      if (filename.endsWith(pattern)) {
        return { valid: false, error: "Suspicious file type detected" };
      }
    }

    return { valid: true, file };
  }

  /**
   * Validate URL
   */
  validateURL(url, options = {}) {
    const { required = false } = options;

    if (!url || url.trim() === '') {
      if (required) {
        return { valid: false, error: "URL is required" };
      }
      return { valid: true, sanitized: '' };
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: "URL must use http or https protocol" };
      }

      return { valid: true, sanitized: url };
    } catch (error) {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  /**
   * Validate date
   */
  validateDate(date, options = {}) {
    const {
      min = null,
      max = null,
      required = false,
      fieldName = "Date"
    } = options;

    if (!date) {
      if (required) {
        return { valid: false, error: `${fieldName} is required` };
      }
      return { valid: true, sanitized: null };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: `${fieldName} is invalid` };
    }

    if (min && dateObj < new Date(min)) {
      return { valid: false, error: `${fieldName} must be after ${new Date(min).toLocaleDateString()}` };
    }

    if (max && dateObj > new Date(max)) {
      return { valid: false, error: `${fieldName} must be before ${new Date(max).toLocaleDateString()}` };
    }

    return { valid: true, sanitized: dateObj.toISOString() };
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  _sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Validate booking data
   */
  validateBookingData(data) {
    const errors = {};

    // Validate required fields
    if (!data.enabler_id) errors.enabler_id = "Enabler is required";
    if (!data.event_id) errors.event_id = "Event is required";
    
    const amountValidation = this.validateNumber(data.total_amount, {
      min: 0,
      required: true,
      fieldName: "Amount"
    });
    if (!amountValidation.valid) errors.total_amount = amountValidation.error;

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Validate event data
   */
  validateEventData(data) {
    const errors = {};

    const nameValidation = this.validateText(data.name, {
      minLength: 3,
      maxLength: 100,
      required: true,
      fieldName: "Event name"
    });
    if (!nameValidation.valid) errors.name = nameValidation.error;

    const dateValidation = this.validateDate(data.date, {
      min: new Date().toISOString(),
      required: true,
      fieldName: "Event date"
    });
    if (!dateValidation.valid) errors.date = dateValidation.error;

    const guestCountValidation = this.validateNumber(data.guest_count, {
      min: 1,
      max: 100000,
      fieldName: "Guest count"
    });
    if (!guestCountValidation.valid) errors.guest_count = guestCountValidation.error;

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Validate enabler profile data
   */
  validateEnablerProfile(data) {
    const errors = {};

    const nameValidation = this.validateText(data.business_name, {
      minLength: 2,
      maxLength: 100,
      required: true,
      fieldName: "Business name"
    });
    if (!nameValidation.valid) errors.business_name = nameValidation.error;

    if (!data.category) {
      errors.category = "Category is required";
    }

    const priceValidation = this.validateNumber(data.base_price, {
      min: 0,
      max: 1000000,
      fieldName: "Base price"
    });
    if (!priceValidation.valid) errors.base_price = priceValidation.error;

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }
}

export default new SecurityValidator();
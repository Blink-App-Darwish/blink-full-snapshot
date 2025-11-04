// Mock Base44 Client for Local Development
// Stores data in localStorage instead of Base44 backend

const STORAGE_PREFIX = 'blink_local_';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to get timestamp
const getTimestamp = () => new Date().toISOString();

// Mock entity storage
const getEntityData = (entityName) => {
  const key = `${STORAGE_PREFIX}${entityName}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setEntityData = (entityName, data) => {
  const key = `${STORAGE_PREFIX}${entityName}`;
  localStorage.setItem(key, JSON.stringify(data));
};

// Mock user
const MOCK_USER = {
  id: 'local-user-001',
  email: 'dev@local.com',
  full_name: 'Local Developer',
  role: 'admin',
  user_type: 'both',
  profile_completed: true,
  created_date: getTimestamp(),
  updated_date: getTimestamp(),
};

// Create mock entity operations
const createMockEntity = (entityName) => ({
  list: async (orderBy = '-created_date', limit = 100) => {
    console.log(`📦 [MOCK] Listing ${entityName}`);
    let data = getEntityData(entityName);

    // Sort
    if (orderBy) {
      const isDesc = orderBy.startsWith('-');
      const field = isDesc ? orderBy.substring(1) : orderBy;
      data.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal < bVal) return isDesc ? 1 : -1;
        if (aVal > bVal) return isDesc ? -1 : 1;
        return 0;
      });
    }

    return data.slice(0, limit);
  },

  filter: async (filters = {}, orderBy = '-created_date', limit = 100) => {
    console.log(`🔍 [MOCK] Filtering ${entityName}`, filters);
    let data = getEntityData(entityName);

    // Apply filters
    data = data.filter((item) => {
      return Object.keys(filters).every((key) => {
        return item[key] === filters[key];
      });
    });

    // Sort
    if (orderBy) {
      const isDesc = orderBy.startsWith('-');
      const field = isDesc ? orderBy.substring(1) : orderBy;
      data.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal < bVal) return isDesc ? 1 : -1;
        if (aVal > bVal) return isDesc ? -1 : 1;
        return 0;
      });
    }

    return data.slice(0, limit);
  },

  create: async (data) => {
    console.log(`➕ [MOCK] Creating ${entityName}`, data);
    const allData = getEntityData(entityName);
    const newItem = {
      ...data,
      id: generateId(),
      created_date: getTimestamp(),
      updated_date: getTimestamp(),
      created_by: MOCK_USER.email,
    };
    allData.push(newItem);
    setEntityData(entityName, allData);
    return newItem;
  },

  update: async (id, updates) => {
    console.log(`✏️ [MOCK] Updating ${entityName}/${id}`, updates);
    const allData = getEntityData(entityName);
    const index = allData.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`${entityName} with id ${id} not found`);
    }

    allData[index] = {
      ...allData[index],
      ...updates,
      updated_date: getTimestamp(),
    };

    setEntityData(entityName, allData);
    return allData[index];
  },

  delete: async (id) => {
    console.log(`🗑️ [MOCK] Deleting ${entityName}/${id}`);
    const allData = getEntityData(entityName);
    const filtered = allData.filter((item) => item.id !== id);
    setEntityData(entityName, filtered);
    return { success: true };
  },

  bulkCreate: async (items) => {
    console.log(`➕➕ [MOCK] Bulk creating ${items.length} ${entityName}s`);
    const allData = getEntityData(entityName);
    const newItems = items.map((item) => ({
      ...item,
      id: generateId(),
      created_date: getTimestamp(),
      updated_date: getTimestamp(),
      created_by: MOCK_USER.email,
    }));
    allData.push(...newItems);
    setEntityData(entityName, allData);
    return newItems;
  },

  schema: async () => {
    console.log(`📋 [MOCK] Getting schema for ${entityName}`);
    return {}; // Return empty schema for now
  },
});

// Mock auth operations
const mockAuth = {
  me: async () => {
    console.log('🔍 [MOCK] Checking authentication...');

    // Check for stored token
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    console.log('🔍 [MOCK] Found stored credentials:', {
      token,
      userId,
      userEmail,
    });

    if (!token || !userId) {
      console.log('❌ [MOCK] No stored credentials - not authenticated');
      throw new Error('Not authenticated');
    }

    // Try to get stored user object
    const storedUser = localStorage.getItem('blink_local_current_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      console.log('✅ [MOCK] Returning stored user:', user);
      return user;
    }

    // Fallback: create user from stored credentials
    const user = {
      id: userId,
      email: userEmail,
      full_name: userEmail.split('@')[0],
      role: 'admin',
      user_type: null, // Will be set during role selection
      profile_completed: false,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };

    console.log('✅ [MOCK] Created user from stored credentials:', user);
    return user;
  },

  login: async (email, password) => {
    console.log('🔐 [MOCK] Login attempt', { email });

    // Mock validation - accept any credentials in dev
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    // Create/return mock user
    const user = {
      id: 'local-user-' + generateId(),
      email: email,
      full_name: email.split('@')[0],
      role: 'admin',
      user_type: 'host',
      profile_completed: false,
      created_date: getTimestamp(),
      updated_date: getTimestamp(),
    };

    // Store user
    localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(user));
    localStorage.setItem('auth_token', 'mock-token-' + generateId());
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_email', user.email);

    console.log('✅ [MOCK] Login successful', user);

    return {
      token: 'mock-token-' + generateId(),
      user: user,
    };
  },

  signup: async (email, password, fullName) => {
    console.log('📝 [MOCK] Signup attempt', { email, fullName });

    if (!email || !password) {
      throw new Error('Email and password required');
    }

    // Create new user
    const user = {
      id: 'local-user-' + generateId(),
      email: email,
      full_name: fullName || email.split('@')[0],
      role: 'user',
      user_type: null, // Will be set in role selection
      profile_completed: false,
      created_date: getTimestamp(),
      updated_date: getTimestamp(),
    };

    // Store user
    localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(user));
    localStorage.setItem('auth_token', 'mock-token-' + generateId());
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_email', user.email);

    console.log('✅ [MOCK] Signup successful', user);

    return {
      token: 'mock-token-' + generateId(),
      user: user,
    };
  },

  updateMe: async (data) => {
    console.log('📝 [MOCK] Updating user profile:', data);

    // Get current user
    const storedUser = localStorage.getItem('blink_local_current_user');
    if (!storedUser) {
      throw new Error('No user found');
    }

    const user = JSON.parse(storedUser);

    // Update user object
    const updatedUser = {
      ...user,
      ...data,
      updated_date: new Date().toISOString(),
    };

    // Save back to localStorage
    localStorage.setItem(
      'blink_local_current_user',
      JSON.stringify(updatedUser)
    );

    console.log('✅ [MOCK] User updated:', updatedUser);
    return updatedUser;
  },

  isAuthenticated: async () => {
    console.log('🔐 [MOCK] Checking authentication');
    return !!localStorage.getItem('auth_token');
  },

  logout: (redirectUrl) => {
    console.log('👋 [MOCK] Logging out');
    localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.reload();
    }
  },

  redirectToLogin: (nextUrl) => {
    console.log('🔐 [MOCK] Redirect to login (staying local)');
    if (nextUrl) {
      window.location.href = nextUrl;
    }
  },
};

// Mock integrations
const mockIntegrations = {
  Core: {
    InvokeLLM: async (params) => {
      console.log('🤖 [MOCK] InvokeLLM called', params);

      // Return mock response based on prompt
      if (params.response_json_schema) {
        return { mock: true, message: 'Mock LLM response' };
      }
      return 'Mock LLM text response';
    },

    UploadFile: async ({ file }) => {
      console.log('📤 [MOCK] UploadFile called');
      return { file_url: URL.createObjectURL(file) };
    },

    SendEmail: async (params) => {
      console.log('📧 [MOCK] SendEmail called', params);
      return { success: true };
    },

    GenerateImage: async ({ prompt }) => {
      console.log('🎨 [MOCK] GenerateImage called', prompt);
      return {
        url: 'https://via.placeholder.com/800x600?text=Mock+Generated+Image',
      };
    },
  },
};

// Create proxy for entities
const entitiesProxy = new Proxy(
  {},
  {
    get: (target, entityName) => {
      if (!target[entityName]) {
        target[entityName] = createMockEntity(entityName);
      }
      return target[entityName];
    },
  }
);

// Create mock agents
const mockAgents = {
  createConversation: async ({ agent_name, metadata }) => {
    console.log('🤖 [MOCK] Creating conversation', agent_name);
    return {
      id: generateId(),
      agent_name,
      metadata,
      messages: [],
      created_date: getTimestamp(),
    };
  },

  listConversations: async ({ agent_name }) => {
    console.log('🤖 [MOCK] Listing conversations', agent_name);
    return [];
  },

  getConversation: async (conversationId) => {
    console.log('🤖 [MOCK] Getting conversation', conversationId);
    return {
      id: conversationId,
      messages: [],
    };
  },

  updateConversation: async (conversationId, updates) => {
    console.log('🤖 [MOCK] Updating conversation', conversationId);
    return { id: conversationId, ...updates };
  },

  addMessage: async (conversation, message) => {
    console.log('🤖 [MOCK] Adding message', message);
    return { ...conversation, messages: [...conversation.messages, message] };
  },

  subscribeToConversation: (conversationId, callback) => {
    console.log('🤖 [MOCK] Subscribing to conversation', conversationId);
    return () => console.log('🤖 [MOCK] Unsubscribed');
  },

  getWhatsAppConnectURL: (agentName) => {
    console.log('🤖 [MOCK] Getting WhatsApp URL', agentName);
    return '#';
  },
};

// Export mock client
export const base44 = {
  entities: entitiesProxy,
  auth: mockAuth,
  integrations: mockIntegrations,
  agents: mockAgents,
};

console.log('🚀 [MOCK] Base44 Mock Client initialized for local development');

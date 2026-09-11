import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

function parseFilterArgs(arg1, arg2, arg3) {
  let opts = {};
  if (typeof arg1 === 'string') {
    opts.sort = arg1;
    if (typeof arg2 === 'number') {
      opts.limit = arg2;
    } else if (arg2 && typeof arg2 === 'object') {
      Object.assign(opts, arg2);
    }
  } else if (arg1 && typeof arg1 === 'object') {
    Object.assign(opts, arg1);
    if (typeof arg2 === 'string') {
      opts.sort = arg2;
    }
    if (typeof arg3 === 'number') {
      opts.limit = arg3;
    }
  }
  return opts;
}

function buildQuery(tableName, params = {}) {
  let query = supabase.from(tableName).select('*');

  if (params.sort) {
    if (typeof params.sort === 'string' && params.sort.startsWith('-')) {
      query = query.order(params.sort.slice(1), { ascending: false });
    } else if (typeof params.sort === 'string') {
      const asc = params.order !== 'desc';
      query = query.order(params.sort, { ascending: asc });
    }
  }

  if (params.offset !== undefined && params.limit !== undefined) {
    query = query.range(params.offset, params.offset + params.limit - 1);
  } else if (params.limit !== undefined) {
    query = query.limit(params.limit);
  } else if (params.offset !== undefined) {
    query = query.range(params.offset, params.offset + 49);
  }

  const reserved = new Set(['sort', 'order', 'limit', 'offset']);
  for (const [key, val] of Object.entries(params)) {
    if (reserved.has(key) || val === undefined) continue;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      if ('$in' in val) query = query.in(key, val.$in);
      if ('$ne' in val) query = query.neq(key, val.$ne);
      if ('$gt' in val) query = query.gt(key, val.$gt);
      if ('$gte' in val) query = query.gte(key, val.$gte);
      if ('$lt' in val) query = query.lt(key, val.$lt);
      if ('$lte' in val) query = query.lte(key, val.$lte);
      if ('$like' in val) query = query.ilike(key, val.$like);
    } else {
      query = query.eq(key, val);
    }
  }

  return query;
}

const entityMethodsCache = new Map();

function getEntityMethods(entityName) {
  if (entityMethodsCache.has(entityName)) {
    return entityMethodsCache.get(entityName);
  }

  const methods = {
    list: async (arg1, arg2) => {
      const params = parseFilterArgs(arg1, arg2);
      const { data, error } = await buildQuery(entityName, params);
      if (error) throw error;
      return data || [];
    },
    filter: async (arg1, arg2, arg3) => {
      const params = parseFilterArgs(arg1, arg2, arg3);
      const { data, error } = await buildQuery(entityName, params);
      if (error) throw error;
      return data || [];
    },
    get: async (id) => {
      const { data, error } = await supabase
        .from(entityName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    create: async (recordData) => {
      const { data, error } = await supabase
        .from(entityName)
        .insert(recordData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, recordData) => {
      const { data, error } = await supabase
        .from(entityName)
        .update(recordData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from(entityName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
    subscribe: () => () => {},
  };

  entityMethodsCache.set(entityName, methods);
  return methods;
}

export function createClient(opts = {}) {
  const auth = {
    me: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return null;
      const user = session.user;
      let role = 'user';
      let full_name = user.user_metadata?.full_name || null;

      try {
        const { data: userData } = await supabase
          .from('User')
          .select('role, full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (userData) {
          if (userData.role) role = userData.role;
          if (userData.full_name) full_name = userData.full_name;
        }
      } catch (e) {
        // ignore errors
      }

      return {
        id: user.id,
        email: user.email,
        full_name,
        role,
      };
    },
    loginViaEmailPassword: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    register: async ({ email, password, full_name }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });
      if (error) throw error;
      return data;
    },
    loginWithProvider: async (provider = 'google', redirectTo) => {
      let redirectUrl = redirectTo || window.location.origin;
      if (redirectUrl.startsWith('/')) {
        redirectUrl = window.location.origin + redirectUrl;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      return data;
    },
    logout: async (redirectUrl) => {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('SignOut error:', error);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return Boolean(session);
    },
    resetPasswordRequest: async (email) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return data;
    },
    resetPassword: async (opts) => {
      const newPassword = typeof opts === 'string' ? opts : opts?.newPassword;
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data;
    },
    verifyOtp: async (opts) => {
      const { email, token, otpCode, type = 'signup' } = opts || {};
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: token || otpCode,
        type,
      });
      if (error) throw error;
      return {
        ...data,
        access_token: data.session?.access_token,
      };
    },
    resendOtp: async (email) => {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      return data;
    },
    setToken: () => {},
    redirectToLogin: (returnTo) => {
      const target = returnTo || window.location.href;
      window.location.href = `/login?returnTo=${encodeURIComponent(target)}`;
    },
  };

  const entities = new Proxy({}, {
    get(target, prop) {
      if (typeof prop === 'string') {
        return getEntityMethods(prop);
      }
      return target[prop];
    },
  });

  const functions = {
    invoke: async (name, args) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/functions/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args || {}),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || resData.message || `Function ${name} failed`);
      }
      return resData;
    },
  };

  const integrations = {
    Core: {
      InvokeLLM: async (payload) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/llm', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload || {}),
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || resData.message || 'LLM invocation failed');
        }
        return resData;
      },
    },
  };

  const agents = {
    subscribeToConversation: (id, callback) => () => {},
    listConversations: async () => [],
    createConversation: async () => ({ id: 'conv-1' }),
    addMessage: async () => ({}),
  };

  return {
    auth,
    entities,
    functions,
    integrations,
    agents,
  };
}

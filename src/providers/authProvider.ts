import type { AuthProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase/client";

export const authProvider: AuthProvider = {
  login: async ({ email, password, provider }) => {
    if (!supabase) {
      return {
        success: false,
        error: {
          name: "Supabase Error",
          message: "Supabase client is not configured",
        },
      };
    }

    try {
      if (provider) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
        });
        if (error) {
          return {
            success: false,
            error: {
              name: "OAuth Error",
              message: error.message,
            },
          };
        }
        return {
          success: true,
          redirectTo: "/",
        };
      }

      if (email && password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return {
            success: false,
            error: {
              name: "Login Error",
              message: error.message,
            },
          };
        }

        return {
          success: true,
          redirectTo: "/",
        };
      }

      return {
        success: false,
        error: {
          name: "Login Error",
          message: "Email and password or OAuth provider required",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "Login Error",
          message: error?.message || "Failed to login",
        },
      };
    }
  },

  logout: async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return {
          success: false,
          error: {
            name: "Logout Error",
            message: error.message,
          },
        };
      }
    }

    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    if (!supabase) {
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }

    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!session) {
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }

    return {
      authenticated: true,
    };
  },

  getPermissions: async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return data.user.app_metadata?.role || "authenticated";
    }
    return null;
  },

  getIdentity: async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || data.user.email,
        email: data.user.email,
        avatar: data.user.user_metadata?.avatar_url,
      };
    }
    return null;
  },

  onError: async (error) => {
    if (error?.status === 401 || error?.status === 403) {
      return {
        logout: true,
        redirectTo: "/login",
        error,
      };
    }
    return { error };
  },
};

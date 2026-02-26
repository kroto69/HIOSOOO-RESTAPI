import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { LoginResponse, AuthUser } from "@/types/api";

type AuthState = {
  token: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  setSession: (payload: LoginResponse) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      user: null,
      setSession: (payload) =>
        set({
          token: payload.access_token,
          expiresAt: payload.expires_at,
          user: payload.user,
        }),
      clearSession: () =>
        set({
          token: null,
          expiresAt: null,
          user: null,
        }),
    }),
    {
      name: "olt-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token: state.token,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
    }
  )
);

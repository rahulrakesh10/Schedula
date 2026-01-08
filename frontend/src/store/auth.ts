import { create } from "zustand";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: "Admin" | "Client";
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    data: Omit<User, "id"> & { password: string; role: "Admin" | "Client" }
  ) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  async login(email, password) {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/login", { email, password });
      const { user, token } = res.data;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("schedula_token", token);
        window.localStorage.setItem("schedula_user", JSON.stringify(user));
      }
      set({ user, token, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.error?.message ?? "Login failed"
      });
    }
  },
  async register(data) {
    try {
      set({ loading: true, error: null });
      const res = await api.post("/register", {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role
      });
      const { user, token } = res.data;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("schedula_token", token);
        window.localStorage.setItem("schedula_user", JSON.stringify(user));
      }
      set({ user, token, loading: false });
    } catch (err: any) {
      set({
        loading: false,
        error: err?.response?.data?.error?.message ?? "Registration failed"
      });
    }
  },
  logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("schedula_token");
      window.localStorage.removeItem("schedula_user");
    }
    set({ user: null, token: null });
  }
}));



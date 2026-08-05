import Taro from "@tarojs/taro";
import { api, WechatLoginResponse } from "../services/api";

interface AuthState {
  token: string | null;
  user: WechatLoginResponse["user"] | null;
  isLoggedIn: boolean;
}

const state: AuthState = {
  token: null,
  user: null,
  isLoggedIn: false,
};

const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export const authStore = {
  getState(): AuthState {
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async loginWithWechat(): Promise<{ success: boolean; isNew: boolean }> {
    try {
      // 1. Get code from WeChat
      const loginRes = await Taro.login();
      if (!loginRes.code) {
        return { success: false, isNew: false };
      }

      // 2. Exchange code for JWT via backend
      const data = await api.wechatLogin(loginRes.code);

      // 3. Persist
      Taro.setStorageSync("token", data.token);
      Taro.setStorageSync("user", data.user);

      state.token = data.token;
      state.user = data.user;
      state.isLoggedIn = true;
      notify();

      return { success: true, isNew: data.isNew };
    } catch {
      return { success: false, isNew: false };
    }
  },

  logout() {
    Taro.removeStorageSync("token");
    Taro.removeStorageSync("user");
    state.token = null;
    state.user = null;
    state.isLoggedIn = false;
    notify();
  },

  /** Restore session from storage on app start. Returns true if session restored. */
  restoreSession(): boolean {
    try {
      const token = Taro.getStorageSync("token");
      const user = Taro.getStorageSync("user");
      if (token && user) {
        state.token = token;
        state.user = user;
        state.isLoggedIn = true;
        notify();
        return true;
      }
    } catch {
      // Storage read failed
    }
    return false;
  },
};
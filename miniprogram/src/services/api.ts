import Taro from "@tarojs/taro";

// --- Config ---

const BASE_URL = process.env.TARO_APP_API_URL || "http://localhost:3000";

// --- Types ---

export interface WechatLoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    nickname: string;
    role: string;
    currentChildId?: string | null;
  };
  isNew: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    nickname: string;
    role: string;
    currentChildId?: string | null;
  };
}

export interface ChildData {
  id: string;
  parentId: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
  pet: string;
  account?: { id: string; username: string; nickname: string } | null;
}

export interface CheckInStatus {
  recordId: string;
  date: string;
  allCompleted: boolean;
  bonusEarned: boolean;
  tasks: CheckInTaskItem[];
}

export interface CheckInTaskItem {
  id: string;
  subject: string;
  taskType: string;
  completed: boolean;
  pointsEarned: number;
  completedAt?: string;
}

export interface CompleteTaskResult {
  task: CheckInTaskItem;
  pointsEarned: number;
  allCompleted: boolean;
  bonusEarned: boolean;
}

export interface CalendarDay {
  date: string;
  checkedIn: boolean;
  allCompleted: boolean;
}

export interface LearningRecordItem {
  id: string;
  childId: string;
  subject: string;
  charId: string;
  type: string;
  correct: boolean;
  createdAt: string;
}

// --- Core Request ---

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  skipAuth?: boolean;
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, skipAuth } = options;

  const header: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = Taro.getStorageSync("token");
    if (token) {
      header["Authorization"] = `Bearer ${token}`;
    }
  }

  let res: Taro.request.SuccessCallbackResult<{ error?: string } & T>;

  try {
    res = await Taro.request({
      url: `${BASE_URL}${path}`,
      method,
      header,
      data: body,
    });
  } catch (err) {
    // Network error (offline, DNS failure, etc.)
    throw new Error("网络连接失败，请检查网络");
  }

  if (res.statusCode === 401) {
    Taro.removeStorageSync("token");
    Taro.removeStorageSync("user");
    Taro.reLaunch({ url: "/pages/index/index" });
    throw new Error("登录已过期");
  }

  if (res.statusCode >= 400) {
    throw new Error(res.data?.error || "请求失败");
  }

  return res.data as T;
}

// --- API Methods ---

export const api = {
  // -- Auth --

  wechatLogin(code: string): Promise<WechatLoginResponse> {
    return request({
      method: "POST",
      path: "/api/wechat/login",
      body: { code },
      skipAuth: true,
    });
  },

  passwordLogin(username: string, password: string): Promise<LoginResponse> {
    return request({
      method: "POST",
      path: "/api/auth/login",
      body: { username, password },
      skipAuth: true,
    });
  },

  register(username: string, password: string, nickname?: string): Promise<{ success: boolean }> {
    return request({
      method: "POST",
      path: "/api/auth/register",
      body: { username, password, nickname },
      skipAuth: true,
    });
  },

  // -- Children (parent) --

  getChildren(): Promise<ChildData[]> {
    return request({ method: "GET", path: "/api/children" });
  },

  getChild(childId: string): Promise<ChildData> {
    return request({ method: "GET", path: `/api/children?id=${childId}` });
  },

  createChild(name: string, avatar?: string): Promise<ChildData> {
    return request({ method: "POST", path: "/api/children", body: { name, avatar } });
  },

  deleteChild(childId: string): Promise<void> {
    return request({ method: "DELETE", path: `/api/children/${childId}` });
  },

  // -- Check-in --

  getCheckinToday(childId: string): Promise<CheckInStatus> {
    return request({ method: "GET", path: `/api/checkin?childId=${childId}` });
  },

  completeCheckinTask(childId: string, taskId: string): Promise<CompleteTaskResult> {
    return request({
      method: "POST",
      path: "/api/checkin",
      body: { childId, taskId },
    });
  },

  getCalendar(childId: string, month: string): Promise<CalendarDay[]> {
    return request({
      method: "GET",
      path: `/api/checkin/calendar?childId=${childId}&month=${month}`,
    });
  },

  // -- Learning --

  getLearningContent(subject: string, childId?: string, level?: number): Promise<unknown> {
    const params = new URLSearchParams();
    if (childId) params.set("childId", childId);
    if (level !== undefined) params.set("level", String(level));
    const qs = params.toString();
    return request({
      method: "GET",
      path: `/api/learning/${subject}${qs ? `?${qs}` : ""}`,
    });
  },

  saveLearningRecord(data: {
    childId: string;
    subject: string;
    charId: string;
    correct: boolean;
  }): Promise<{ record: LearningRecordItem }> {
    return request({
      method: "POST",
      path: "/api/learning/record",
      body: data as unknown as Record<string, unknown>,
    });
  },

  getLearningRecords(
    childId: string,
    subject: string,
    date?: string,
  ): Promise<LearningRecordItem[]> {
    const params = new URLSearchParams({ childId, subject });
    if (date) params.set("date", date);
    return request({
      method: "GET",
      path: `/api/learning/record?${params.toString()}`,
    });
  },

  // -- Pet --

  feedPet(): Promise<{ pet: string; points: number }> {
    return request({ method: "POST", path: "/api/pet/feed" });
  },

  // -- Shop --

  buyItem(itemId: string): Promise<unknown> {
    return request({ method: "POST", path: "/api/shop/buy", body: { itemId } });
  },

  // -- Report --

  getReport(childId: string): Promise<unknown> {
    return request({ method: "GET", path: `/api/report?childId=${childId}` });
  },

  // -- Settings --

  getSettings(): Promise<unknown> {
    return request({ method: "GET", path: "/api/settings" });
  },
};
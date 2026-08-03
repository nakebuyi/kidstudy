/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChildrenPage from "./page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock @/store/ChildContext
const mockUseChild = vi.fn();
vi.mock("@/store/ChildContext", () => ({
  useChild: () => mockUseChild(),
}));

// Shallow mock @/components/layout/DesktopLayout
vi.mock("@/components/layout/DesktopLayout", () => ({
  DesktopLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Plus: () => <span>+</span>,
  Check: () => <span>✓</span>,
}));

// Mock UI primitives used by the page
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const baseChild = {
  id: "c1",
  name: "小明",
  avatar: "👦",
  points: 10,
  streak: 2,
  maxStreak: 5,
  totalCheckIns: 3,
  pet: JSON.stringify({ type: "cat", name: "小咪", level: 1, mood: "normal" }),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChild.mockReturnValue({
    child: baseChild,
    children: [],
    setCurrentChild: vi.fn(),
    refreshChildren: vi.fn(),
  });
});

describe("ChildrenPage account display", () => {
  it("shows 创建登录账号 button for a child without an account", () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [baseChild],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<ChildrenPage />);
    expect(screen.getByText(/创建登录账号/)).toBeInTheDocument();
    expect(screen.queryByText(/登录账号：/)).toBeNull();
  });

  it("shows account name instead of 创建登录账号 button for a child with an account", () => {
    const withAccount = {
      ...baseChild,
      account: { id: "a1", username: "xiaoming", nickname: "小明昵称" },
    };
    mockUseChild.mockReturnValue({
      child: withAccount,
      children: [withAccount],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<ChildrenPage />);
    expect(screen.getByText(/登录账号：小明昵称/)).toBeInTheDocument();
    expect(screen.queryByText(/创建登录账号/)).toBeNull();
  });

  it("handles a mixed list: one with account, one without", () => {
    const withAccount = {
      ...baseChild,
      account: { id: "a1", username: "xiaoming", nickname: "小明昵称" },
    };
    const withoutAccount = { ...baseChild, id: "c2", name: "小红" };
    mockUseChild.mockReturnValue({
      child: withAccount,
      children: [withAccount, withoutAccount],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<ChildrenPage />);
    expect(screen.getByText(/登录账号：小明昵称/)).toBeInTheDocument();
    expect(screen.getByText(/创建登录账号/)).toBeInTheDocument();
  });
});

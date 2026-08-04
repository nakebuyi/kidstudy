/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  Trash2: () => <span>🗑</span>,
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
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe("ChildrenPage delete", () => {
  it("renders delete button on each child card", () => {
    const children = [
      { ...baseChild, id: "c1", name: "小明" },
      { ...baseChild, id: "c2", name: "小红" },
    ];
    mockUseChild.mockReturnValue({
      child: children[0],
      children,
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    const deleteButtons = screen.getAllByText("🗑");
    expect(deleteButtons).toHaveLength(2);
  });

  it("opens confirmation dialog when delete button is clicked", async () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    const deleteBtn = screen.getByText("🗑");
    await userEvent.click(deleteBtn);

    expect(screen.getByText(/确认删除孩子/)).toBeInTheDocument();
    expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入孩子姓名/)).toBeInTheDocument();
  });

  it("disables confirm button when name does not match", async () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小红"); // 不匹配

    const confirmBtn = screen.getByText("确认删除").closest("button");
    expect(confirmBtn).toBeDisabled();
  });

  it("enables confirm button when name matches", async () => {
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: vi.fn(),
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小明");

    const confirmBtn = screen.getByText("确认删除").closest("button");
    expect(confirmBtn).not.toBeDisabled();
  });

  it("calls removeChild and closes dialog on confirm", async () => {
    const mockRemoveChild = vi.fn().mockResolvedValue(undefined);
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: mockRemoveChild,
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小明");

    await userEvent.click(screen.getByText("确认删除"));

    expect(mockRemoveChild).toHaveBeenCalledWith("c1");
  });

  it("shows error message and keeps dialog open when deletion fails", async () => {
    const mockRemoveChild = vi.fn().mockRejectedValue(new Error("删除失败：存在关联数据"));
    mockUseChild.mockReturnValue({
      child: baseChild,
      children: [{ ...baseChild, id: "c1", name: "小明" }],
      setCurrentChild: vi.fn(),
      refreshChildren: vi.fn(),
      removeChild: mockRemoveChild,
    });

    render(<ChildrenPage />);
    await userEvent.click(screen.getByText("🗑"));

    const input = screen.getByPlaceholderText(/请输入孩子姓名/);
    await userEvent.type(input, "小明");

    await userEvent.click(screen.getByText("确认删除"));

    await waitFor(() => {
      expect(screen.getByText(/删除失败：存在关联数据/)).toBeInTheDocument();
    });
    // Dialog should remain open
    expect(screen.getByText(/确认删除孩子/)).toBeInTheDocument();
  });
});

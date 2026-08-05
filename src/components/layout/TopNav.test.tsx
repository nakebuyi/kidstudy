/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopNav } from "./TopNav";

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

// Mock next/navigation
const mockPathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock @/store/AuthContext
const mockUseAuth = vi.fn();
vi.mock("@/store/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock @/store/ChildContext
const mockUseChild = vi.fn();
vi.mock("@/store/ChildContext", () => ({
  useChild: () => mockUseChild(),
}));

// Mock @/components/ui/button
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

// Mock @/components/ui/dropdown-menu (base-ui portals are brittle in jsdom)
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <div onClick={onClick}>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseChild.mockReturnValue({ child: null });
  mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() });
});

describe("TopNav", () => {
  it("does not render 家长中心 for child role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "c1", role: "CHILD" },
      logout: vi.fn(),
    });

    render(<TopNav />);
    expect(screen.queryByText("家长中心")).toBeNull();
  });

  it("renders 家长中心 for parent role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "p1", role: "PARENT" },
      logout: vi.fn(),
    });

    render(<TopNav />);
    const link = screen.getByText(/家长中心/);
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/parent");
  });

  it("renders 退出 button", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "p1", role: "PARENT" },
      logout: vi.fn(),
    });

    render(<TopNav />);
    expect(screen.getByText("退出")).toBeInTheDocument();
  });

  it("hides subject tabs for parent role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "p1", role: "PARENT" },
      logout: vi.fn(),
    });

    render(<TopNav />);
    expect(screen.queryByText(/识字/)).toBeNull();
    expect(screen.queryByText(/拼音/)).toBeNull();
    expect(screen.queryByText(/英语/)).toBeNull();
    expect(screen.queryByText(/算数/)).toBeNull();
    expect(screen.queryByText(/古诗词/)).toBeNull();
  });

  it("shows subject tabs for child role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "c1", role: "CHILD" },
      logout: vi.fn(),
    });

    render(<TopNav />);
    // Desktop nav + mobile dropdown both render for child
    expect(screen.getAllByText(/识字/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/拼音/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/英语/).length).toBeGreaterThan(0);
  });
});

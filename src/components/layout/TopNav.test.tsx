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

// Mock next-auth/react
const mockSignOut = vi.fn();
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => mockUseSession(),
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
});

describe("TopNav", () => {
  it("does not render 家长中心 for child role", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "c1" }, role: "child" },
    });

    render(<TopNav />);
    expect(screen.queryByText("家长中心")).toBeNull();
  });

  it("renders 家长中心 for parent role", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "p1" }, role: "parent" },
    });

    render(<TopNav />);
    const link = screen.getByText(/家长中心/);
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/parent");
  });

  it("renders 退出 button", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "p1" }, role: "parent" },
    });

    render(<TopNav />);
    expect(screen.getByText("退出")).toBeInTheDocument();
  });
});
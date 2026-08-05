/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

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

// Mock @/components/pet/PetDisplay
vi.mock("@/components/pet/PetDisplay", () => ({
  PetDisplay: ({ pet }: { pet: { type: string; name: string; level: number } }) => (
    <div data-testid="pet-display">{pet.name} Lv.{pet.level}</div>
  ),
}));

// Mock @/components/dashboard/PointsDisplay
vi.mock("@/components/dashboard/PointsDisplay", () => ({
  PointsDisplay: ({ points }: { points: number }) => (
    <div data-testid="points-display">{points}</div>
  ),
}));

// Mock @/components/dashboard/StreakDisplay
vi.mock("@/components/dashboard/StreakDisplay", () => ({
  StreakDisplay: ({
    streak,
    maxStreak,
  }: {
    streak: number;
    maxStreak: number;
  }) => <div data-testid="streak-display">{streak}/{maxStreak}</div>,
}));

// Shallow mock @/components/ui/dropdown-menu
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

const mockChild = {
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
});

describe("Sidebar - child", () => {
  it("renders static nickname for child role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "account-1", role: "CHILD", nickname: "小明昵称" },
    });
    mockUseChild.mockReturnValue({
      child: mockChild,
      children: [],
      setCurrentChild: vi.fn(),
    });

    render(<Sidebar />);
    expect(screen.getByText("小明昵称")).toBeInTheDocument();
  });

  it("falls back to child.name when no nickname", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "account-1", role: "CHILD", nickname: "" },
    });
    mockUseChild.mockReturnValue({
      child: mockChild,
      children: [],
      setCurrentChild: vi.fn(),
    });

    render(<Sidebar />);
    expect(screen.getByText("小明")).toBeInTheDocument();
  });

  it("does not render child switcher for child role", () => {
    const setCurrentChild = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: "account-1", role: "CHILD", nickname: "小明昵称" },
    });
    mockUseChild.mockReturnValue({
      child: mockChild,
      children: [mockChild, { ...mockChild, id: "c2", name: "小红" }],
      setCurrentChild,
    });

    render(<Sidebar />);
    expect(screen.queryByText("小红")).toBeNull();
    expect(screen.queryByText("管理孩子")).toBeNull();
  });
});

describe("Sidebar - parent", () => {
  it("renders child switcher for parent role", () => {
    const setCurrentChild = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: "p1", role: "PARENT" },
    });
    mockUseChild.mockReturnValue({
      child: mockChild,
      children: [mockChild, { ...mockChild, id: "c2", name: "小红" }],
      setCurrentChild,
    });

    render(<Sidebar />);
    expect(screen.getAllByText("小明").length).toBeGreaterThan(0);
    expect(screen.getByText("小红")).toBeInTheDocument();
    expect(screen.getByText(/管理孩子/)).toBeInTheDocument();
  });

  it("renders pet, points, and streak", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "p1", role: "PARENT" },
    });
    mockUseChild.mockReturnValue({
      child: mockChild,
      children: [mockChild],
      setCurrentChild: vi.fn(),
    });

    render(<Sidebar />);
    expect(screen.getByTestId("pet-display")).toBeInTheDocument();
    expect(screen.getByTestId("points-display")).toBeInTheDocument();
    expect(screen.getByTestId("streak-display")).toBeInTheDocument();
  });
});

"use client";

import { useState } from "react";
import { useChild } from "@/store/ChildContext";
import { DesktopLayout } from "@/components/layout/DesktopLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Check, Trash2 } from "lucide-react";

const AVATARS = [
  { key: "👦", label: "男孩" },
  { key: "👧", label: "女孩" },
];

export default function ChildrenPage() {
  const { child, children, setCurrentChild, refreshChildren, removeChild } = useChild();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [avatar, setAvatar] = useState("👦");
  const [loading, setLoading] = useState(false);
  const [accountChildId, setAccountChildId] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountNickname, setAccountNickname] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  // 删除相关状态
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteChild = async () => {
    if (!deleteTarget || deleteConfirmName.trim() !== deleteTarget.name) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await removeChild(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmName("");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败，请稍后重试");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountChildId || !accountUsername.trim() || !accountPassword.trim() || !accountNickname.trim()) return;
    setAccountLoading(true);
    setAccountMessage("");
    const res = await fetch(`/api/children/${accountChildId}/account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: accountUsername.trim(),
        password: accountPassword,
        nickname: accountNickname.trim(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAccountMessage(`✅ 账号创建成功！用户名：${data.username}`);
      setAccountChildId(null);
      setAccountUsername("");
      setAccountPassword("");
      setAccountNickname("");
      await refreshChildren();
    } else {
      setAccountMessage(`❌ ${data.error || "创建失败"}`);
    }
    setAccountLoading(false);
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), avatar }),
    });
    if (res.ok) {
      setNewName("");
      setShowAdd(false);
      await refreshChildren();
    }
    setLoading(false);
  };

  return (
    <DesktopLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">👶 孩子管理</h1>
          <Button onClick={() => setShowAdd(!showAdd)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加孩子
          </Button>
        </div>

        {showAdd && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleAddChild} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="childName">孩子姓名</Label>
                  <Input
                    id="childName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="请输入孩子姓名"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>选择头像</Label>
                  <div className="flex gap-4">
                    {AVATARS.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        className={`w-16 h-16 text-3xl rounded-full border-2 flex items-center justify-center
                          ${avatar === a.key
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"}`}
                        onClick={() => setAvatar(a.key)}
                      >
                        {a.key}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "添加中..." : "添加"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                child?.id === c.id ? "ring-2 ring-orange-400" : ""
              }`}
              onClick={() => setCurrentChild(c.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-4xl">{c.avatar}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg">{c.name}</span>
                    {child?.id === c.id && (
                      <Badge variant="default" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        当前
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    🌟 {c.points} 积分 · 🔥 {c.streak} 天
                  </div>
                  <div className="mt-2">
                    {c.account ? (
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        👤 登录账号：{c.account.nickname}（{c.account.username}）
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccountChildId(c.id);
                          setAccountUsername("");
                          setAccountPassword("");
                          setAccountNickname(c.name);
                          setAccountMessage("");
                        }}
                      >
                        🔑 创建登录账号
                      </Button>
                    )}
                  </div>
                </div>
                {/* 删除按钮 */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: c.id, name: c.name });
                    setDeleteConfirmName("");
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {children.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              还没有添加孩子，点击上方按钮添加
            </CardContent>
          </Card>
        )}

        {accountMessage && (
          <div className={`p-3 rounded-lg text-center font-medium ${
            accountMessage.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {accountMessage}
          </div>
        )}

        {accountChildId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔑 创建孩子登录账号</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountUsername">登录用户名</Label>
                  <Input
                    id="accountUsername"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    placeholder="孩子登录时使用的用户名"
                    required
                    minLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountPassword">登录密码</Label>
                  <Input
                    id="accountPassword"
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="至少6位密码"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNickname">孩子昵称</Label>
                  <Input
                    id="accountNickname"
                    value={accountNickname}
                    onChange={(e) => setAccountNickname(e.target.value)}
                    placeholder="显示在页面上的昵称"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={accountLoading}>
                    {accountLoading ? "创建中..." : "创建账号"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAccountChildId(null);
                      setAccountUsername("");
                      setAccountPassword("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 删除确认对话框 */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmName(""); setDeleteError(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>⚠️ 确认删除孩子</DialogTitle>
              <DialogDescription className="space-y-2">
                <p>此操作不可撤销！将删除以下所有数据：</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>孩子的登录账号</li>
                  <li>所有学习记录</li>
                  <li>所有打卡记录</li>
                  <li>宠物信息和积分</li>
                </ul>
                <p className="pt-2">
                  请输入孩子姓名 <strong>"{deleteTarget?.name}"</strong> 以确认删除：
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="请输入孩子姓名"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
              />
              {deleteError && (
                <p className="text-sm text-red-600 font-medium">{deleteError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmName("");
                  setDeleteError("");
                }}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteChild}
                disabled={deleteConfirmName.trim() !== deleteTarget?.name || deleteLoading}
              >
                {deleteLoading ? "删除中..." : "确认删除"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DesktopLayout>
  );
}
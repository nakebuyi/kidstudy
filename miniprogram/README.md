# 幼小衔接学习平台 - 微信小程序

## 技术栈

- **Taro 4** + React + TypeScript
- **NutUI** (京东 Taro 组件库)
- **JWT 认证** — 微信一键登录，自动创建账号

## 项目结构

```
miniprogram/
├── config/
│   ├── index.ts              # Taro 构建配置
│   ├── dev.ts / prod.ts      # 开发/生产环境
├── src/
│   ├── app.config.ts         # 全局配置 + 分包 + tabBar
│   ├── app.tsx               # 入口（引入 NutUI 全局样式）
│   ├── app.scss
│   ├── pages/
│   │   ├── index/            # 启动页（微信登录 + 会话恢复）
│   │   ├── learning/         # 学习模式分包
│   │   │   ├── dashboard/    #  工作台首页
│   │   │   ├── subject/      #  五大科目学习页
│   │   │   ├── games/pet/    #  宠物
│   │   │   ├── games/shop/   #  积分商城
│   │   │   └── settings/     #  我的（PIN 验证 → 家长模式）
│   │   └── parent/           # 管理模式分包
│   │       ├── children/     #  孩子管理
│   │       ├── report/       #  学习报告
│   │       └── settings/     #  家长设置
│   ├── components/
│   │   ├── settings/         # PIN 验证弹窗
│   │   ├── dashboard/        # 工作台组件
│   │   ├── learning/         # 学习组件
│   │   └── games/            # 宠物/游戏组件
│   ├── services/
│   │   └── api.ts            # API 调用层（JWT 自动注入）
│   ├── store/
│   │   └── auth.ts           # 认证状态管理
│   ├── utils/
│   │   ├── cache.ts          # 学习内容缓存（7 天 TTL）
│   │   └── checkin-queue.ts  # 离线打卡暂存 + 同步
│   └── hooks/                # 自定义 hooks
└── package.json
```

## 开发

```bash
cd miniprogram
npm install
npx taro build --type weapp --watch
```

然后用微信开发者工具打开 `miniprogram/dist/` 目录。

## 生产构建

```bash
npx taro build --type weapp
```

## 分包策略

| 包 | 内容 | 限制 |
|---|------|------|
| 主包 | 启动页 + API 层 + NutUI 主题 | < 2MB |
| learning 分包 | 学习模式所有页面 | — |
| parent 分包 | 管理模式所有页面 | — |
| content 分包 | 扩展学习内容 + 图片/音频 | — |

## 环境变量

在 `miniprogram/.env.development` 中配置：

```env
TARO_APP_API_URL="http://localhost:3000"
```

## 启动流程

```
用户打开小程序
  → pages/index (启动页)
  → 尝试恢复本地会话
  → 有会话 → 直接进入 Dashboard
  → 无会话 → wx.login() → 后端 /api/wechat/login
  → 自动创建账号 → 签发 JWT → 进入 Dashboard
```

## 与 Web 端的关系

- 共用同一套 Next.js API 后端（JWT 认证）
- 小程序账号独立（微信 openid），不与 Web 端互通
- 共享类型定义和常量（`/shared` 目录）
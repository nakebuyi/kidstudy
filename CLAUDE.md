# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

**This project has NOT been initialized yet.** No code exists — only requirements documentation. The detailed requirements are in `shimmying-noodling-parnas.md`. Read that file before starting any implementation work.

## Project Overview

幼小衔接学习平台 (Early Childhood Transition Learning Platform) — an online learning platform for children aged 5-7, featuring a dashboard-style layout with daily check-ins, five subject areas (literacy, pinyin, English, math, poetry), and a gamified points/pet-raising system.

## Bootstrap Commands

When ready to start Phase 1, initialize the project with:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
npx shadcn@latest init
npx shadcn@latest add button card input label tabs avatar badge progress dialog sheet dropdown-menu tooltip
```

Then create the directory structure per the planned layout below.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + useReducer
- **Data Storage**: Static JSON files (learning content) + browser localStorage/IndexedDB (user data)
- **Deployment**: Vercel / static export

## Project Structure (Planned)

```
kidstudy/
├── public/
│   ├── images/           # Image assets
│   ├── audio/            # Audio assets (pronunciation, poetry recitation)
│   └── data/             # Static learning content JSON
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home/login page
│   │   ├── dashboard/    # Dashboard, tasks, rewards, calendar
│   │   ├── learning/     # literacy, pinyin, english, math, poetry
│   │   ├── games/        # pet, shop
│   │   └── parent/       # report, children management, settings
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components (top nav, sidebar, bottom bar)
│   │   ├── learning/     # Learning-specific components
│   │   ├── games/        # Game-specific components
│   │   └── dashboard/    # Dashboard components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities (storage, checkin, points, content loading)
│   ├── store/            # React Context providers (auth, child, learning state)
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles
├── content/              # Learning content JSON files
│   ├── literacy.json     # 1000 Chinese characters (3 levels)
│   ├── pinyin.json       # 23 initials + 24 finals + 16 whole syllables
│   ├── english.json      # Vocabulary by category
│   ├── math.json         # Arithmetic problems (4 levels)
│   └── poetry.json       # 50 classic poems
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Routes

- `/login`, `/register` — Auth pages
- `/dashboard` — Main dashboard (child view)
- `/dashboard/tasks` — Daily check-in tasks
- `/dashboard/rewards` — Points shop / pet raising
- `/dashboard/calendar` — Check-in calendar
- `/learning/literacy|pinyin|english|math|poetry` — Five subject modules
- `/games/pet` — Pet raising
- `/games/shop` — Avatar/theme shop
- `/parent/report` — Learning reports
- `/parent/children` — Child profile management
- `/parent/settings` — Learning settings

## Dashboard Layout

Top navigation bar (subject tabs + parent entry) → left sidebar (pet display, points, streak) → main content area → bottom status bar (learning tips, eye-care timer).

## Key Data Models

See `shimmying-noodling-parnas.md` Section 4 for full TypeScript interfaces. Core types:

- `Parent` / `Child` — User accounts. A parent manages one or more children.
- `LearningRecord` — Tracks per-subject learning activity, scores, accuracy, duration.
- `CheckInRecord` / `CheckInTask` — Daily 5-task check-in (one per subject), with bonus points for all-complete.
- `LiteracyContent` / `PinyinContent` / `EnglishContent` / `MathContent` / `PoetryContent` — Static learning content loaded from JSON files, each with `level` and `order` fields for progression.
- `PetState` — Virtual pet with type, level, mood, hunger; fed with points.
- `ShopItem` / `Badge` — Points shop items and achievement badges.

## Points System

- Daily check-in: +10 per subject, +10 bonus for all 5 completed (max 60/day)
- 7-day streak bonus: +50
- Learning new content: +5 per subject
- Game completion: +5–20
- Points spent on: pet food/toys/accessories, dashboard themes, avatar frames

## Development Phases

1. **Phase 1**: Next.js init, shadcn/ui setup, dashboard layout, auth pages, child management, route scaffolding
2. **Phase 2**: Learning content data (20-30 items per subject initially), all 5 subject module pages with learning flows, daily check-in task generation
3. **Phase 3**: Points system, pet raising, points shop, achievement badges, check-in calendar
4. **Phase 4**: Parent reports (daily/weekly), learning settings, eye-care mode, animations, responsive adaptation

## Visual Design

- **Style**: Bright, warm, child-friendly, rounded corners
- **Subject colors**: Literacy (orange-yellow), Pinyin (sky blue), English (grass green), Math (purple-pink), Poetry (Chinese red)
- **Target devices**: Tablet-first (iPad 1024×768), desktop (1920×1080), mobile (375×812) with simplified layout
- **Accessibility**: Minimum 48×48px touch targets, high contrast text, audio feedback for correct/incorrect answers
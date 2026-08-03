import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import literacyData from "../content/literacy.json";
import pinyinData from "../content/pinyin.json";
import englishData from "../content/english.json";
import mathData from "../content/math.json";
import poetryData from "../content/poetry.json";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

/** 补充 math 缺失的 options：4 个选项（含答案 ±1..±3 非负去重）。 */
function normalizeItem(subject: string, item: any): any {
  const out = { ...item };
  if (subject === "math" && !Array.isArray(out.options)) {
    const set = new Set<number>([out.answer]);
    let offset = 1;
    while (set.size < 4) {
      for (const delta of [offset, -offset]) {
        const v = out.answer + delta;
        if (v >= 0) set.add(v);
        if (set.size >= 4) break;
      }
      offset++;
    }
    out.options = [...set].sort(() => Math.random() - 0.5);
  }
  return out;
}

/**
 * 在 Turso 上建表并导入全部学习内容。
 *
 * 注意：Prisma CLI（db push / db pull）在本项目只能连 file: 协议，
 * 无法直接对 Turso（libsql://）执行。因此表结构在此用 CREATE TABLE
 * IF NOT EXISTS 幂等创建（seed 通过 @libsql/client 连 Turso）。
 */
async function seedLearningContent() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LearningContent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subject" TEXT NOT NULL,
      "level" INTEGER NOT NULL,
      "order" INTEGER NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const pools = [
    { subject: "literacy", items: literacyData as any[] },
    { subject: "pinyin", items: pinyinData as any[] },
    { subject: "english", items: englishData as any[] },
    { subject: "math", items: mathData as any[] },
    { subject: "poetry", items: poetryData as any[] },
  ];

  for (const { subject, items } of pools) {
    for (const item of items) {
      const n = normalizeItem(subject, item);
      await prisma.learningContent.upsert({
        where: { id: n.id },
        update: { subject, level: n.level, order: n.order, data: JSON.stringify(n) },
        create: { id: n.id, subject, level: n.level, order: n.order, data: JSON.stringify(n) },
      });
    }
    console.log(`✅ Seeded ${items.length} ${subject} items`);
    if (items.length < 20) console.warn(`⚠️ ${subject} only has ${items.length} items (< 20)`);
  }
}

/**
 * 幂等迁移：给 LearningRecord 加 subject/date 列和查询索引。
 * Prisma CLI 无法直连 Turso（file: only），故在 seed 内用 SQL 迁移。
 */
async function migrateLearningRecord() {
  const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `PRAGMA table_info("LearningRecord")`
  );
  const names = cols.map((c) => c.name);

  if (!names.includes("subject")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LearningRecord" ADD COLUMN "subject" TEXT NOT NULL DEFAULT ''`
    );
    console.log("✅ Added LearningRecord.subject");
  }
  if (!names.includes("date")) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "LearningRecord" ADD COLUMN "date" TEXT NOT NULL DEFAULT ''`
    );
    console.log("✅ Added LearningRecord.date");
  }
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LearningRecord_childId_subject_date_idx" ON "LearningRecord" ("childId", "subject", "date")`
  );
  console.log("✅ LearningRecord index ensured");
}

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  // Backfill: set nickname = username for existing Parent records where nickname is empty
  const backfillResult = await prisma.$executeRaw`UPDATE Parent SET nickname = username WHERE nickname = ''`;
  console.log(`🔧 Backfilled ${backfillResult} parent(s) with nickname = username`);

  const parent = await prisma.parent.upsert({
    where: { username: "demo" },
    update: { nickname: "家长" },
    create: {
      username: "demo",
      passwordHash,
      nickname: "家长",
      children: {
        create: {
          name: "小明",
          avatar: "👦",
          pet: JSON.stringify({ type: "cat", name: "小咪", level: 1, mood: "normal" }),
        },
      },
    },
  });

  console.log(`✅ Seeded parent: ${parent.username} (password: 123456)`);

  const child = await prisma.child.findFirst({ where: { parentId: parent.id } });
  console.log(`✅ Seeded child: ${child?.name} (id: ${child?.id})`);

  await seedLearningContent();
  await migrateLearningRecord();
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
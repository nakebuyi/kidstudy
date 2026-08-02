import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

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
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
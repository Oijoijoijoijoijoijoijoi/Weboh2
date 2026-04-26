const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "Would you like a slice of lemon pound cake?",
    options: ["yes"],
    answer: "yes",
    keywords: ["bakery", "afroman"]
  },
  {
    question: "P = NP?",
    options: ["yes", "no", "maybe"],
    answer: "maybe",
    keywords: ["headache"]
  },
  {
    question: "If it's not x, is it y - and honestly? That's powerful.",
    options: ["AI slop", "powerful", "x", "y"],
    answer: "AI slop",
    keywords: ["yet-another-trick-question"]
  }
];

async function main() {


  const hashedPassword = await bcrypt.hash("1234", 10);
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log(`Created user: ${adminUser.email}`);

  for (const item of seedQuestions) {
    await prisma.question.create({
      data: {
        question: item.question,
        options: item.options,
        answer: item.answer,
        userId: adminUser.id, 
        keywords: {
          connectOrCreate: item.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
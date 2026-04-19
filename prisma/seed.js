const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    id: 1,
    question: "Would you like a slice of lemon pound cake?",
    options: [
      "yes"
    ],
    answer: "yes",
    keywords: ["bakery", "afroman"]
  },
  {
    id: 2,
    question: "P = NP?",
    options: [
      "yes",
      "no",
      "maybe"
    ],
    answer: "maybe",
    keywords: ["headache"]

  },
  {
    id: 3,
    question: "If it's not x, is it y - and honestly? That's powerful.",
        options: [
      "AI slop",
      "powerful",
      "x",
      "y"
    ],
    answer: "AI slop",
    keywords: ["yet-another-trick-question"]

  }

];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        options: question.options,
        answer: question.answer,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

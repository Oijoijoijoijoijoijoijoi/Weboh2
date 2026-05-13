const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");
beforeEach(resetDb);

describe("question tests", () => {

it("returns 401 without a token", async () => {
  const res = await request(app).get("/api/questions");
  expect(res.status).toBe(401);
});

it("returns 404 for unknown question", async () => {
  const token = await registerAndLogin();
  const res = await request(app).get("/api/questions/99999")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(404);
  expect(res.body.message).toBe("Question not found");
});

it("returns 400 for invalid question body", async () => {
  const token = await registerAndLogin();
  const res = await request(app).post("/api/questions")
    .set("Authorization", `Bearer ${token}`)
    .send({ question: "" });
  expect(res.status).toBe(400);
});

it("returns 403 when editing someone else's question", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const question = await createQuestion(aliceToken, { question: "Alice's question" });

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/questions/${question.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ question: "hijacked", date: "2026-01-01", answer: "x" });

  expect(res.status).toBe(403);

  const after = await prisma.question.findUnique({ where: { id: question.id } });
  expect(after.question).toBe("Alice's question");  // unchanged
});


it("quiz attempt with correct answer?", async () => {
  const token = await registerAndLogin();
  const question = await createQuestion(token, { answer: "testataanpas" });

  const playRes = await request(app)
    .post(`/api/questions/${question.id}/play`)
    .set("Authorization", `Bearer ${token}`)
    .send({ answer: "testataanpas" });

  expect(playRes.status).toBe(201);
  expect(playRes.body.correct).toBe(true);

  const checkRes = await request(app)
    .get(`/api/questions/${question.id}`)
    .set("Authorization", `Bearer ${token}`);

  expect(checkRes.status).toBe(200);
  expect(checkRes.body.solved).toBe(true);
});

});
const request = require("supertest");
const app = require("../src/server");
describe("Gate 2 - Manual application validation tests", () => {
 test("health endpoint returns UP", async () => {
  const r = await request(app).get("/health");
  expect(r.status).toBe(200);
  expect(r.body.status).toBe("UP");
 });
 test("orders endpoint returns paid order amount", async () => {
  const r = await request(app).get("/orders/501");
  expect(r.status).toBe(200);
  expect(r.body).toHaveProperty("order_id",501);
  expect(r.body).toHaveProperty("amount",250);
 });
 test("analytics revenue returns expected total revenue", async () => {
  const r = await request(app).get("/analytics/revenue");
  expect(r.status).toBe(200);
  expect(r.body.value).toBe(775.49);
 });
});

const request = require("supertest");
const app = require("../src/server");

describe("Gate 1 - Closed-loop AI-generated API tests", () => {
  test("valid customer ID should return required fields", async () => {
    const response = await request(app).get("/customers/1001");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("customer_id", 1001);
    expect(response.body).toHaveProperty("name");
    expect(typeof response.body.name).toBe("string");
    expect(["ACTIVE", "INACTIVE"]).toContain(response.body.status);
    expect(response.body).toHaveProperty("created_at");
    expect(response.body.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("invalid customer ID should return 404", async () => {
    const response = await request(app).get("/customers/9999");
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });   

  test("malformed customer ID should return 500", async () => {
    const response = await request(app).get("/customers/abc");
    expect(response.status).toBe(500);
  });

  test("analytics revenue should return expected KPI", async () => {
    const response = await request(app).get("/analytics/revenue");
    expect(response.status).toBe(200);
    expect(response.body.metric).toBe("totalRevenue");
    expect(typeof response.body.value).toBe("number");
  });
});
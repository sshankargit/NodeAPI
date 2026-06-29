const fs = require("fs");
const path = require("path");
const db = require("../src/db");

const reportDir = path.join(__dirname, "reports");

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const checks = [];

const customerCount = db
  .prepare("SELECT COUNT(*) AS count FROM customers")
  .get().count;

checks.push({
  check: "customer_count_minimum",
  expected: ">= 3",
  actual: customerCount,
  status: customerCount >= 3 ? "PASS" : "FAIL"
});

const paidOrderCount = db
  .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'PAID'")
  .get().count;

checks.push({
  check: "paid_order_count_minimum",
  expected: ">= 3",
  actual: paidOrderCount,
  status: paidOrderCount >= 3 ? "PASS" : "FAIL"
});

const nullCustomerNames = db
  .prepare("SELECT COUNT(*) AS count FROM customers WHERE name IS NULL OR name = ''")
  .get().count;

checks.push({
  check: "customer_name_not_null",
  expected: 0,
  actual: nullCustomerNames,
  status: nullCustomerNames === 0 ? "PASS" : "FAIL"
});

const failedChecks = checks.filter(c => c.status === "FAIL");

const dataValidationReport = {
  generatedAt: new Date().toISOString(),
  checks
};

fs.writeFileSync(
  path.join(reportDir, "data_validation_report.json"),
  JSON.stringify(dataValidationReport, null, 2)
);

const gate3Summary = {
  gate: "Gate 3 - Data Validation",
  status: failedChecks.length > 0 ? "FAIL" : "PASS",
  checksExecuted: checks.length,
  checksPassed: checks.length - failedChecks.length,
  checksFailed: failedChecks.length,
  failureType: failedChecks.length > 0 ? "DataQualityFailure" : "None",
  failedChecks,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(
  path.join(reportDir, "gate3_summary.json"),
  JSON.stringify(gate3Summary, null, 2)
);

console.table(checks);

if (failedChecks.length > 0) {
  console.error("Data validation failed.");
  process.exit(1);
}

console.log("Data validation passed.");
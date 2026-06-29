const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const reportDir = path.join(root, "validation", "reports");

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const result = spawnSync(
  "npx",
  ["jest", "tests/api.test.js", "--runInBand"],
  {
    cwd: root,
    encoding: "utf8",
    shell: true
  }
);

const output = `${result.stdout || ""}\n${result.stderr || ""}`;

fs.writeFileSync(
  path.join(reportDir, "gate2_api_tests.log"),
  output
);

const testsExecutedMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/i);
const failedMatch = output.match(/Tests:\s+(\d+)\s+failed/i);

const testsFailed = failedMatch ? Number(failedMatch[1]) : 0;
const testsExecuted = testsExecutedMatch
  ? Number(testsExecutedMatch[2])
  : 0;

const testsPassed = testsExecutedMatch
  ? Number(testsExecutedMatch[1])
  : testsExecuted - testsFailed;

const status = result.status === 0 ? "PASS" : "FAIL";

const gate2Summary = {
  gate: "Gate 2 - API Validation",
  status,
  testsExecuted,
  testsPassed,
  testsFailed,
  failureType: status === "FAIL" ? "APIValidationFailure" : "None",
  evidence: output.substring(0, 3000),
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(
  path.join(reportDir, "gate2_summary.json"),
  JSON.stringify(gate2Summary, null, 2)
);

console.log(output);

if (status === "FAIL") {
  process.exit(1);
}
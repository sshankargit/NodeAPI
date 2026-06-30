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

const testsLine = output.match(/Tests:\s+(.*)/i);

let testsExecuted = 0;
let testsPassed = 0;
let testsFailed = 0;

if (testsLine) {
  const line = testsLine[1];

  const passed = line.match(/(\d+)\s+passed/i);
  const failed = line.match(/(\d+)\s+failed/i);
  const total = line.match(/(\d+)\s+total/i);

  testsPassed = passed ? Number(passed[1]) : 0;
  testsFailed = failed ? Number(failed[1]) : 0;
  testsExecuted = total ? Number(total[1]) : testsPassed + testsFailed;
}

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
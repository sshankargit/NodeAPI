const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { callOllama } = require("./ollama_client");

const root = path.join(__dirname, "..");
const reportDir = path.join(root, "validation", "reports");
const testFile = path.join(root, "tests", "ai_generated_api.test.js");
const specFile = path.join(__dirname, "api_spec.json");

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

function stripMarkdownFences(text) {
  return text
    .replace(/^```javascript\s*/i, "")
    .replace(/^```js\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function fallbackTestFile() {
  return `const request = require("supertest");
const app = require("../src/server");

describe("Gate 1 - Closed-loop AI-generated API tests", () => {
  test("valid customer ID should return required fields", async () => {
    const response = await request(app).get("/customers/1001");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("customer_id", 1001);
    expect(response.body).toHaveProperty("name");
    expect(typeof response.body.name).toBe("string");
    expect(response.body).toHaveProperty("status");
    expect(["ACTIVE", "INACTIVE"]).toContain(response.body.status);
    expect(response.body).toHaveProperty("created_at");
    expect(response.body.created_at).toMatch(/^\\d{4}-\\d{2}-\\d{2}$/);
  });

  test("invalid customer ID should return 404", async () => {
    const response = await request(app).get("/customers/9999");
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });   

  test("analytics revenue should return expected KPI", async () => {
    const response = await request(app).get("/analytics/revenue");
    expect(response.status).toBe(200);
    expect(response.body.metric).toBe("totalRevenue");
    expect(response.body.value).toBe(775.49);
  });
});
`;
}

function validateGeneratedCode(js) {
  return (
    js.includes('require("supertest")') &&
    js.includes('require("../src/server")') &&
    js.includes("describe(") &&
    js.includes("test(") &&
    js.includes("expect(")
  );
}

function inferFailureType(log) {
  if (!log) return "None";

  const lower = log.toLowerCase();

  if (
    lower.includes("500") ||
    lower.includes("internal server error") ||
    lower.includes("sqlite") ||
    lower.includes("no such column") ||
    lower.includes("database")
  ) {
    return "ApplicationDefect";
  }

  if (
    lower.includes("expected") ||
    lower.includes("received") ||
    lower.includes("toBe") ||
    lower.includes("tohaveproperty")
  ) {
    return "AssertionMismatch";
  }

  if (
    lower.includes("syntaxerror") ||
    lower.includes("unexpected token") ||
    lower.includes("referenceerror")
  ) {
    return "GeneratedCodeDefect";
  }

  return "Unknown";
}

function extractHttpStatusEvidence(log) {
  const evidence = {};

  if (!log) return evidence;

  const statusMatches = log.match(/Expected:\s*(\d+)[\s\S]*?Received:\s*(\d+)/i);
  if (statusMatches) {
    evidence.expectedHttpStatus = Number(statusMatches[1]);
    evidence.receivedHttpStatus = Number(statusMatches[2]);
  }

  if (log.includes("/customers/1001")) {
    evidence.failedEndpoint = "/customers/1001";
  } else if (log.includes("/customers/9999")) {
    evidence.failedEndpoint = "/customers/9999";
  } else if (log.includes("/analytics/revenue")) {
    evidence.failedEndpoint = "/analytics/revenue";
  }

  return evidence;
}

function readApplicationErrors() {
  const logPath = path.join(reportDir, "application_errors.log");

  if (!fs.existsSync(logPath)) {
    return "";
  }

  return fs.readFileSync(logPath, "utf8");
}

function writeGate1Summary(metrics, executionLog, phase) {
  const appErrors = readApplicationErrors();
  const combinedEvidence = `${executionLog || ""}\n\nAPPLICATION ERRORS:\n${appErrors}`;

  const summary = {
    gate: "Gate 1 - Closed-loop AI-Assisted Test Generation",
    status: finalStatus,
    phase,
    initialRunStatus: metrics.initialRunStatus,
    repairAttempted: metrics.repairAttempted,
    repairRunStatus: metrics.repairRunStatus,
    repairSuccessful: metrics.repairRunStatus === "PASS",

    failureType:
        finalStatus === "PASS"
        ? "None"
        : inferFailureType(combinedEvidence),

    applicationErrorPresent:
        finalStatus === "PASS"
        ? false
        : appErrors.trim().length > 0,

    applicationErrorSample:
        finalStatus === "PASS"
        ? ""
        : appErrors.substring(0, 1500),

    evidence: executionLog ? executionLog.substring(0, 3000) : "",
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(reportDir, "gate1_summary.json"),
    JSON.stringify(summary, null, 2)
  );

  return summary;
}

function runAiTests(label) {
  const result = spawnSync("npm", ["run", "test:ai"], {
    cwd: root,
    encoding: "utf8",
    shell: true
  });

  const log = `${result.stdout || ""}\n${result.stderr || ""}`;
  fs.writeFileSync(path.join(reportDir, `gate1_${label}_test_run.log`), log);

  return {
    status: result.status,
    log
  };
}

async function askOllama(prompt, promptFileName, errorFileName) {
  fs.writeFileSync(path.join(reportDir, promptFileName), prompt);

  try {
    const output = await callOllama(prompt);
    const js = stripMarkdownFences(output);

    if (validateGeneratedCode(js)) {
      return js;
    }

    fs.writeFileSync(
      path.join(reportDir, "gate1_invalid_ollama_output.txt"),
      output
    );

    return fallbackTestFile();
  } catch (error) {
    fs.writeFileSync(path.join(reportDir, errorFileName), error.message);
    return fallbackTestFile();
  }
}

async function generateInitialTests(apiSpec) {
  const template = fs.readFileSync(
    path.join(__dirname, "gate1_generate_tests_prompt.txt"),
    "utf8"
  );

  const prompt = template.replace("{{API_SPEC_JSON}}", apiSpec);

  return askOllama(
    prompt,
    "gate1_initial_generation_prompt.txt",
    "gate1_ollama_generation_error.log"
  );
}

async function repairGeneratedTests(apiSpec, currentTestCode, failureLog) {
  const template = fs.readFileSync(
    path.join(__dirname, "gate1_repair_tests_prompt.txt"),
    "utf8"
  );

  const prompt = template
    .replace("{{API_SPEC_JSON}}", apiSpec)
    .replace("{{CURRENT_TEST_FILE}}", currentTestCode)
    .replace("{{FAILURE_LOG}}", failureLog);

  return askOllama(
    prompt,
    "gate1_repair_prompt.txt",
    "gate1_ollama_repair_error.log"
  );
}

async function main() {
  const apiSpec = fs.readFileSync(specFile, "utf8");

  const metrics = {
    gate: "Gate 1 - Closed-loop AI-Assisted Test Generation",
    generatedAt: new Date().toISOString(),
    initialGenerationUsed: true,
    initialRunStatus: null,
    repairAttempted: false,
    repairRunStatus: null,
    finalStatus: null
  };

  const generatedTests = await generateInitialTests(apiSpec);

  fs.writeFileSync(testFile, generatedTests);
  fs.writeFileSync(
    path.join(reportDir, "gate1_initial_generated_test_file.js"),
    generatedTests
  );

  const firstRun = runAiTests("initial");
  metrics.initialRunStatus = firstRun.status === 0 ? "PASS" : "FAIL";

  writeGate1Summary(metrics, firstRun.log, "initial");

  if (firstRun.status === 0) {
    metrics.finalStatus = "PASS";

    fs.writeFileSync(
      path.join(reportDir, "gate1_closed_loop_metrics.json"),
      JSON.stringify(metrics, null, 2)
    );

    writeGate1Summary(metrics, firstRun.log, "final");

    console.log("Gate 1 passed on initial AI-generated test execution.");
    return;
  }

  metrics.repairAttempted = true;

  const repairedTests = await repairGeneratedTests(
    apiSpec,
    generatedTests,
    firstRun.log
  );

  fs.writeFileSync(testFile, repairedTests);
  fs.writeFileSync(
    path.join(reportDir, "gate1_repaired_test_file.js"),
    repairedTests
  );

  const secondRun = runAiTests("repaired");
  metrics.repairRunStatus = secondRun.status === 0 ? "PASS" : "FAIL";
  metrics.finalStatus = secondRun.status === 0 ? "PASS" : "FAIL";

  fs.writeFileSync(
    path.join(reportDir, "gate1_closed_loop_metrics.json"),
    JSON.stringify(metrics, null, 2)
  );

  writeGate1Summary(metrics, secondRun.log, "repaired");

  if (secondRun.status !== 0) {
    console.error("Gate 1 failed after repair attempt. Deployment should be blocked.");
    process.exit(1);
  }

  console.log("Gate 1 passed after AI repair.");
}

main().catch(error => {
  console.error("Gate 1 closed-loop failed:", error.message);
  process.exit(1);
});
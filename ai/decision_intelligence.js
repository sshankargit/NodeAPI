const fs = require("fs");
const path = require("path");
const { callOllama } = require("./ollama_client");

const root = path.join(__dirname, "..");
const reportDir = path.join(root, "validation", "reports");

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

function readText(fileName) {
  const filePath = path.join(reportDir, fileName);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJson(fileName) {
  const filePath = path.join(reportDir, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function buildStructuredSummary() {
  const gate1 = readJson("gate1_summary.json");
  const gate4 = readJson("gate4_summary.json");
  const dataReport = readJson("data_validation_report.json");
  const kpiReport = readJson("kpi_validation_report.json");
  const gate2 = readJson("gate2_summary.json");
  const gate3 = readJson("gate3_summary.json");

  const gateResults = [];

  if (gate1) {
    gateResults.push({
      gate: "Gate 1 - AI Test Generation",
      status: gate1.status || "UNKNOWN",
      failureType: gate1.failureType || "Unknown",
      repairAttempted: gate1.repairAttempted || false,
      repairSuccessful: gate1.repairSuccessful || false
    });
  } else {
    gateResults.push({
      gate: "Gate 1 - AI Test Generation",
      status: "UNKNOWN",
      failureType: "MissingSummary"
    });
  }
  if (gate2) {
    gateResults.push(gate2);
  }
  gateResults.push({
    gate: "Gate 2 - API Validation",
    status: readText("gate2_api_tests.log").toLowerCase().includes("fail")
      ? "FAIL"
      : "PASS",
    failureType: readText("gate2_api_tests.log").toLowerCase().includes("fail")
      ? "APITestFailure"
      : "None"
  });

  if (gate3) {
     gateResults.push(gate3);
 }

  if (dataReport && dataReport.checks) {
    const failedChecks = dataReport.checks.filter(c => c.status === "FAIL");

    gateResults.push({
      gate: "Gate 3 - Data Validation",
      status: failedChecks.length > 0 ? "FAIL" : "PASS",
      failureType: failedChecks.length > 0 ? "DataQualityFailure" : "None",
      failedChecks
    });
  } else {
    gateResults.push({
      gate: "Gate 3 - Data Validation",
      status: "UNKNOWN",
      failureType: "MissingDataValidationReport"
    });
  }

  if (gate4) {
    gateResults.push(gate4);
  } else if (kpiReport && kpiReport.result) {
    gateResults.push({
      gate: "Gate 4 - KPI Validation",
      status: kpiReport.result.status,
      failureType:
        kpiReport.result.status === "FAIL"
          ? "AnalyticsKPIMismatch"
          : "None",
      warehouseRevenue: kpiReport.result.warehouseRevenue,
      dashboardRevenue: kpiReport.result.tableauDashboardRevenue,
      tolerance: kpiReport.result.tolerance,
      difference: kpiReport.result.difference
    });
  } else {
    gateResults.push({
      gate: "Gate 4 - KPI Validation",
      status: "UNKNOWN",
      failureType: "MissingKPIReport"
    });
  }

  const failedGate = gateResults.find(g => g.status === "FAIL");

  return {
    pipelineStatus: failedGate ? "FAIL" : "PASS",
    failedGate: failedGate ? failedGate.gate : "None",
    deploymentDecision: failedGate ? "BLOCK" : "PASS",
    gateResults
  };
}

async function main() {
  const structuredSummary = buildStructuredSummary();

  fs.writeFileSync(
    path.join(reportDir, "pipeline_structured_summary.json"),
    JSON.stringify(structuredSummary, null, 2)
  );

  const artifactFiles = [
    "gate1_summary.json",
    "gate1_closed_loop_metrics.json",
    "gate1_initial_test_run.log",
    "gate1_repaired_test_run.log",
    "gate2_api_tests.log",
    "gate3_data_validation.log",
    "gate4_kpi_validation.log",
    "data_validation_report.json",
    "kpi_validation_report.json",
    "gate4_summary.json",
    "application_errors.log",
    "gate2_summary.json",
    "gate3_summary.json"
  ];

  const artifacts = artifactFiles
    .map(file => {
      const content = readText(file);
      return `\n===== ${file} =====\n${content || "Not available"}`;
    })
    .join("\n");

  const template = fs.readFileSync(
    path.join(__dirname, "gate5_decision_intelligence_prompt.txt"),
    "utf8"
  );

  const prompt = template
    .replace(
      "{{STRUCTURED_SUMMARY}}",
      JSON.stringify(structuredSummary, null, 2)
    )
    .replace("{{ARTIFACTS}}", artifacts);

  fs.writeFileSync(path.join(reportDir, "gate5_decision_intelligence_prompt.txt"), prompt);

  let output;

  try {
    output = await callOllama(prompt);
  } catch (error) {
    output = `# Gate 5 - RCA Report

Ollama was unavailable. Structured summary was generated successfully.

## Structured Decision
Pipeline Status: ${structuredSummary.pipelineStatus}
Failed Gate: ${structuredSummary.failedGate}
Deployment Decision: ${structuredSummary.deploymentDecision}

## Error
${error.message}
`;
  }

  fs.writeFileSync(path.join(reportDir, "gate5_decision_intelligence_report.md"), output);
  console.log(output);

  if (structuredSummary.deploymentDecision === "BLOCK") {
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Gate 5 RCA failed:", error.message);
  process.exit(1);
});
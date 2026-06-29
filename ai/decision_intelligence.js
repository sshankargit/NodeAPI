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
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function buildStructuredSummary() {
  const gate1 = readJson("gate1_summary.json");
  const gate2 = readJson("gate2_summary.json");
  const gate3 = readJson("gate3_summary.json");
  const gate4 = readJson("gate4_summary.json");

  const gateResults = [
    gate1 || {
      gate: "Gate 1 - AI Test Generation",
      status: "UNKNOWN",
      failureType: "MissingSummary"
    },
    gate2 || {
      gate: "Gate 2 - API Validation",
      status: "UNKNOWN",
      failureType: "MissingSummary"
    },
    gate3 || {
      gate: "Gate 3 - Data Validation",
      status: "UNKNOWN",
      failureType: "MissingSummary"
    },
    gate4 || {
      gate: "Gate 4 - KPI Validation",
      status: "UNKNOWN",
      failureType: "MissingSummary"
    }
  ];

  const failedGates = gateResults.filter(g => g.status === "FAIL");

  return {
    pipelineStatus: failedGates.length > 0 ? "FAIL" : "PASS",
    failedGates: failedGates.map(g => g.gate),
    deploymentDecision: failedGates.length > 0 ? "BLOCK" : "PASS",
    gateResults
  };
}

function collectFailedGateArtifacts() {
  const files = [
    "gate1_summary.json",
    "gate2_summary.json",
    "gate3_summary.json",
    "gate4_summary.json",
    "data_validation_report.json",
    "kpi_validation_report.json",
    "application_errors.log",
    "gate1_initial_test_run.log",
    "gate1_repaired_test_run.log",
    "gate2_api_tests.log",
    "gate3_data_validation.log",
    "gate4_kpi_validation.log"
  ];

  return files
    .map(file => {
      const content = readText(file);
      return `\n===== ${file} =====\n${content || "Not available"}`;
    })
    .join("\n");
}

function buildDeterministicReasoning(structuredSummary) {
  const failed = structuredSummary.gateResults.filter(g => g.status === "FAIL");

  const classifications = failed.length
    ? failed
        .map(g => `- ${g.gate}: ${g.failureType || "Unknown"}`)
        .join("\n")
    : "None";

  const evidence = failed.length
    ? failed
        .map(g => {
          if (g.gate.includes("Gate 1")) {
            return `- ${g.gate}: status=${g.status}, failureType=${g.failureType}, repairAttempted=${g.repairAttempted}, repairSuccessful=${g.repairSuccessful}`;
          }

          if (g.gate.includes("Gate 2")) {
            return `- ${g.gate}: testsExecuted=${g.testsExecuted}, testsPassed=${g.testsPassed}, testsFailed=${g.testsFailed}. Review gate2_summary.json and gate2_api_tests.log.`;
          }

          if (g.gate.includes("Gate 3")) {
            const failedChecks = g.failedChecks || [];
            return `- ${g.gate}: ${failedChecks.length} data validation check(s) failed: ${failedChecks
              .map(c => `${c.check} expected ${c.expected}, actual ${c.actual}`)
              .join("; ")}`;
          }

          if (g.gate.includes("Gate 4")) {
            return `- ${g.gate}: warehouseRevenue=${g.warehouseRevenue}, dashboardRevenue=${g.dashboardRevenue}, difference=${g.difference}, tolerance=${g.tolerance}`;
          }

          return `- ${g.gate}: status=${g.status}, failureType=${g.failureType}`;
        })
        .join("\n")
    : "No failed gates detected.";

  return `## Failure Classification
${classifications}

## Probable Root Cause
One or more quality gates failed based on structured gate summaries. The most likely root cause is an upstream data, application, or validation issue that affected one or more downstream quality gates.

## Evidence
${evidence}

## Recommended Resolution
Review and correct the failed gate outputs. For API validation failures, inspect endpoint behavior and API contract expectations. For data quality failures, restore the expected test data or fix ingestion/reconciliation logic. For KPI mismatches, verify dashboard calculations, warehouse values, and data refresh timing.

## Improvement Recommendations
Continue using structured gate summaries as the authoritative evidence source for Gate 5. Keep raw logs as supporting diagnostic artifacts only.
`;
}

async function getAIReasoning(structuredSummary, artifacts) {
  const prompt = `
You are an AI reasoning assistant for a CI/CD Quality Engineering framework.

The deterministic decision engine has already calculated:
- Overall Pipeline Status
- Failed Quality Gate(s)
- Deployment Decision

Do NOT change those values.
Do NOT output a new pipeline status.
Do NOT output a new deployment decision.
Do NOT summarize the input files.

Your job is to produce only these sections:

## Failure Classification
Classify the failure using the failureType values from the structured summary.

## Probable Root Cause
Explain the most likely technical cause.

## Evidence
Use specific values from the structured summary and logs.

## Recommended Resolution
Provide concrete corrective actions.

## Improvement Recommendations
Provide non-blocking improvements.

Structured Summary:
${JSON.stringify(structuredSummary, null, 2)}

Supporting Artifacts:
${artifacts}
`;

  fs.writeFileSync(
    path.join(reportDir, "gate5_decision_intelligence_prompt.txt"),
    prompt
  );

  try {
    const response = await callOllama(prompt);

    if (!response.trim().startsWith("## Failure Classification")) {
      return buildDeterministicReasoning(structuredSummary);
    }

    return response;
  } catch (error) {
    return `## Failure Classification
AI reasoning unavailable.

## Probable Root Cause
The deterministic decision engine detected one or more failed quality gates.

## Evidence
See pipeline_structured_summary.json and gate summary artifacts.

## Recommended Resolution
Review the failed gate summaries and correct the underlying defects.

## Improvement Recommendations
Ollama call failed: ${error.message}
`;
  }
}

function buildFinalReport(structuredSummary, aiReasoning) {
  return `# AI Decision Intelligence Report

## Overall Pipeline Status
${structuredSummary.pipelineStatus}

## Failed Quality Gate(s)
${
  structuredSummary.failedGates.length > 0
    ? structuredSummary.failedGates.map(g => `- ${g}`).join("\n")
    : "None"
}

${aiReasoning}

## Deployment Decision
${structuredSummary.deploymentDecision}
`;
}

async function main() {
  const structuredSummary = buildStructuredSummary();

  fs.writeFileSync(
    path.join(reportDir, "pipeline_structured_summary.json"),
    JSON.stringify(structuredSummary, null, 2)
  );

  const artifacts = collectFailedGateArtifacts();
  const aiReasoning = await getAIReasoning(structuredSummary, artifacts);
  const finalReport = buildFinalReport(structuredSummary, aiReasoning);

  fs.writeFileSync(
    path.join(reportDir, "gate5_decision_intelligence_report.md"),
    finalReport
  );

  console.log(finalReport);

  if (structuredSummary.deploymentDecision === "BLOCK") {
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Gate 5 Decision Intelligence failed:", error.message);
  process.exit(1);
});
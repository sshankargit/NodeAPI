const fs = require("fs");
const path = require("path");

const reportDir = path.join(__dirname, "..", "validation", "reports");

function ensureReportDir() {
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
}

function logApplicationError(context, error) {
  ensureReportDir();

  const entry = {
    timestamp: new Date().toISOString(),
    context,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  };

  fs.appendFileSync(
    path.join(reportDir, "application_errors.log"),
    JSON.stringify(entry) + "\n"
  );
}

module.exports = { logApplicationError };
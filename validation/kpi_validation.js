const fs=require("fs"), path=require("path"), db=require("../src/db");
const reportDir=path.join(__dirname,"reports"); if(!fs.existsSync(reportDir)) fs.mkdirSync(reportDir,{recursive:true});
const warehouseRevenue=db.prepare("SELECT ROUND(SUM(amount),2) AS totalRevenue FROM orders WHERE status='PAID'").get().totalRevenue;
const tableauDashboardRevenue=700.00 //775.49; // change to 700.00 to simulate KPI failure
const tolerance=0.01, difference=Math.abs(warehouseRevenue-tableauDashboardRevenue);
const result={check:"tableau_revenue_kpi_matches_warehouse",warehouseRevenue,tableauDashboardRevenue,tolerance,difference,status:difference<=tolerance?"PASS":"FAIL"};
fs.writeFileSync(path.join(reportDir,"kpi_validation_report.json"),JSON.stringify({generatedAt:new Date().toISOString(),result},null,2));
console.table([result]);
if(result.status==="FAIL"){console.error("KPI validation failed.");process.exit(1);}
console.log("KPI validation passed.");

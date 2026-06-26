const fs=require("fs"), path=require("path"), db=require("../src/db");
const reportDir=path.join(__dirname,"reports"); if(!fs.existsSync(reportDir)) fs.mkdirSync(reportDir,{recursive:true});
const checks=[];
const cc=db.prepare("SELECT COUNT(*) AS count FROM customers").get().count;
checks.push({check:"customer_count_minimum",expected:">= 3",actual:cc,status:cc>=3?"PASS":"FAIL"});
const pc=db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status='PAID'").get().count;
checks.push({check:"paid_order_count_minimum",expected:">= 3",actual:pc,status:pc>=3?"PASS":"FAIL"});
const nc=db.prepare("SELECT COUNT(*) AS count FROM customers WHERE name IS NULL OR name=''").get().count;
checks.push({check:"customer_name_not_null",expected:0,actual:nc,status:nc===0?"PASS":"FAIL"});
fs.writeFileSync(path.join(reportDir,"data_validation_report.json"),JSON.stringify({generatedAt:new Date().toISOString(),checks},null,2));
console.table(checks);
if(checks.some(c=>c.status==="FAIL")){console.error("Data validation failed.");process.exit(1);}
console.log("Data validation passed.");

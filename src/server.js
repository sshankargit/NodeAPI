const express = require("express");
const cors = require("cors");
const db = require("./db");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.get("/health",(req,res)=>res.json({status:"UP",service:"qe-cicd-sample-api"}));
app.get("/customers",(req,res)=>res.json(db.prepare("SELECT * FROM customers ORDER BY customer_id").all()));
app.get("/customers/:id",(req,res)=>{
 const customer=db.prepare("SELECT * FROM customers WHERE customer_id=?").get(req.params.id);
 if(!customer) return res.status(404).json({error:"Customer not found"});
 res.json(customer);
});
app.get("/orders",(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY order_id").all()));
app.get("/orders/:id",(req,res)=>{
 const order=db.prepare("SELECT * FROM orders WHERE order_id=?").get(req.params.id);
 if(!order) return res.status(404).json({error:"Order not found"});
 res.json(order);
});
app.get("/analytics/revenue",(req,res)=>{
 const result=db.prepare("SELECT ROUND(SUM(amount),2) AS totalRevenue FROM orders WHERE status='PAID'").get();
 res.json({metric:"totalRevenue",value:result.totalRevenue||0,source:"orders",filter:"status = PAID"});
});
if(require.main===module){app.listen(port,()=>console.log(`Sample API running on port ${port}`));}
module.exports=app;
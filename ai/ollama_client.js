const http = require("http");
function callOllama(prompt){
 const model=process.env.OLLAMA_MODEL||"llama3.1";
 const host=process.env.OLLAMA_HOST||"http://localhost:11434";
 const body=JSON.stringify({model,prompt,stream:false,options:{temperature:0.1,top_p:0.9}});
 const url=new URL("/api/generate",host);
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:url.hostname,port:url.port||11434,path:url.pathname,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},res=>{
   let data="";
   res.on("data",chunk=>data+=chunk);
   res.on("end",()=>{try{const parsed=JSON.parse(data); if(parsed.error) reject(new Error(parsed.error)); else resolve(parsed.response||"");}catch(e){reject(new Error("Failed to parse Ollama response: "+e.message+"\n"+data));}});
  });
  req.on("error",err=>reject(new Error("Unable to connect to Ollama. "+err.message)));
  req.write(body); req.end();
 });
}
module.exports={callOllama};

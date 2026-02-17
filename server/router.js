import { json, readBody } from "./utils/http.js";
import { ROUTES } from "./routes.js";

export async function route(req, res){
  if(req.method!=="POST") return json(res,405,{error:"method_not_allowed"});
  const url=new URL(req.url,`http://${req.headers.host}`);
  const m=url.searchParams.get("m")||"";
  const fn=ROUTES[m];
  if(!fn) return json(res,404,{error:"unknown_method"});
  const body=await readBody(req);
  try{ return await fn(req,res,body); }
  catch(e){ console.error("API error",m,e); return json(res,500,{error:"server_error"}); }
}

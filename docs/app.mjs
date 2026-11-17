const el=id=>document.getElementById(id), output=()=>el("result");
let urls=[];
function show(message) {
  for(const url of urls) URL.revokeObjectURL(url);
  urls=[];
  output().replaceChildren();
  const summary=document.createElement("p");
  summary.className="result-summary";
  summary.setAttribute("aria-live","polite");
  summary.textContent=message;
  output().append(summary);
}
function run(callback) {
  el("run").onclick=async()=>{
    el("run").disabled=true;
    try{await callback();}catch(error){show(error.message);}
    finally{el("run").disabled=false;}
  };
}
function table(rows) {
  const wrap=document.createElement("div"), data=document.createElement("table"), head=data.createTHead(), body=data.createTBody();
  wrap.className="table-wrap";
  rows.forEach((row,index)=>{
    const tr=(index?body:head).insertRow();
    for(const value of row){
      const cell=document.createElement(index?"td":"th");
      cell.textContent=String(value??"—");
      if(!index)cell.scope="col";
      tr.append(cell);
    }
  });
  wrap.append(data); output().append(wrap);
}
function download(name,contents,type) {
  const url=URL.createObjectURL(new Blob([contents],{type}));
  urls.push(url);
  const anchor=document.createElement("a");
  anchor.className="button quiet export";
  anchor.textContent="Download "+name;
  anchor.download=name;
  anchor.href=url;
  output().append(anchor);
}
const n=id=>el(id).value.trim()?Number(el(id).value):NaN;
function parseJson(id){try{return JSON.parse(el(id).value);}catch{throw Error("Enter valid JSON in the "+(id==="media"?"media dimensions":"fixture")+" field.");}}
import {replay} from "./tool.mjs";
el("sample").onclick=()=>{
  el("source").value=JSON.stringify([
    {id:"event-01",at:0,responses:[{status:503},{status:429,retryAfter:12},{status:204}]},
    {id:"event-01",at:2,responses:[{status:200}]},
    {id:"event-02",at:4,responses:[{status:422}]},
    {id:"event-03",at:7,responses:[{status:201}]},
    {id:"event-01",at:45,responses:[{status:200}]},
    {id:"event-04",at:55,responses:[{status:200}]}
  ],null,2);
};
run(()=>{
  const rows=replay(parseJson("source"),{attempts:n("attempts"),baseDelay:n("base"),maxDelay:n("cap"),ttl:n("ttl")});
  show(count(rows,"Delivered")+" deliveries · "+count(rows,"Retry scheduled")+" retries · "+count(rows,"Skipped duplicate")+" duplicates");
  table([["Time (s)","Delivery ID","Attempt","Status","Outcome","Wait (s)"],...rows.map(row=>[row.seconds,row.id,row.attempt,row.status,row.event,row.wait])]);
  download("webhook-timeline.json",JSON.stringify(rows,null,2)+"\n","application/json");
});
function count(rows,state){return rows.filter(row=>row.event===state).length;}

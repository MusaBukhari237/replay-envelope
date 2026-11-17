import test from "node:test";
import assert from "node:assert/strict";
import {replay} from "../docs/tool.mjs";
const policy={attempts:3,baseDelay:2,maxDelay:10,ttl:5};
test("honors Retry-After and suppresses pending and cached duplicate IDs",()=>{
 const events=[{id:"demo",at:0,responses:[{status:429,retryAfter:7},{status:204}]},{id:"demo",at:1,responses:[{status:200}]},{id:"demo",at:11,responses:[{status:200}]},{id:"demo",at:12,responses:[{status:200}]}];
 const rows=replay(events,policy);
 assert.deepEqual(rows.map(x=>[x.seconds,x.event]),[[0,"Retry scheduled"],[1,"Skipped duplicate"],[7,"Delivered"],[11,"Skipped duplicate"],[12,"Delivered"]]);
});
test("stops permanent failures and records missing fixture responses",()=>{
 const rows=replay([{id:"a",at:0,responses:[{status:422}]},{id:"b",at:0,responses:[{status:503}]}],policy);
 assert.deepEqual(rows.map(x=>x.event),["Stopped","Retry scheduled","Fixture ended"]);
 assert.throws(()=>replay([{id:"x",at:0,responses:[{status:600}]}],policy),/Invalid response/);
});

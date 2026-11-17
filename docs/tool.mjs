function integer(value, min, max) {
  return Number.isInteger(value)&&value>=min&&value<=max;
}
export function replay(fixture, policy) {
  const {attempts,baseDelay,maxDelay,ttl}=policy;
  if (!integer(attempts,1,8)||!integer(baseDelay,1,3600)||!integer(maxDelay,baseDelay,86400)||!integer(ttl,0,604800)) {
    throw Error("Use 1–8 attempts, valid retry delays in seconds, and a cache TTL up to 604,800 seconds.");
  }
  if(!Array.isArray(fixture)||!fixture.length||fixture.length>100) throw Error("Provide between 1 and 100 delivery events.");
  const pending=fixture.map((event,index)=>{
    if(typeof event?.id!=="string"||!event.id.trim()||event.id.length>80||!integer(event.at,0,604800)||!Array.isArray(event.responses)||!event.responses.length||event.responses.length>8) {
      throw Error("Invalid delivery at fixture position "+(index+1)+".");
    }
    for(const response of event.responses){
      if(!integer(response?.status,100,599)||(response.retryAfter!=null&&!integer(response.retryAfter,0,86400))) throw Error("Invalid response in event "+(index+1)+".");
    }
    return {time:event.at,seq:index,id:event.id,responses:event.responses,attempt:0};
  });
  const active=new Set(), cache=new Map(), rows=[];
  const log=(item,event,status=null,wait=null)=>rows.push({seconds:item.time,id:item.id,attempt:item.attempt||null,event,status,wait});
  while(pending.length){
    pending.sort((a,b)=>a.time-b.time||a.seq-b.seq);
    const item=pending.shift();
    if(item.attempt===0){
      if(active.has(item.id)||(cache.get(item.id)??-1)>item.time) { log(item,"Skipped duplicate"); continue; }
      active.add(item.id);
      item.attempt=1;
    }
    const response=item.responses[item.attempt-1];
    if(!response){
      log(item,"Fixture ended");
      active.delete(item.id);
      continue;
    }
    const status=response.status;
    if(status>=200&&status<300){
      log(item,"Delivered",status);
      cache.set(item.id,item.time+ttl);
      active.delete(item.id);
      continue;
    }
    const retryable=[408,425,429].includes(status)||status>=500;
    if(!retryable||item.attempt===attempts){
      log(item,retryable?"Attempts exhausted":"Stopped",status);
      active.delete(item.id);
      continue;
    }
    const wait=Math.max(Math.min(baseDelay*2**(item.attempt-1),maxDelay),response.retryAfter??0);
    log(item,"Retry scheduled",status,wait);
    pending.push({...item,time:item.time+wait,attempt:item.attempt+1});
  }
  return rows;
}

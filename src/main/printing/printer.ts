import net from "node:net";
import type { PrinterProfile } from "../../../shared/schemas.js";
export function sendNetwork(profile:PrinterProfile,data:Buffer):Promise<{ok:boolean;message:string;bytes:number}> {
  return new Promise((resolve,reject)=>{
    if(!profile.network) return reject(new Error("Network settings are missing"));
    const socket=new net.Socket(); let settled=false;
    const fail=(message:string)=>{if(settled)return;settled=true;socket.destroy();reject(new Error(message));};
    socket.setTimeout(profile.network.timeoutMs);
    socket.once("timeout",()=>fail("Printer connection timed out"));
    socket.once("error",e=>fail(`Printer unreachable: ${e.message}`));
    socket.connect(profile.network.port,profile.network.host,()=>{
      socket.write(data,error=>{if(error)return fail(`Print write failed: ${error.message}`);socket.end();});
    });
    socket.once("close",hadError=>{if(!settled&&!hadError){settled=true;resolve({ok:true,message:"Data sent to printer. Physical output is not guaranteed.",bytes:data.length});}});
  });
}
export function testNetwork(profile:PrinterProfile){ return sendNetwork(profile,Buffer.alloc(0)); }

import type { RenderLine } from "../receipt/render.js";
import { wrapText } from "../receipt/render.js";
import iconv from "iconv-lite";
const ESC=0x1b, GS=0x1d;
export const sanitizeEscPosText = (value:string) => value
  .replace(/[\u00a0\u202f]/g," ")
  .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,"")
  .replace(/[×]/g,"x")
  .replace(/[‘’]/g,"'")
  .replace(/[“”]/g,'"')
  .split("").filter(character=>{const code=character.charCodeAt(0);return code>=32&&code!==127}).join("");
export function escPosBytes(lines:RenderLine[], width=48, cut=true, feed=4, drawer=false,encoding="CP437") {
  const chunks:number[]=[ESC,0x40];
  const normalized=encoding.toLowerCase().replace(/windows-/,"win").replace("printer default","ascii");
  const page:Record<string,number>={cp437:0,cp850:2,cp860:3,cp863:4,cp865:5,win1252:16,cp852:18,cp858:19};
  if(page[normalized]!==undefined)chunks.push(ESC,0x74,page[normalized]);
  const target=iconv.encodingExists(normalized)?normalized:"ascii";
  const write=(s:string)=>chunks.push(...iconv.encode(sanitizeEscPosText(s),target),0x0a);
  for(const line of lines){
    if(line.type==="feed"){ for(let i=0;i<line.lines;i++) write(""); continue; }
    if(line.type==="divider"){write(line.character.repeat(width));continue;}
    if(line.type==="columns"){ const [a,b]=line.columns; const right=b?.text||""; write(a.text.slice(0,Math.max(0,width-right.length-1)).padEnd(Math.max(0,width-right.length))+right);continue;}
    if(line.type==="qrcode"){
      const data=Buffer.from(line.value); const len=data.length+3;
      chunks.push(GS,0x28,0x6b,len&255,(len>>8)&255,0x31,0x50,0x30,...data,GS,0x28,0x6b,3,0,0x31,0x51,0x30); continue;
    }
    if(line.type==="image"){
      chunks.push(ESC,0x61,1,GS,0x76,0x30,0,line.widthBytes&255,(line.widthBytes>>8)&255,line.height&255,(line.height>>8)&255,...line.data,0x0a);
      continue;
    }
    if(line.type==="logo") continue;
    chunks.push(ESC,0x61,line.align==="center"?1:line.align==="right"?2:0,ESC,0x45,line.bold?1:0,ESC,0x2d,line.underline?1:0);
    for(const value of wrapText(line.text,width)) write(value);
  }
  for(let i=0;i<feed;i++) write("");
  if(drawer) chunks.push(ESC,0x70,0,25,250);
  if(cut) chunks.push(GS,0x56,0x41,3);
  return Buffer.from(chunks);
}

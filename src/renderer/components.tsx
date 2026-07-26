import { X } from "lucide-react";
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
export const Field=({label,children}:{label:string;children:ReactNode})=><label><span className="label">{label}</span>{children}</label>;
export const Modal=({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean})=><div className="fixed inset-0 z-50 bg-[#0c1816aa] backdrop-blur-sm flex items-center justify-center p-6" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={`surface max-h-[90vh] overflow-auto p-6 ${wide?"w-[760px]":"w-[480px]"}`}><div className="flex justify-between items-center mb-5"><h2 className="text-xl font-bold">{title}</h2><button className="btn !p-2" onClick={onClose}><X size={17}/></button></div>{children}</div></div>;
export const Empty=({title,detail,action}:{title:string;detail:string;action?:ReactNode})=><div className="surface p-12 text-center border-dashed"><div className="w-12 h-12 rounded-2xl bg-[#eee7ff] text-[#6825e9] mx-auto mb-4 flex items-center justify-center text-xl">✦</div><h3 className="font-bold text-lg">{title}</h3><p className="text-sm muted text-[#69736f] mt-1 mb-5">{detail}</p>{action}</div>;
export const Stat=({label,value,accent}:{label:string;value:string;accent?:boolean})=><div className={`surface p-5 ${accent?"bg-[#dceee8] !text-[#123f38] border-[#b8d9cf]":""}`}><p className={`text-xs uppercase font-bold tracking-wider ${accent?"text-[#346b61]":"text-[#76807d]"}`}>{label}</p><p className="text-2xl font-bold mt-2">{value}</p></div>;

type DraftNumberProps=Omit<InputHTMLAttributes<HTMLInputElement>,"value"|"onChange"|"type">&{
  value:number;
  onValueChange:(value:number)=>void;
  formatValue?:(value:number)=>string;
};
export function DraftNumberInput({value,onValueChange,formatValue=String,onBlur,onFocus,...props}:DraftNumberProps){
  const focused=useRef(false),[draft,setDraft]=useState(()=>formatValue(value));
  useEffect(()=>{if(!focused.current)setDraft(formatValue(value))},[value,formatValue]);
  return <input {...props} type="number" value={draft} onFocus={event=>{focused.current=true;onFocus?.(event)}} onChange={event=>{
    const next=event.target.value;setDraft(next);
    if(next.trim()===""||next==="-"||next==="."||next==="-.")return;
    const parsed=Number(next);if(Number.isFinite(parsed))onValueChange(parsed);
  }} onBlur={event=>{
    focused.current=false;
    setDraft(formatValue(value));
    onBlur?.(event);
  }}/>;
}

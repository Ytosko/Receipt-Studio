export function createUniqueReceiptNumber(existing:Iterable<string>,prefix="R",uuidFactory:()=>string=()=>crypto.randomUUID()){
  const used=new Set(existing);
  for(let attempt=0;attempt<100;attempt++){
    const token=uuidFactory().replace(/-/g,"").slice(0,12).toUpperCase();
    const value=`${prefix||"R"}-${token}`;
    if(!used.has(value))return value;
  }
  throw new Error("Unable to generate a unique receipt number");
}

export interface ExtractionItem { page: number; text: string; type: string; unit: string | null; method: 'embedded_text'|'ocr'|'processor'; confidence: number|null; location: Record<string, unknown>|null; raw: Record<string, unknown>; }
export function measurementCandidates(text: string) {
  return Array.from(text.matchAll(/(?<![\w.])(-?\d+(?:\.\d+)?)\s*([a-zA-Zµ°][a-zA-Zµ°²³/0-9]*)/g),m=>({text:m[0],value:m[1]??'',unit:m[2]??''}));
}
export function providerItems(result: Record<string, unknown>, scanned: number[]): ExtractionItem[] {
  const items=result['items'] as {pages?:Array<{page_number?:number;page?:number;items?:Array<Record<string,unknown>>}>}|undefined;
  const text=result['text'] as {pages?:Array<{page_number?:number;page?:number;text?:string}>}|undefined;
  const out:ExtractionItem[]=[];
  for(const [index,p] of (items?.pages??[]).entries()) {
    const page=p.page_number??p.page??index+1;
    for(const item of p.items??[]) {
      const content=String(item['value']??item['text']??item['md']??'');if(!content.trim())continue;
      const boxes=Array.isArray(item['bbox'])?item['bbox'] as Array<Record<string,unknown>>:[];
      const scores=boxes.map(b=>b['confidence']).filter((c):c is number=>typeof c==='number'&&c>=0&&c<=1);
      const confidence=typeof item['confidence']==='number'&&item['confidence']>=0&&item['confidence']<=1?item['confidence']:scores.length===boxes.length&&scores.length?Math.min(...scores):null;
      out.push({page,text:content,type:item['type']==='table'?'table':'text',unit:null,method:scanned.includes(page)?'ocr':'processor',confidence,location:item['bbox']?{bbox:item['bbox'],coordinate_system:'provider',scope:'item'}:null,raw:item});
    }
  }
  if(!out.length)for(const [index,p] of (text?.pages??[]).entries()){const page=p.page_number??p.page??index+1;if(p.text?.trim())out.push({page,text:p.text,type:'text',unit:null,method:scanned.includes(page)?'ocr':'processor',confidence:null,location:null,raw:{}});}
  return out;
}
export function withMeasurements(items:ExtractionItem[]):ExtractionItem[] {
  return items.flatMap(item=>{
    const candidates=measurementCandidates(item.text);
    if(item.type==='table') for(const line of item.text.split('\n')){
      const cells=line.split('|').map(c=>c.trim()).filter(Boolean);
      for(let i=0;i<cells.length-1;i++){const value=cells[i];const unit=cells[i+1];if(value&&unit&&/^-?\d+(\.\d+)?$/.test(value)&&/^[a-zA-Zµ°][a-zA-Zµ°²³/0-9]*$/.test(unit))candidates.push({text:`${value} ${unit}`,value,unit});}
    }
    return [item,...candidates.map(m=>({...item,text:m.text,type:'measurement',unit:m.unit,location:item.location?{...item.location,scope:'parent_item'}:null,raw:{raw_value:m.value,raw_unit:m.unit,verified:false}}))];
  });
}
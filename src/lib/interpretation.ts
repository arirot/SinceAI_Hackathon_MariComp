import { z } from 'zod';
export const designElementSchema=z.object({element_type:z.string(),element_name:z.string(),deck:z.string(),location:z.string(),measured_value:z.number().nullable(),unit:z.string().nullable(),source_document:z.string(),page_number:z.number().nullable(),confidence:z.number(),verification_status:z.enum(['UNVERIFIED']),information_origin:z.enum(['DIRECTLY_OBSERVED','AI_INFERRED']),source_quote:z.string(),region:z.object({x:z.number(),y:z.number(),w:z.number(),h:z.number()}).nullable()});
export const interpretationSchema=z.object({elements:z.array(designElementSchema)});
export type DesignElement=z.infer<typeof designElementSchema>;
/** Bulk review includes observations and inferences, with or without measurements. */
export function pendingPageElements<T extends {page_number:number|null;verification_status:string}>(elements:readonly T[],page:number):T[]{
 return elements.filter(element=>element.page_number===page&&element.verification_status==='UNVERIFIED');
}
export function normalizeDesignElement(element:DesignElement,document:string,page:number):DesignElement{
 const measured=element.information_origin==='DIRECTLY_OBSERVED'&&element.measured_value!==null&&element.source_quote.includes(String(element.measured_value))&&!!element.unit&&element.source_quote.includes(element.unit);
 return {...element,source_document:document,page_number:page,verification_status:'UNVERIFIED',confidence:Math.max(0,Math.min(1,element.confidence)),measured_value:measured?element.measured_value:null,unit:measured?element.unit:null,region:normalizeRegion(element.region)};
}
/** Region only locates an element for highlighting; it is never used to derive dimensions. */
export function normalizeRegion(r:DesignElement['region']):DesignElement['region']{
 if(!r||![r.x,r.y,r.w,r.h].every(Number.isFinite))return null;
 const x=Math.max(0,Math.min(1,r.x)),y=Math.max(0,Math.min(1,r.y));const w=Math.max(0,Math.min(1-x,r.w)),h=Math.max(0,Math.min(1-y,r.h));
 return w>0&&h>0?{x,y,w,h}:null;
}
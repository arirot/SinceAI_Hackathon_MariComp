import {describe,it,expect} from 'vitest';
import {normalizeDesignElement,pendingPageElements,type DesignElement} from '@/lib/interpretation';
const element:DesignElement={element_type:'dimension',element_name:'Door width',deck:'Main',location:'Port',measured_value:900,unit:'mm',source_document:'invented',page_number:99,confidence:0.9,verification_status:'UNVERIFIED',information_origin:'DIRECTLY_OBSERVED',source_quote:'900 mm',region:null};
describe('Ship design interpretation safeguards',()=>{
 it('bulk verification includes every unverified element regardless of value or origin',()=>{
  const rows=[{...element,id:'measured',page_number:2},{...element,id:'no-value',page_number:2,measured_value:null,unit:null},{...element,id:'inference',page_number:2,information_origin:'AI_INFERRED' as const,measured_value:null,unit:null}];
  expect(pendingPageElements(rows,2).map(r=>r.id)).toEqual(['measured','no-value','inference']);
  expect(pendingPageElements(rows,2)[2]).toEqual(rows[2]);
 });
 it('bulk verification excludes other pages and already reviewed elements',()=>{
  const rows=[{...element,id:'pending',page_number:2},{...element,id:'other-page',page_number:3},{...element,id:'verified',page_number:2,verification_status:'VERIFIED'},{...element,id:'rejected',page_number:2,verification_status:'REJECTED'}];
  expect(pendingPageElements(rows,2).map(r=>r.id)).toEqual(['pending']);
 });
 it('never treats inferred dimensions as measured values',()=>{const r=normalizeDesignElement({...element,information_origin:'AI_INFERRED'},'plan.pdf',2);expect(r.measured_value).toBeNull();expect(r.unit).toBeNull();});
 it('retains explicit measured annotations and raw unknown units',()=>{expect(normalizeDesignElement({...element,unit:'furlongs',source_quote:'900 furlongs'},'plan.pdf',2).unit).toBe('furlongs');expect(normalizeDesignElement(element,'plan.pdf',2).measured_value).toBe(900);});
 it('rejects a dimension absent from the literal annotation',()=>expect(normalizeDesignElement({...element,measured_value:800},'plan.pdf',2).measured_value).toBeNull());
 it('requires literal evidence for measured annotations',()=>expect(normalizeDesignElement({...element,source_quote:''},'plan.pdf',2).measured_value).toBeNull());
 it('clamps drawing regions to the page and drops empty ones',()=>{expect(normalizeDesignElement({...element,region:{x:0.9,y:-1,w:0.5,h:0.2}},'p.pdf',1).region).toEqual({x:0.9,y:0,w:0.09999999999999998,h:0.2});expect(normalizeDesignElement({...element,region:{x:0.2,y:0.2,w:0,h:0.1}},'p.pdf',1).region).toBeNull();});
 it('assigns the actual document page and remains unverified',()=>{const r=normalizeDesignElement(element,'plan.pdf',2);expect(r.source_document).toBe('plan.pdf');expect(r.page_number).toBe(2);expect(r.verification_status).toBe('UNVERIFIED');});
});
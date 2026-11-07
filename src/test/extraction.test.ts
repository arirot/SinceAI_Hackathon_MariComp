import {describe,expect,it} from 'vitest';
import {measurementCandidates,providerItems,withMeasurements} from '@/lib/extraction';
describe('Extraction provenance',()=>{
 it('preserves unknown units without converting values',()=>expect(measurementCandidates('Width 12.5 furlongs')).toEqual([{text:'12.5 furlongs',value:'12.5',unit:'furlongs'}]));
 it('does not invent missing dimensions',()=>expect(measurementCandidates('Width not specified')).toEqual([]));
 it('retains conservative returned box confidence without verifying measurements',()=>{const r=providerItems({items:{pages:[{page_number:1,items:[{value:'12 mm',bbox:[{confidence:0.8},{confidence:0.6}]}]}]}},[1]);expect(r[0]?.confidence).toBe(0.6);expect(withMeasurements(r)[1]?.raw['verified']).toBe(false);});
 it('preserves provider page numbers and missing confidence',()=>{const r=providerItems({items:{pages:[{page_number:7,items:[{type:'text',value:'12 mm'}]}]}},[7]);expect(r[0]?.page).toBe(7);expect(r[0]?.method).toBe('ocr');expect(r[0]?.confidence).toBeNull();expect(r[0]?.location).toBeNull();});
 it('keeps measurements unverified with their raw unit',()=>{const r=withMeasurements([{page:2,text:'Beam 20 mm',type:'text',unit:null,method:'ocr',confidence:null,location:null,raw:{}}]);expect(r[1]?.unit).toBe('mm');expect(r[1]?.raw).toEqual({raw_value:'20',raw_unit:'mm',verified:false});});
 it('retains table type and returned source boxes',()=>{const r=providerItems({items:{pages:[{page_number:1,items:[{type:'table',md:'|Length|4 m|',bbox:[{x:1,y:2,w:3,h:4}]}]}]}},[]);expect(r[0]?.type).toBe('table');expect(r[0]?.location?.['bbox']).toEqual([{x:1,y:2,w:3,h:4}]);});
 it('preserves table measurements with an unknown separate unit cell',()=>{const r=withMeasurements([{page:1,text:'|Plate|3.2|furlongs|',type:'table',unit:null,method:'ocr',confidence:null,location:null,raw:{}}]);expect(r[1]?.unit).toBe('furlongs');expect(r[1]?.raw['raw_value']).toBe('3.2');});
});
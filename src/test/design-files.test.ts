import {describe,it,expect} from 'vitest';
import {validateDesignFile,processingState,previewKind} from '@/lib/document-validation';
import {assertEmbeddedModel} from '@/lib/model-validation';
const encode=(s:string)=>new TextEncoder().encode(s);
describe('Design file safeguards',()=>{
 it('accepts PNG drawings',()=>expect(validateDesignFile('ga.png',8,new Uint8Array([137,80,78,71,13,10,26,10])).format).toBe('png'));
 it('accepts JPG drawings',()=>expect(validateDesignFile('deck.jpg',3,new Uint8Array([255,216,255])).mime).toBe('image/jpeg'));
 it('rejects spoofed images',()=>expect(()=>validateDesignFile('deck.png',10,encode('not png'))).toThrow('Invalid PNG'));
 it('accepts glTF 2.0',()=>expect(validateDesignFile('ship.gltf',30,encode('{"asset":{"version":"2.0"}}')).format).toBe('gltf'));
 it('rejects malformed GLB',()=>expect(()=>validateDesignFile('ship.glb',12,encode('bad model'))).toThrow('Invalid GLB'));
 it('preserves CAD without pretending to process it',()=>expect(validateDesignFile('ship.step',10,encode('ISO-10303')).requiresConversion).toBe(true));
 it('does not process uploads merely by viewing them',()=>expect(processingState('uploaded')).toBe('UPLOADED'));
 it('marks ready only as completed processing',()=>expect(processingState('ready')).toBe('PROCESSED'));
 it('maps running extraction to PROCESSING',()=>expect(processingState('extracting')).toBe('PROCESSING'));
 it('maps unknown states conservatively',()=>expect(processingState('unknown')).toBe('REQUIRES_REVIEW'));
 it('does not offer a fake CAD preview',()=>expect(previewKind('dwg')).toBe('unsupported'));
 it('blocks external model dependency requests',()=>expect(()=>assertEmbeddedModel({buffers:[{uri:'https://example.com/private.bin'}]})).toThrow('companion'));
 it('accepts embedded model dependencies',()=>expect(()=>assertEmbeddedModel({buffers:[{uri:'data:application/octet-stream;base64,AAAA'}]})).not.toThrow());
});
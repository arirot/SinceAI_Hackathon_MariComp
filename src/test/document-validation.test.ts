import { describe, expect, it } from 'vitest';
import { validatePdf, MAX_DOCUMENT_BYTES } from '@/lib/document-validation';
describe('PDF validation',()=>{
  it('accepts a PDF at the 25 MB limit',()=>expect(()=>validatePdf('GA.PDF',MAX_DOCUMENT_BYTES,'%PDF-')).not.toThrow());
  it('rejects files exceeding 25 MB',()=>expect(()=>validatePdf('drawing.pdf',MAX_DOCUMENT_BYTES+1,'%PDF-')).toThrow('25 MB'));
  it('rejects non-PDF extensions',()=>expect(()=>validatePdf('drawing.exe',10,'%PDF-')).toThrow('Only PDF'));
  it('rejects spoofed PDF contents',()=>expect(()=>validatePdf('drawing.pdf',10,'hello')).toThrow('not a valid PDF'));
  it('rejects empty files',()=>expect(()=>validatePdf('drawing.pdf',0,'%PDF-')).toThrow('empty'));
});
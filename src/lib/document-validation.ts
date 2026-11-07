export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_CATEGORIES = [
  ['engineering_drawing', 'Engineering drawing'], ['general_arrangement', 'General Arrangement'],
  ['technical_specification', 'Technical specification'], ['engineering_report', 'Engineering report'],
  ['supporting_document', 'Supporting design document'],
  ['material_declaration', 'Material declaration'], ['equipment_specification', 'Equipment specification'], ['certificate', 'Certificate'],
] as const;
export const CAD_FORMATS = ['step','stp','iges','igs','stl','obj','fbx','dwg','dxf','3dm','ifc','ply'] as const;
export const DOCUMENT_FORMATS = ['pdf','png','jpg','jpeg','glb','gltf',...CAD_FORMATS] as const;
export const DOCUMENT_ACCEPT = DOCUMENT_FORMATS.map(f=>`.${f}`).join(',');
export const CONVERSION_NOTICE = 'Uploaded successfully — conversion or specialised processing required.';
export const PROCESSING_STATES = ['UPLOADED','QUEUED','PROCESSING','PROCESSED','FAILED','REQUIRES_REVIEW'] as const;
export function fileFormat(name:string) { return name.split('.').pop()?.toLowerCase() ?? ''; }
export function fileMime(format:string) { return ({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',glb:'model/gltf-binary',gltf:'model/gltf+json'} as Record<string,string>)[format] ?? 'application/octet-stream'; }
export function previewKind(format:string) { return format==='pdf'?'pdf':['png','jpg','jpeg'].includes(format)?'image':['glb','gltf'].includes(format)?'model':'unsupported'; }
export function processingState(status:string) { return ({uploaded:'UPLOADED',queued:'QUEUED',extracting:'PROCESSING',processing:'PROCESSING',ready:'PROCESSED',completed:'PROCESSED',failed:'FAILED',superseded:'REQUIRES_REVIEW'} as Record<string,string>)[status] ?? (PROCESSING_STATES.includes(status as typeof PROCESSING_STATES[number])?status:'REQUIRES_REVIEW'); }
export function validateDesignFile(name:string,size:number,bytes:Uint8Array) {
  const format=fileFormat(name);
  if(!DOCUMENT_FORMATS.some(f=>f===format))throw new Error('Unsupported upload format.');
  if(size<=0)throw new Error('The document is empty.');
  if(size>MAX_DOCUMENT_BYTES)throw new Error('Files must be 25 MB or smaller.');
  const text=new TextDecoder().decode(bytes);
  if(format==='pdf')validatePdf(name,size,text.slice(0,5));
  if(format==='png'&&![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))throw new Error('Invalid PNG file.');
  if(['jpg','jpeg'].includes(format)&&(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255))throw new Error('Invalid JPEG file.');
  if(format==='glb') {
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(bytes.length<20||text.slice(0,4)!=='glTF'||view.getUint32(4,true)!==2||view.getUint32(8,true)!==size)throw new Error('Invalid GLB 2.0 file.');
  }
  if(format==='gltf') {
    let model:{asset?:{version?:string}};
    try{model=JSON.parse(text);}catch{throw new Error('Invalid glTF JSON file.');}
    if(model.asset?.version!=='2.0')throw new Error('Only glTF 2.0 is supported.');
  }
  return {format,mime:fileMime(format),requiresConversion:previewKind(format)==='unsupported'};
}
export function validatePdf(name: string, size: number, signature: string) {
  if (!name.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files are supported.');
  if (size <= 0) throw new Error('The document is empty.');
  if (size > MAX_DOCUMENT_BYTES) throw new Error('PDF files must be 25 MB or smaller.');
  if (signature !== '%PDF-') throw new Error('The file is not a valid PDF document.');
}
export function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
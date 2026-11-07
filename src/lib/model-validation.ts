export function assertEmbeddedModel(model:Record<string,unknown>) {
  for(const key of ['buffers','images']) {
    const entries=model[key];
    if(!Array.isArray(entries))continue;
    for(const entry of entries) {
      if(entry?.uri && (typeof entry.uri!=='string'||!entry.uri.startsWith('data:')))throw new Error('This model references companion files. Upload a self-contained GLB or embedded glTF for preview; the original file is preserved.');
    }
  }
}
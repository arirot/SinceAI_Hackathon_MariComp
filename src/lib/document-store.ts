import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from './account';
import { DEMO_DOCUMENTS, type DesignDocument } from './demo-data';
import { processingState, previewKind } from './document-validation';

export type StoredDocument = Omit<DesignDocument,'extraction'> & { extraction: string; fileFormat?:string; vesselId?:string|undefined; storagePath?: string; category?: string; sizeBytes?: number; uploaderId?: string; versionNumber?: number };
export function useDocuments() {
  const { user, loading } = useAccount();
  const query = useQuery({ queryKey: ['documents', user?.id], enabled: !!user, queryFn: async (): Promise<StoredDocument[]> => {
    const { data, error } = await supabase.from('design_documents').select('*,design_versions(version_number,status,created_at,original_filename,file_format,size_bytes,storage_path,created_by)').is('deleted_at',null).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((d) => { const latest = [...d.design_versions].sort((a,b)=>b.version_number-a.version_number)[0]; const format=latest?.file_format??d.file_format; return { id: d.id, projectId: d.project_id, title: latest?.original_filename??d.title, kind: format.toUpperCase(), fileFormat:format, vesselId:d.vessel_id??undefined, category:d.category, sizeBytes:latest?.size_bytes??d.size_bytes, uploaderId:d.user_id, versionNumber:latest?.version_number ?? 1, revision: d.revision, pages: 0, extraction: previewKind(format)==='unsupported'?'REQUIRES_REVIEW':processingState(latest?.status??d.status), uploaded: latest?.created_at ?? d.created_at, storagePath: latest?.storage_path??d.storage_path }; });
  }});
  return { ...query, documents: loading ? [] : user ? query.data ?? [] : DEMO_DOCUMENTS as StoredDocument[] };
}
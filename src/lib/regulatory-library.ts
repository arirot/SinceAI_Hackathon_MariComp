import {queryOptions} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
export const regulatoryLibraryOptions=queryOptions({queryKey:['regulatory-library'],queryFn:async()=>{
 const sources=await supabase.from('regulatory_sources').select('*').eq('library_catalog',true).order('regulation_number');if(sources.error)throw sources.error;
 const ids=sources.data.map(s=>s.id);if(!ids.length)return {sources:sources.data,requirements:[]};
 const requirements=await supabase.from('regulatory_requirements').select('*').in('regulatory_source_id',ids).order('clause_reference');if(requirements.error)throw requirements.error;
 return {sources:sources.data,requirements:requirements.data};
}});
export function formalRequirementEligible(source:{status:string},requirement:{status:string;verification_status:string}) {return source.status==='verified'&&requirement.status==='active'&&requirement.verification_status==='VERIFIED';}
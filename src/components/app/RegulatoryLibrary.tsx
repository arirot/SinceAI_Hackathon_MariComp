import {useState} from 'react';
import {useSuspenseQuery} from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Search,ExternalLink,BookOpen} from 'lucide-react';
import {regulatoryLibraryOptions,formalRequirementEligible} from '@/lib/regulatory-library';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {PageHeader,DataTable,Tag} from './Page';
import {RuleSetVerification} from './RuleSetVerification';
export function RegulatoryLibrary(){
 const {data}=useSuspenseQuery(regulatoryLibraryOptions);
 const [search,setSearch]=useState(''),[regulation,setRegulation]=useState(''),[article,setArticle]=useState(''),[verification,setVerification]=useState(''),[selected,setSelected]=useState('');
 const sources=new Map(data.sources.map(s=>[s.id,s]));
 const scoped=data.requirements.filter(r=>!regulation||r.regulatory_source_id===regulation);
 const articles=[...new Set(scoped.map(r=>r.article_reference).filter((a):a is string=>!!a))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const rows=scoped.filter(r=>(!article||r.article_reference===article)&&(!verification||r.verification_status===verification)&&[r.requirement_text,r.category,r.clause_reference,sources.get(r.regulatory_source_id)?.regulation_number].join(' ').toLowerCase().includes(search.toLowerCase()));
 const record=data.requirements.find(r=>r.id===selected);const source=record?sources.get(record.regulatory_source_id):undefined;
 function strings(value:unknown):string[]{return Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[];}
 return <>
  <PageHeader code="MOD-03 / EU ENVIRONMENTAL KNOWLEDGE" title="EU environmental regulations" description="Initial scope: ship recycling, organotin anti-fouling compounds and FuelEU Maritime."/>
  <div className="mb-5 border-l-4 border-warning bg-warning/10 px-4 py-3 text-sm"><strong>Initial library · {data.sources.length} regulations · {data.requirements.length} articles and annexes.</strong><p className="mt-1">Imported wording is UNVERIFIED and excluded from formal assessments. Original published editions are pinned; this is not a complete or current consolidated regulatory library.</p></div>
  <RuleSetVerification sources={data.sources}/>
  <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" aria-label="Search regulatory wording" placeholder="Search legal wording or materials" value={search} onChange={e=>setSearch(e.target.value)}/></div><select aria-label="Filter regulation" value={regulation} onChange={e=>{setRegulation(e.target.value);setArticle('');}} className="h-9 min-w-0 rounded-sm border bg-card px-3 text-sm"><option value="">All regulations</option>{data.sources.map(s=><option key={s.id} value={s.id}>{s.regulation_number}</option>)}</select><select aria-label="Filter article" value={article} onChange={e=>setArticle(e.target.value)} className="h-9 rounded-sm border bg-card px-3 text-sm"><option value="">All articles</option>{articles.map(a=><option key={a}>{a}</option>)}</select><select aria-label="Filter verification" value={verification} onChange={e=>setVerification(e.target.value)} className="h-9 rounded-sm border bg-card px-3 text-sm"><option value="">All verification states</option><option>UNVERIFIED</option><option>VERIFIED</option></select></div>
  <DataTable rowKey={r=>r.id} rows={rows} empty="No matching provisions." columns={[
   {label:'Regulation',cell:r=><div className="min-w-44"><p className="font-medium">{sources.get(r.regulatory_source_id)?.regulation_number}</p><p className="mt-1 text-xs text-muted-foreground">{sources.get(r.regulatory_source_id)?.title}</p></div>},
   {label:'Article / annex',cell:r=><Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={()=>setSelected(r.id)}><BookOpen className="h-4 w-4 shrink-0"/>{r.clause_reference}</Button>},
   {label:'Subject',cell:r=><span className="block max-w-72">{r.category}</span>},
   {label:'Legal version',cell:r=><div className="text-xs">Original OJ · {sources.get(r.regulatory_source_id)?.legal_version_date}<br/><span className="text-muted-foreground">{r.rule_set_version}</span></div>},
   {label:'Verification',cell:r=><Tag>{r.verification_status}</Tag>},
   {label:'Source',cell:r=><Button asChild size="icon" variant="ghost"><a href={sources.get(r.regulatory_source_id)?.source_url} target="_blank" rel="noopener noreferrer" aria-label={`Open EUR-Lex ${sources.get(r.regulatory_source_id)?.regulation_number} ${r.clause_reference}`} title="Official EUR-Lex source"><ExternalLink className="h-4 w-4"/></a></Button>}
  ]}/>
  {record&&source&&<section className="mt-6 border-t pt-6" aria-label="Legal provision details">
   <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="label-tech">{source.regulation_number}</p><h2 className="mt-1 text-xl font-semibold">{record.clause_reference} · {record.category}</h2><p className="mt-2 text-sm text-muted-foreground">{record.article_reference}{record.annex_reference?` · ${record.annex_reference}`:''}</p></div><Tag>{record.verification_status}</Tag></div>
   <div className="mb-5 grid gap-5 lg:grid-cols-2"><div><h3 className="font-semibold">Legal source edition</h3><p className="mt-2 text-sm">{source.legal_version} · {source.legal_version_date}</p><p className="mt-2 text-sm text-muted-foreground">{source.version_note}</p><Button asChild variant="link" className="mt-2 h-auto whitespace-normal px-0"><a href={source.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4"/>Official EUR-Lex source · {source.celex_id}</a></Button><p className="mt-2 text-xs text-muted-foreground">Formal assessment eligibility: {formalRequirementEligible(source,record)?'Eligible':'Excluded — source and requirement verification required'}</p></div><div><h3 className="font-semibold">Applicability review</h3><p className="mt-2 text-sm">{typeof record.applicability==='object'&&record.applicability&&!Array.isArray(record.applicability)?String(record.applicability['review_note']??'Review the legal scope below.'):'Review the legal scope below.'}</p><p className="mt-2 text-xs text-muted-foreground">Engineering guidance, not quoted legal wording. Read the full scope and exceptions in the source.</p><h3 className="mt-4 font-semibold">Required engineering evidence</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{strings(record.required_evidence).map(e=><li key={e}>{e}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Unverified engineering checklist; not a statement of mandatory legal documentation.</p></div></div>
   <h3 className="mb-3 font-semibold">Imported legal wording</h3><div className="legal-wording border-t pt-4 text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{record.requirement_text}</ReactMarkdown></div>
   <p className="mt-4 break-all font-mono text-xs text-muted-foreground">Wording fingerprint: {record.wording_sha256}</p>
  </section>}
 </>;
}
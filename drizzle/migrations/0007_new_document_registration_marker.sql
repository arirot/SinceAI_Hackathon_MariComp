CREATE FUNCTION public.normalize_document_registration_id() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.register_design_file(_project_id uuid,_document_id uuid,_filename text,_path text,_size bigint,_revision text,_category text,_sha256 text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE doc public.design_documents;doc_id uuid;next_version integer; BEGIN
IF auth.uid() IS NULL OR NOT public.project_access(_project_id,ARRAY['administrator','project_manager','engineer']::public.organization_role[]) THEN RAISE EXCEPTION 'Engineering access required' USING ERRCODE='42501';END IF;
IF _size IS NULL OR _size NOT BETWEEN 1 AND 26214400 OR _filename IS NULL OR length(trim(_filename)) NOT BETWEEN 1 AND 255 OR lower(_filename) NOT LIKE '%.pdf' OR _revision IS NULL OR length(trim(_revision)) NOT BETWEEN 1 AND 40 OR _category IS NULL OR _category NOT IN ('engineering_drawing','general_arrangement','technical_specification','engineering_report','supporting_document') OR _sha256 IS NULL OR _sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid PDF metadata';END IF;
IF split_part(_path,'/',1)<>auth.uid()::text OR split_part(_path,'/',2)<>_project_id::text OR _path NOT LIKE '%.pdf' THEN RAISE EXCEPTION 'Invalid project file path';END IF;
IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='design-documents' AND name=_path AND (metadata->>'size')::bigint=_size AND metadata->>'mimetype'='application/pdf') THEN RAISE EXCEPTION 'Uploaded PDF not found or metadata mismatch';END IF;
IF _document_id IS NULL OR _document_id='00000000-0000-0000-0000-000000000000'::uuid THEN
INSERT INTO public.design_documents(project_id,user_id,title,storage_path,size_bytes,revision,category) VALUES(_project_id,auth.uid(),_filename,_path,_size,_revision,_category) RETURNING id INTO doc_id;
UPDATE public.design_versions SET content_sha256=_sha256 WHERE document_id=doc_id AND version_number=1;
ELSE
SELECT * INTO doc FROM public.design_documents WHERE id=_document_id FOR UPDATE;
IF doc.id IS NULL OR doc.project_id<>_project_id OR doc.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Active project document required';END IF;
SELECT coalesce(max(version_number),0)+1 INTO next_version FROM public.design_versions WHERE document_id=doc.id;
INSERT INTO public.design_versions(project_id,document_id,version_number,revision,storage_path,created_by,original_filename,size_bytes,content_sha256) VALUES(_project_id,doc.id,next_version,_revision,_path,auth.uid(),_filename,_size,_sha256);
UPDATE public.design_documents SET revision=_revision,storage_path=_path,size_bytes=_size,status='uploaded' WHERE id=doc.id;doc_id=doc.id;
END IF;RETURN doc_id;END $$;
import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@/lib/compliance';
import { DocumentLibrary } from '@/components/app/DocumentLibrary';
export const Route = createFileRoute('/_authenticated/_workspace/documents')({
  head: () => pageHead('Engineering Documents', 'Private 2D drawing and 3D model uploads, previews, metadata and design version history.'),
  component: DocumentLibrary,
});
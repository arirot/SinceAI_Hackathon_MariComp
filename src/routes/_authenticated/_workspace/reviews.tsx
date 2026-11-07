import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/app/Page';
import { ReviewWorkspace } from '@/components/app/ReviewWorkspace';
import { pageHead } from '@/lib/compliance';
export const Route = createFileRoute('/_authenticated/_workspace/reviews')({
  head: () => pageHead('Engineering Review', 'Evidence, verified requirements and auditable engineering decisions.'),
  component: () => <><PageHeader code="REVIEWS" title="Engineering review" description="Evidence, verified requirements and auditable engineering decisions." /><ReviewWorkspace /></>,
});

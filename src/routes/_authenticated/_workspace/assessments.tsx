import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/app/Page';
import { AssessmentWorkspace } from '@/components/app/AssessmentWorkspace';
import { pageHead } from '@/lib/compliance';
export const Route = createFileRoute('/_authenticated/_workspace/assessments')({
  head: () => pageHead('Compliance Assessments', 'Version-specific assessment requests and deterministic outcomes.'),
  component: () => <><PageHeader code="ASSESSMENTS" title="Compliance assessments" description="Version-specific assessment requests and deterministic outcomes." /><AssessmentWorkspace /></>,
});

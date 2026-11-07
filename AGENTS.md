<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## MariComp architecture
- Ship-design interpretation uses page-isolated private PDFs through vision Responses; observations and inferences are separate source-linked records, original AI output is immutable, and engineer-only auditable reviews never set compliance status.
- Public pages (`/`, `/auth`) sit at top level; the workspace sidebar shell is the pathless `_workspace` layout so it only wraps app pages. Demo records live in `src/lib/demo-data.ts` and are always labelled with `DemoNotice`.
- Finding status is decided only by deterministic logic in `src/lib/compliance.ts`; AI output is stored as interpretation and never sets status — keeps engineering validation auditable.
- Missing evidence or unverified source => REQUIRES_REVIEW; overall vessel status is never COMPLIANT while any finding is open (covered by `src/test/compliance.test.ts`).
- Regulatory clauses come only from the verified library table, never from model generation — prevents invented clause numbers.
- EU catalog imports pin original EUR-Lex editions and hashed source wording; authenticated read-only draft visibility never grants publication, and catalog assessments reject any unverified or inactive requirement.
- Live account state is provided once at the root; all workspace pages live under the authenticated layout, while real records use the browser Cloud client under active organization-membership RLS — no private data is served by public loaders.
- Profiles and protected user_roles are separate; signup assigns only Engineer access, never a role from editable metadata — prevents privilege escalation.
- Design originals use a private bucket with uploader/project path checks; metadata and downloads require active project-organization membership — confidential documents have no public URLs.
- Multi-format originals upload with byte progress before server-side signature validation and SHA-256 registration; version records bind to the project's vessel, preserve original bytes, and PDF-only processing rejects other formats rather than simulating completion.
- Model previews dynamically load R3F in the authenticated workspace, fit originals without changing stored geometry, and block external/companion resource URLs; embedded GLB/glTF uses orbit controls and mesh selection while unsupported CAD remains conversion-required.
- Document registration serializes version numbers on the document row; deletion archives unassessed documents, hides their metadata and denies storage reads while assessed versions remain available for audit. Administrators/managers or an active engineer uploader may archive.
- Processing uses worker-compatible PDF text extraction and LlamaParse for scanned/table content; durable jobs resume from inspection, atomic result commits preserve raw source data and unverified measurements, and corrections never overwrite original extraction.
- Organization roles live in protected organization_members; legacy user_roles is compatibility only, and matching profile organization labels never confer membership.
- Composite foreign keys bind design versions, rule-set versions, requirements, findings and evidence to the same project/assessment; published and assessed versions remain immutable for auditability.
- create_engineering_project is an atomic security-invoker RPC under caller RLS; member changes use an authenticated server function and narrow administrator-checked RPC, never broad membership write grants; regulatory publication, extraction and finding writes remain privileged.
- Organization-member RPCs serialize on the organization row, preserve the last active administrator, and append audit records; account IDs identify existing users without exposing an anonymous email directory.
- Assessment requests are queued against exact version and verified source records; review decisions append rationale and never change deterministic finding status.
- Audit and review triggers append activity records and record review state without letting interpretation text set deterministic compliance status.
- Catalog regulations stay UNVERIFIED globally; administrators, reviewers or engineers verify an organization-scoped copy via an audited RPC with rationale.
- The quantitative assessment engine (DB function mirrored by `src/lib/quantitative-rules.ts`) compares only engineer-verified, directly observed measurements against thresholds stored on verified requirements (dual-unit clauses compare in the measurement's unit system); requirements without numeric rules stay text-screened REQUIRES_REVIEW — keeps status deterministic and traceable.
- Interpretation regions only locate elements for drawing highlights and never derive dimensions; PDF dossiers are built client-side from stored records only.
- Page-level bulk review selects all unverified interpretations through a shared tested selector and preserves origin and missing values — verification is not numerical compliance.
- Engineering explanations and document sufficiency are derived deterministically in src/lib/finding-explanation.ts from stored records; they are informational and never set finding status.
- Open access: the authenticated layout signs session-less visitors into a shared guest Engineer account (src/lib/guest-access.ts) so the preview link needs no login; real accounts still sign in via /auth.

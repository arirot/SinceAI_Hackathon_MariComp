import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/compliance";
import {regulatoryLibraryOptions} from '@/lib/regulatory-library';
import {RegulatoryLibrary} from '@/components/app/RegulatoryLibrary';

export const Route = createFileRoute("/_authenticated/_workspace/regulations")({
  head: () => pageHead("EU Environmental Regulatory Library", "Versioned EUR-Lex ship recycling, organotin and FuelEU Maritime provisions with legal wording and verification status."),
  loader:({context})=>context.queryClient.ensureQueryData(regulatoryLibraryOptions),
  component: RegulatoryLibrary,
});

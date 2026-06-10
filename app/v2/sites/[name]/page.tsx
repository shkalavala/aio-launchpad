import { FLEET } from "@/lib/fixtures/sites";
import { SiteDetailClient } from "./SiteDetailClient";

/** Enumerate site routes for static export. */
export function generateStaticParams() {
  return FLEET.map((fs) => ({ name: fs.site.name }));
}

export default async function V2SiteDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <SiteDetailClient name={name} />;
}

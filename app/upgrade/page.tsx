import { redirect } from "next/navigation";

/**
 * Legacy /upgrade route — preserved as a redirect so old bookmarks and
 * documentation links still land in the right place. The screen is now
 * called Rollout (kind-agnostic: AIO release, app, or ARM module).
 */
export default function UpgradeRedirect() {
  redirect("/rollout");
}

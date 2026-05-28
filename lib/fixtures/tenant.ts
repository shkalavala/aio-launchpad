/**
 * Tenant-level facts that apply across the entire fleet.
 *
 * ── Why "distro" lives here, not on the Site ────────────────────────────
 * A real customer runs a single Kubernetes distribution across all their
 * factories. Olympus = AKS-EE everywhere. Another customer = K3s
 * everywhere. Another = RKE2. The distro choice is set when the customer
 * adopts AIO and is essentially never mixed at scale — the operations
 * burden of running two distros side by side defeats the point of a
 * managed edge platform.
 *
 * So distro is a tenant-level constant, not a per-site picker. Sites
 * inherit it. The UI shows it once on the tenant badge, not on every
 * fleet row. The infra-scope layer model assumes every cluster in the
 * fleet runs `TENANT.distro` unless a site explicitly overrides
 * (`Site.distroOverride` — reserved for future use, not modeled yet).
 *
 * Decision recorded 2026-05-28 walkthrough. See repo memory
 * `Design decisions taken 2026-05-28` for full context.
 */

export type ClusterDistro =
  | "aksee" //  AKS Edge Essentials (Windows-host PowerShell-managed K8s)
  | "k3s" //    K3s
  | "rke2" //   Rancher RKE2
  | "aks-arc"; // AKS enabled by Arc (formerly AKS-HCI)

export interface TenantInfo {
  /** Short slug used in URLs / labels. */
  slug: string;
  /** Truncated Azure subscription id shown in the tenant badge. */
  subscriptionLabel: string;
  /**
   * The single Kubernetes distribution the tenant runs across their
   * fleet. Drives the infra-scope layer model (cluster row distro,
   * picker copy, expected version ranges).
   */
  distro: ClusterDistro;
  /** Human-readable distro label for badges and tables. */
  distroLabel: string;
}

/**
 * Fixture tenant. Matches the slug rendered in TopNav and the enterprise
 * key used by the manifest fixtures (`contoso-industries`). Distro is
 * AKS-EE to match the layered fixture sites (`cont-stockholm-packaging-01`,
 * `cont-hamburg-paintshop-01`) and
 * the Olympus-pattern research note that informed the infra-scope build.
 */
export const TENANT: TenantInfo = {
  slug: "contoso-industries",
  subscriptionLabel: "0000…0000",
  distro: "aksee",
  distroLabel: "AKS-EE",
};

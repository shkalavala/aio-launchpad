// Per-site identity + sync infrastructure fixtures.
//
// Mirrors what an operator gets back from `az iot ops show` + the two UAMIs
// bound at site-add time (components + secrets). The shapes are intentionally
// minimal — clientId / principalId are the only IDs an operator needs to
// cross-check against Key Vault access policies and Azure RBAC.
//
// All values are synthesized for the prototype. Real ones come from the AIO
// instance's secretSyncController CR + the dataflow profile's
// extendedLocation managedIdentity blocks.

export interface UamiInfo {
  /** Display name as it appears in Azure portal. */
  name: string;
  /** Used in KV access policies + dataflow YAML. */
  clientId: string;
  /** Used in Azure RBAC role assignments. */
  principalId: string;
  /** ISO timestamp of last successful federated-credential reconcile, if applicable. */
  lastFederatedCheckAt?: string;
}

export type SyncControllerHealth = "healthy" | "degraded" | "down";

export interface SiteIdentity {
  /** UAMI bound to AIO components (dataflows, schema registry, etc). */
  componentsUami: UamiInfo;
  /** UAMI bound to the SecretSync controller for pulling from central KV. */
  secretsUami: UamiInfo;
  /** SecretSync controller pod health on this cluster. */
  syncController: {
    health: SyncControllerHealth;
    lastReconcileAt: string;
    /** Free-text reason when health !== "healthy". */
    note?: string;
  };
}

/**
 * Per-site identity bindings. Key matches FLEET[].site.name. Sites omitted
 * here fall back to the inheritance-template `dataflowManagedIdentity`
 * fields for the components UAMI and synthesize a default secrets UAMI on
 * render.
 */
export const IDENTITY_BY_SITE: Record<string, SiteIdentity> = {
  "stockholm-assembly-prod": {
    componentsUami: {
      name: "uami-stockholm-assembly-components",
      clientId: "11111111-1111-1111-1111-111111111111",
      principalId: "aaaa1111-aaaa-1111-aaaa-111111111111",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    secretsUami: {
      name: "uami-stockholm-assembly-secrets",
      clientId: "11111111-1111-1111-1111-1111111111aa",
      principalId: "aaaa1111-aaaa-1111-aaaa-1111111111aa",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    syncController: {
      health: "degraded",
      lastReconcileAt: "2026-05-26T06:48:00Z",
      note: "1 secret failing (KV access policy missing 'get' on mqtt-broker-tls-cert)",
    },
  },
  "stockholm-bar-prod": {
    componentsUami: {
      name: "uami-stockholm-bar-components",
      clientId: "33333333-3333-3333-3333-333333333333",
      principalId: "bbbb3333-bbbb-3333-bbbb-333333333333",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    secretsUami: {
      name: "uami-stockholm-bar-secrets",
      clientId: "33333333-3333-3333-3333-3333333333bb",
      principalId: "bbbb3333-bbbb-3333-bbbb-3333333333bb",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    syncController: {
      health: "healthy",
      lastReconcileAt: "2026-05-26T07:14:00Z",
    },
  },
  "hamburg-assembly-prod": {
    componentsUami: {
      name: "uami-hamburg-assembly-components",
      clientId: "44444444-4444-4444-4444-444444444444",
      principalId: "cccc4444-cccc-4444-cccc-444444444444",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    secretsUami: {
      name: "uami-hamburg-assembly-secrets",
      clientId: "44444444-4444-4444-4444-4444444444cc",
      principalId: "cccc4444-cccc-4444-cccc-4444444444cc",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    syncController: {
      health: "degraded",
      lastReconcileAt: "2026-05-26T05:31:00Z",
      note: "2 secrets declared but not present in central KV (opcua-line-2-*)",
    },
  },
  "gothenburg-cutting-prod": {
    componentsUami: {
      name: "uami-gothenburg-cutting-components",
      clientId: "66666666-6666-6666-6666-666666666666",
      principalId: "dddd6666-dddd-6666-dddd-666666666666",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    secretsUami: {
      name: "uami-gothenburg-cutting-secrets",
      clientId: "66666666-6666-6666-6666-6666666666dd",
      principalId: "dddd6666-dddd-6666-dddd-6666666666dd",
      lastFederatedCheckAt: "2026-05-26T03:00:00Z",
    },
    syncController: {
      health: "healthy",
      lastReconcileAt: "2026-05-26T07:02:00Z",
    },
  },
};

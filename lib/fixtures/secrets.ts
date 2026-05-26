// Secret fixtures + central Key Vault stub.
//
// Mirrors the shape in context/scale-kit-real-yaml/input-sync-secrets.yaml:
// a per-secret metadata array. Values never live here (or in git) — the UI
// shows an "in central KV" / "missing in KV" status only.
//
// The seeded entries are realistic AIO secrets: OPC UA PLC credentials, a
// dataflow Event Hub connection string, and MQTT broker TLS material. The
// list intentionally varies per site so the picker is interesting.

import type { SecretEntry } from "@/lib/types";

export interface CentralKeyVault {
  name: string;
  resourceId: string;
  connected: boolean;
}

export const CENTRAL_KV: CentralKeyVault = {
  name: "cont-shared-kv",
  resourceId:
    "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-cont-shared/providers/Microsoft.KeyVault/vaults/cont-shared-kv",
  connected: true,
};

/**
 * Per-site secret metadata. Key is the Site name (matches FLEET[].site.name).
 * The shipping fixtures are deliberately not exhaustive — operators are
 * expected to add per-line / per-broker entries through the UI.
 */
export const SECRETS_BY_SITE: Record<string, SecretEntry[]> = {
  // Stockholm shared dev — one AIO instance for both assembly + bar lines.
  "stockholm-dev": [
    { secretName: "opcua-plc-line-a-username" },
    { secretName: "opcua-plc-line-a-password" },
    { secretName: "opcua-bar-mill-username" },
    { secretName: "opcua-bar-mill-password" },
  ],
  "stockholm-assembly-prod": [
    { secretName: "opcua-plc-line-a-username", syncStatus: "synced", lastSyncAt: "2026-05-26T07:14:00Z" },
    { secretName: "opcua-plc-line-a-password", syncStatus: "synced", lastSyncAt: "2026-05-26T07:14:00Z" },
    { secretName: "opcua-plc-line-b-username", syncStatus: "synced", lastSyncAt: "2026-05-26T07:14:00Z" },
    { secretName: "opcua-plc-line-b-password", syncStatus: "drift", lastSyncAt: "2026-05-21T11:02:00Z" },
    { secretName: "dataflow-eventhub-conn", kubernetesSecretName: "aio-dataflow-eh", kubernetesSecretKey: "connectionString", syncStatus: "synced", lastSyncAt: "2026-05-26T07:14:00Z" },
    { secretName: "mqtt-broker-tls-cert", kubernetesSecretName: "aio-mqtt-tls", kubernetesSecretKey: "tls.crt", syncStatus: "error", syncError: "Forbidden: KV access policy for SecretSync UAMI missing 'get' on 'mqtt-broker-tls-cert'", lastSyncAt: "2026-05-26T06:48:00Z" },
    { secretName: "mqtt-broker-tls-key", kubernetesSecretName: "aio-mqtt-tls", kubernetesSecretKey: "tls.key", syncStatus: "synced", lastSyncAt: "2026-05-26T07:14:00Z" },
  ],
  "stockholm-bar-prod": [
    { secretName: "opcua-bar-mill-username" },
    { secretName: "opcua-bar-mill-password" },
    { secretName: "dataflow-eventhub-conn", kubernetesSecretName: "aio-dataflow-eh", kubernetesSecretKey: "connectionString" },
    { secretName: "mqtt-broker-tls-cert", kubernetesSecretName: "aio-mqtt-tls", kubernetesSecretKey: "tls.crt" },
    { secretName: "mqtt-broker-tls-key", kubernetesSecretName: "aio-mqtt-tls", kubernetesSecretKey: "tls.key" },
  ],
  "hamburg-dev": [
    { secretName: "opcua-line-1-username" },
    { secretName: "opcua-line-1-password" },
  ],
  "hamburg-assembly-prod": [
    { secretName: "opcua-line-1-username", syncStatus: "synced", lastSyncAt: "2026-05-26T05:31:00Z" },
    { secretName: "opcua-line-1-password", syncStatus: "synced", lastSyncAt: "2026-05-26T05:31:00Z" },
    { secretName: "opcua-line-2-username", syncStatus: "missing-in-kv" },
    { secretName: "opcua-line-2-password", syncStatus: "missing-in-kv" },
    { secretName: "dataflow-eventhub-conn", kubernetesSecretName: "aio-dataflow-eh", kubernetesSecretKey: "connectionString", syncStatus: "synced", lastSyncAt: "2026-05-26T05:31:00Z" },
  ],
  "gothenburg-dev": [
    { secretName: "opcua-cutting-cell-username" },
    { secretName: "opcua-cutting-cell-password" },
  ],
  "gothenburg-cutting-prod": [
    { secretName: "opcua-cutting-cell-username", syncStatus: "synced", lastSyncAt: "2026-05-26T07:02:00Z" },
    { secretName: "opcua-cutting-cell-password", syncStatus: "syncing" },
    { secretName: "dataflow-eventhub-conn", kubernetesSecretName: "aio-dataflow-eh", kubernetesSecretKey: "connectionString", syncStatus: "synced", lastSyncAt: "2026-05-26T07:02:00Z" },
    { secretName: "mqtt-broker-tls-cert", kubernetesSecretName: "aio-mqtt-tls", kubernetesSecretKey: "tls.crt", syncStatus: "synced", lastSyncAt: "2026-05-26T07:02:00Z" },
    { secretName: "mqtt-broker-tls-key", kubernetesSecretName: "aio-mqtt-tls", kubernetesSecretKey: "tls.key", syncStatus: "synced", lastSyncAt: "2026-05-26T07:02:00Z" },
  ],
};

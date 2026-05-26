# Current AIO deployment flow — source content for Screen 0

This file is the source material for the "before" opener (Screen 0) in `DEMO.md`. It captures what deploying Azure IoT Operations actually looks like today, before any Scale Kit / Launchpad abstraction.

The screen should feel like watching someone wade through documentation. Use this content verbatim or stylized — the goal is visceral contrast, not a tutorial.

---

## The prereqs list (subset — pick 6–8 for the visual)

Before you can even start, the cluster needs to be:

- An Arc-enabled Kubernetes cluster (AKS Edge Essentials / K3s / RKE2 / etc.)
- Connected to Azure Arc with custom locations enabled
- OIDC issuer enabled on the cluster
- Workload identity federation enabled
- A user-assigned managed identity for AIO secrets
- A user-assigned managed identity for AIO components
- An Azure Key Vault in the same tenant
- A Schema Registry resource (with backing storage account)
- Custom Locations RP registered in the subscription
- Microsoft.IoTOperations RP registered in the subscription
- Microsoft.DeviceRegistry RP registered in the subscription
- Microsoft.SecretSyncController RP registered in the subscription
- Azure CLI `azure-iot-ops` extension installed
- Azure CLI `connectedk8s` extension installed
- `kubectl`, `helm` installed and configured

## The CLI command sequence (today)

A simplified version of what one cluster takes:

```bash
# 1. Connect cluster to Arc
az connectedk8s connect \
  --name myCluster \
  --resource-group myRg \
  --location eastus2

# 2. Enable OIDC + workload identity on Arc cluster
az connectedk8s update \
  --name myCluster \
  --resource-group myRg \
  --enable-oidc-issuer \
  --enable-workload-identity

# 3. Get the OIDC issuer URL
az connectedk8s show \
  --name myCluster \
  --resource-group myRg \
  --query oidcIssuerProfile.issuerUrl \
  --output tsv

# 4. Create user-assigned managed identity for AIO
az identity create \
  --name aio-identity \
  --resource-group myRg

# 5. Create user-assigned managed identity for secrets
az identity create \
  --name aio-secrets-identity \
  --resource-group myRg

# 6. Federate the identities with the OIDC issuer
az identity federated-credential create \
  --name aio-fed \
  --identity-name aio-identity \
  --resource-group myRg \
  --issuer <OIDC_ISSUER_URL> \
  --subject system:serviceaccount:azure-iot-operations:aio-default

# 7. Create the Key Vault
az keyvault create \
  --name aioKv$(Get-Random) \
  --resource-group myRg \
  --enable-rbac-authorization true

# 8. Grant the identity access to the Key Vault
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <IDENTITY_PRINCIPAL_ID> \
  --scope <KEY_VAULT_RESOURCE_ID>

# 9. Create Schema Registry storage account
az storage account create \
  --name aiosa$(Get-Random) \
  --resource-group myRg \
  --enable-hierarchical-namespace true

# 10. Create the Schema Registry
az iot ops schema registry create \
  --name aioSchemaRegistry \
  --resource-group myRg \
  --registry-namespace aio \
  --sa-resource-id <STORAGE_ACCOUNT_RESOURCE_ID>

# 11. Initialize the cluster with AIO platform deps
az iot ops init \
  --cluster myCluster \
  --resource-group myRg

# 12. Create the AIO instance
az iot ops create \
  --cluster myCluster \
  --resource-group myRg \
  --name myAioInstance \
  --sr-resource-id <SCHEMA_REGISTRY_RESOURCE_ID>

# 13. Enable secret sync on the instance
az iot ops secretsync enable \
  --instance myAioInstance \
  --resource-group myRg \
  --kv-resource-id <KEY_VAULT_RESOURCE_ID> \
  --mi-user-assigned <IDENTITY_RESOURCE_ID>

# 14. Sync each secret you need (one at a time)
az iot ops secretsync apply ...
# ... repeat per secret ...

# 15. Configure dataflows
# 16. Configure asset endpoints
# 17. Configure OPC UA connector
# ... etc ...
```

## The decision points along the way (visualizable as a list)

Per cluster, the operator has to decide:

- Which region
- Which resource group
- Cluster name conventions
- MQTT broker memory profile
- MQTT broker frontend replica count
- MQTT broker backend partition / chain counts
- Dataflow profile instance count
- Whether to enable Layered Network Management
- Trust source (self-signed vs Customer Managed)
- Deployment mode (test settings vs secure settings — see [../research/findings.md §C.1](../research/findings.md))
- AIO release to deploy (e.g. `2605`)

**Not a per-operator decision (common misconception).** Operators do **not** individually version-pin cert-manager, trust-manager, secret-store, or the AIO API/ADR API. These ship as a **bundled set per AIO release** — choosing AIO release `2605` resolves to one specific compatible set of dependency versions (per [../research/findings.md §B / §J](../research/findings.md) — cert-manager 0.12.0 + secret-store 1.4.1 + AIO 1.4.x for the 2605 release). The operator's only release-related choice is which AIO release line to target.

**Also not normally deployed.** The AIO simulator is a quickstart/demo affordance only — production deployments skip it.

## The math (call this out at the end of Screen 0)

For an industrial customer at full rollout (e.g. ~28 factories): **28 factories × ~15 prereq decisions × ~17 CLI commands = a multi-week project** that has to be re-done on every release upgrade.

That's the "before."

---

## Visual treatment suggestions

- Animate the CLI block one command at a time, scrolling fast — too fast to read individually, fast enough to feel overwhelming.
- The step counter in the corner (`Step 17 of 40 — Configuring federated credentials…`) increments as commands appear.
- Subtle red highlights on errors that would happen in the real flow (RP not registered, wrong API version, missing role assignment).
- Final beat: counter reads `Step 40 of 40` — fade in the title card: *"Now do that 28 times. Then upgrade them next quarter."*
- Hard cut to Screen 1.

## Sources (do not link in the demo, but cite if asked)

- https://learn.microsoft.com/azure/iot-operations/deploy-iot-ops/howto-prepare-cluster
- https://learn.microsoft.com/azure/iot-operations/deploy-iot-ops/howto-deploy-iot-operations
- https://learn.microsoft.com/azure/iot-operations/secure-iot-ops/howto-enable-secret-sync

Commands above are illustrative of the public flow as of AIO 2605 (May 2026). Exact flags may have evolved — fidelity to the demo's narrative beats line-perfect accuracy here.

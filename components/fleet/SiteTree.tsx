"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Building2, MapPin, Factory, FlaskConical } from "lucide-react";
import type { FleetSite } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { FACTORY_DISPLAY, siteDisplayName } from "@/lib/fixtures/sites";

type NodeKind = "enterprise" | "site" | "factory" | "shared-dev";

interface TreeNode {
  key: string;
  /** Primary label (display name). */
  label: string;
  /** Secondary slug shown in subtle monospace, for credibility with platform engineers. */
  slug?: string;
  /** Role tag shown in subtle text under the label. */
  roleTag?: string;
  kind: NodeKind;
  children: TreeNode[];
  /** Set for leaf nodes that are actual AIO instances. */
  siteName?: string;
  environment?: string;
}

function buildTree(fleet: FleetSite[]): TreeNode {
  const root: TreeNode = {
    key: "contoso-industries",
    label: "Contoso Industries",
    slug: "contoso-industries",
    roleTag: "Enterprise",
    kind: "enterprise",
    children: [],
  };

  const ensureSite = (slug: string, country: string | undefined) => {
    const key = `site:${slug}`;
    let node = root.children.find((c) => c.key === key);
    if (!node) {
      node = {
        key,
        label: siteDisplayName(slug, country),
        slug,
        roleTag: "Site",
        kind: "site",
        children: [],
      };
      root.children.push(node);
    }
    return node;
  };

  for (const fs of fleet) {
    const factorySite = fs.resolvedLabels.factorySite;
    const country = fs.resolvedLabels.country;
    const plant = fs.resolvedLabels.plant; // undefined for shared-dev leaves
    const env = fs.runtime.environment;

    const siteNode = ensureSite(factorySite, country);

    if (env === "dev") {
      // Shared dev — attaches directly under the site, no factory level.
      siteNode.children.push({
        key: `leaf:${fs.site.name}`,
        label: "Shared dev environment",
        slug: fs.site.name,
        roleTag: "Shared dev · AIO instance",
        kind: "shared-dev",
        children: [],
        siteName: fs.site.name,
        environment: env,
      });
    } else {
      // Factory == one prod AIO instance.
      siteNode.children.push({
        key: `leaf:${fs.site.name}`,
        label: FACTORY_DISPLAY[plant] ?? plant ?? fs.site.name,
        slug: fs.site.name,
        roleTag: "Factory · AIO instance",
        kind: "factory",
        children: [],
        siteName: fs.site.name,
        environment: env,
      });
    }
  }

  // Stable ordering within each site: shared dev first, then factories alphabetically.
  for (const site of root.children) {
    site.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "shared-dev" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }

  return root;
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  const selectedSiteNames = useAppStore((s) => s.selectedSiteNames);
  const toggleSiteSelected = useAppStore((s) => s.toggleSiteSelected);
  const isOpen = expanded.has(node.key);
  const isLeaf = !!node.siteName;
  const isSelected = isLeaf && node.siteName ? selectedSiteNames.includes(node.siteName) : false;

  const Icon =
    node.kind === "enterprise"
      ? Building2
      : node.kind === "site"
        ? MapPin
        : node.kind === "factory"
          ? Factory
          : FlaskConical;

  const handleClick = () => {
    if (isLeaf && node.siteName) toggleSiteSelected(node.siteName);
    else onToggle(node.key);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group flex w-full items-start gap-1.5 rounded px-1 py-1 text-left text-[13px] hover:bg-bg-subtle",
          isSelected && "bg-accent-subtle hover:bg-accent-subtle",
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
        title={node.slug}
      >
        {!isLeaf ? (
          <ChevronRight
            className={cn(
              "mt-0.5 h-3 w-3 shrink-0 text-fg-subtle transition-transform",
              isOpen && "rotate-90",
            )}
          />
        ) : (
          <span className="mt-0.5 inline-block w-3" />
        )}
        <Icon
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0",
            node.kind === "factory"
              ? "text-accent"
              : node.kind === "shared-dev"
                ? "text-fg-muted"
                : "text-fg-subtle",
          )}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className={cn("truncate", isSelected && "text-accent")}>{node.label}</span>
            {node.environment && (
              <span
                className={cn(
                  "shrink-0 rounded-sm px-1 text-[10px] font-bold uppercase",
                  node.environment === "prod"
                    ? "bg-accent text-accent-fg"
                    : "bg-bg-muted text-fg-muted",
                )}
              >
                {node.environment}
              </span>
            )}
          </span>
          {(node.roleTag || node.slug) && (
            <span className="flex items-center gap-1.5 text-[10.5px] text-fg-subtle">
              {node.roleTag && <span className="uppercase tracking-wide">{node.roleTag}</span>}
              {node.roleTag && node.slug && node.slug !== node.label && (
                <span className="opacity-60">·</span>
              )}
              {node.slug && node.slug !== node.label && (
                <span className="truncate font-mono normal-case">{node.slug}</span>
              )}
            </span>
          )}
        </span>
      </button>
      {!isLeaf && isOpen && (
        <div>
          {node.children.map((c) => (
            <TreeRow
              key={c.key}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteTree({ fleet }: { fleet: FleetSite[] }) {
  const tree = useMemo(() => buildTree(fleet), [fleet]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const walk = (n: TreeNode) => {
      if (!n.siteName) {
        set.add(n.key);
        n.children.forEach(walk);
      }
    };
    walk(tree);
    return set;
  });

  const onToggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-subtle px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
        Fleet hierarchy
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <TreeRow node={tree} depth={0} expanded={expanded} onToggle={onToggle} />
      </div>
      <div className="border-t border-border-subtle px-3 py-2 text-[10.5px] uppercase tracking-wide text-fg-subtle">
        Enterprise › Site › Factory
      </div>
    </div>
  );
}

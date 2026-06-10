"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileCode2, MapPin, Layers } from "lucide-react";
import type { FleetSite, SiteTemplate } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { healthMeta, envTone, siteHasDrift } from "@/lib/v2/format";

/**
 * Inheritance ("inherits:") tree for the connected repo: shows how each site
 * resolves its config and AIO release from its template chain
 * (base-site -> shared/region -> site). This is the hierarchy that raw git
 * can't visualize: where a site's settings actually come from.
 *
 * Built purely from FleetSite.ancestry chains, so it works for both the mock
 * fixtures and a live repo. Region/environment filters prune the tree
 * naturally because only the passed-in (filtered) fleet contributes chains.
 */

interface TreeNode {
  key: string;
  label: string;
  kind: "template" | "site";
  template?: SiteTemplate;
  fs?: FleetSite;
  children: TreeNode[];
}

function buildInheritanceTree(fleet: FleetSite[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const childKeys = new Map<string, Set<string>>();
  const hasParent = new Set<string>();

  const ensure = (key: string, make: () => TreeNode): TreeNode => {
    let n = nodes.get(key);
    if (!n) {
      n = make();
      nodes.set(key, n);
      childKeys.set(key, new Set());
    }
    return n;
  };

  const link = (parent: string, child: string) => {
    childKeys.get(parent)?.add(child);
    hasParent.add(child);
  };

  for (const fs of fleet) {
    let parentKey: string | null = null;
    for (const t of fs.ancestry) {
      ensure(t.name, () => ({ key: t.name, label: t.name, kind: "template", template: t, children: [] }));
      if (parentKey) link(parentKey, t.name);
      parentKey = t.name;
    }
    const siteKey = `site:${fs.site.name}`;
    ensure(siteKey, () => ({ key: siteKey, label: fs.site.name, kind: "site", fs, children: [] }));
    if (parentKey) link(parentKey, siteKey);
    else hasParent.delete(siteKey); // standalone site (no inherits) -> a root
  }

  // Assemble children arrays (templates first, then alphabetical).
  for (const [key, kids] of childKeys) {
    const node = nodes.get(key);
    if (!node) continue;
    node.children = Array.from(kids)
      .map((k) => nodes.get(k)!)
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "template" ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
  }

  const roots = Array.from(nodes.values()).filter((n) => !hasParent.has(n.key));
  return roots.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "template" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

function TemplateRow({
  node,
  depth,
  isOpen,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const release = node.template?.properties?.aioRelease;
  const region = node.template?.location;
  const siteCount = countSites(node);
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-bg-subtle"
      style={{ paddingLeft: depth * 18 + 8 }}
    >
      <ChevronRight
        className={cn("h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform", isOpen && "rotate-90")}
      />
      {region ? (
        <MapPin className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      ) : (
        <Layers className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      )}
      <span className="font-medium text-fg-muted">{node.label}</span>
      <Badge tone="neutral" className="shrink-0">
        shared default
      </Badge>
      {region && <span className="font-mono text-[11px] text-fg-subtle">{region}</span>}
      {release && (
        <span className="text-[11px] text-fg-subtle">
          AIO <span className="font-mono text-fg-muted">{release}</span>
        </span>
      )}
      <span className="ml-auto text-[11px] text-fg-subtle">
        provides defaults to {siteCount} site{siteCount === 1 ? "" : "s"}
      </span>
    </button>
  );
}

function SiteRow({ node, depth }: { node: TreeNode; depth: number }) {
  const fs = node.fs!;
  const env = fs.runtime.environment;
  const health = healthMeta(fs.runtime.health);
  const drift = siteHasDrift(fs);
  return (
    <Link
      href={`/v2/sites/view/?site=${encodeURIComponent(fs.site.name)}`}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-bg-subtle"
      style={{ paddingLeft: depth * 18 + 8 }}
    >
      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <span className={cn("h-2 w-2 shrink-0 rounded-full", health.dot)} />
      <span className="font-medium text-fg group-hover:text-accent">{fs.site.name}</span>
      <Badge tone={envTone(env)} className="shrink-0">
        {env}
      </Badge>
      <span className="text-[11px] text-fg-subtle">
        AIO <span className="font-mono text-fg-muted">{fs.runtime.resolvedRelease}</span>
      </span>
      {drift && (
        <Badge tone="danger" className="shrink-0">
          Drift
        </Badge>
      )}
    </Link>
  );
}

function countSites(node: TreeNode): number {
  if (node.kind === "site") return 1;
  return node.children.reduce((sum, c) => sum + countSites(c), 0);
}

function Branch({
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
  if (node.kind === "site") return <SiteRow node={node} depth={depth} />;
  const isOpen = expanded.has(node.key);
  return (
    <div>
      <TemplateRow node={node} depth={depth} isOpen={isOpen} onToggle={() => onToggle(node.key)} />
      {isOpen &&
        node.children.map((c) => (
          <Branch key={c.key} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
        ))}
    </div>
  );
}

export function InheritanceTree({ fleet }: { fleet: FleetSite[] }) {
  const roots = useMemo(() => buildInheritanceTree(fleet), [fleet]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Default: expand every template node.
    const set = new Set<string>();
    const walk = (n: TreeNode) => {
      if (n.kind === "template") {
        set.add(n.key);
        n.children.forEach(walk);
      }
    };
    roots.forEach(walk);
    return set;
  });

  const onToggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (roots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-[13px] text-fg-subtle">
        No sites match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-2">
      <div className="px-2 pb-1.5 pt-1 text-[11px] text-fg-subtle">
        Shared defaults (muted) supply config a site can opt into; each site below inherits and may override them.
      </div>
      {roots.map((node) => (
        <Branch key={node.key} node={node} depth={0} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}

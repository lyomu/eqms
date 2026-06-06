import {
  LayoutDashboard,
  FileBarChart,
  FileText,
  GitPullRequestArrow,
  TriangleAlert,
  GraduationCap,
  ClipboardCheck,
  MessageSquareWarning,
  FlaskConical,
  ClipboardList,
  ShieldAlert,
  Wrench,
  Truck,
  Boxes,
  Beaker,
  Package,
  FileWarning,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Modules not yet built (post-M1). Rendered disabled until their milestone lands. */
  comingSoon?: boolean;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

/**
 * Sidebar navigation — all 16 eQMS modules, grouped per CLAUDE-FRONTEND.md.
 * Only the Dashboard is live at Milestone 1; module routes are placeholders flagged
 * `comingSoon` and get wired up at their respective milestones (M3 Documents, M4
 * Change Control, …).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: FileBarChart },
    ],
  },
  {
    heading: "Core Quality",
    items: [
      { label: "Document Control", href: "/documents", icon: FileText },
      { label: "Change Control", href: "/change-control", icon: GitPullRequestArrow },
      { label: "Deviations", href: "/deviations", icon: TriangleAlert },
      { label: "Training", href: "/training", icon: GraduationCap },
    ],
  },
  {
    heading: "Investigation & Corrective",
    items: [
      { label: "CAPA", href: "/capa", icon: ClipboardCheck },
      { label: "Complaints", href: "/complaints", icon: MessageSquareWarning },
      { label: "OOS", href: "/oos", icon: FlaskConical },
    ],
  },
  {
    heading: "Compliance & Oversight",
    items: [
      { label: "Audits", href: "/audits", icon: ClipboardList },
      { label: "Risk", href: "/risks", icon: ShieldAlert },
      { label: "Equipment", href: "/equipment", icon: Wrench },
      { label: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    heading: "Manufacturing & Production",
    items: [
      { label: "Materials", href: "/materials", icon: Boxes },
      { label: "Batch Records", href: "/batch-records", icon: Beaker },
      { label: "Products", href: "/products", icon: Package },
      { label: "Non-Conformance", href: "/non-conformances", icon: FileWarning },
      { label: "Management Review", href: "/management-reviews", icon: Presentation },
    ],
  },
];

import {
  LayoutDashboard,
  FileText,
  GitPullRequestArrow,
  ClipboardCheck,
  TriangleAlert,
  Package,
  Boxes,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Modules not yet built (post-M0). Rendered disabled until their milestone lands. */
  comingSoon?: boolean;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

/**
 * Sidebar navigation. Only Dashboard is live at Milestone 0; module routes are
 * placeholders flagged `comingSoon` and get wired up at their respective milestones
 * (M3 Documents, M4 Change Control, ...).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    heading: "Core Quality",
    items: [
      { label: "Documents", href: "/documents", icon: FileText, comingSoon: true },
      { label: "Change Control", href: "/change-control", icon: GitPullRequestArrow, comingSoon: true },
      { label: "CAPA", href: "/capa", icon: ClipboardCheck, comingSoon: true },
      { label: "Deviations", href: "/deviations", icon: TriangleAlert, comingSoon: true },
    ],
  },
  {
    heading: "Manufacturing",
    items: [
      { label: "Products", href: "/products", icon: Package, comingSoon: true },
      { label: "Materials", href: "/materials", icon: Boxes, comingSoon: true },
      { label: "Batch Records", href: "/batch-records", icon: FlaskConical, comingSoon: true },
    ],
  },
];

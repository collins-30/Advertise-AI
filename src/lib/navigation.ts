import {
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  Library,
  Plug,
  Send,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/",
        label: "Overview",
        icon: LayoutDashboard,
        description: "Workspace health, approvals and next actions.",
      },
      {
        href: "/generate",
        label: "Generate",
        icon: Sparkles,
        description: "Brand-aware content generation.",
      },
      {
        href: "/posts",
        label: "Content",
        icon: Library,
        description: "Drafts, review queue and published posts.",
      },
      {
        href: "/calendar",
        label: "Calendar",
        icon: CalendarDays,
        description: "Scheduled publishing plan.",
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: ChartColumn,
        description: "Engagement and content performance.",
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        href: "/leads",
        label: "First 30",
        icon: Users,
        description: "Target agencies, outreach and validation interviews.",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        href: "/settings/brand",
        label: "Brand",
        icon: Settings,
        description: "Positioning, proof points and posting rules.",
      },
      {
        href: "/settings/audience",
        label: "Audience",
        icon: Users,
        description: "Personas and content pillars.",
      },
      {
        href: "/settings/accounts",
        label: "Accounts",
        icon: Plug,
        description: "Instagram and LinkedIn connections.",
      },
      {
        href: "/settings/publishing",
        label: "Publishing",
        icon: Send,
        description: "Cadence, limits and approval rules.",
      },
    ],
  },
];

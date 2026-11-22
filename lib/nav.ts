export const NAV = [
  { href: "/", label: "Dashboard", short: "Home", icon: "LayoutDashboard", phase: 1 },
  { href: "/employees", label: "Employees", short: "People", icon: "Users", phase: 4 },
  { href: "/whos-out", label: "Leave & Attendance", short: "Leave", icon: "CalendarOff", phase: 4 },
  { href: "/recruitment", label: "Recruitment", icon: "Briefcase", phase: 6 },
  { href: "/sops", label: "SOP Library", short: "SOPs", icon: "BookOpen", phase: 5 },
  { href: "/events", label: "Events & Forums", icon: "CalendarDays", phase: 5 },
  { href: "/announcements", label: "Announcements", icon: "Megaphone", phase: 5 },
  { href: "/settings", label: "Settings", icon: "Settings", phase: 3 },
] as const;

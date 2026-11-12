"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon, type IconName } from "@/components/ui/Icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/groups", label: "Groups", icon: "layers" },
  { href: "/people", label: "People", icon: "users" },
  { href: "/design", label: "Design system", icon: "palette" },
];

export function Sidebar() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <aside className="side">
      <Link className="brand" href="/" aria-label="Faculty Atlas home">
        <BrandMark />
        <div>
          <b>Faculty Atlas</b>
          <small>Northfield University</small>
        </div>
      </Link>
      <nav className="nav" aria-label="Main">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <Icon name={item.icon} width={19} height={19} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="side-foot">
        <p className="side-note">
          <b>Phase 2 build.</b> Sign-in works. Admin tools and full profiles arrive in the next phases.
        </p>
      </div>
    </aside>
  );
}

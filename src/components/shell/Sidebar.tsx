"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon, type IconName } from "@/components/ui/Icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/groups", label: "Groups", icon: "layers" },
  { href: "/people", label: "People", icon: "users" },
  { href: "/profile/edit", label: "My profile", icon: "user" },
  { href: "/design", label: "Design system", icon: "palette" },
];

function Nav({ path }: { path: string | null }) {
  const isActive = (href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="nav" aria-label="Main">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} title={item.label} aria-current={isActive(item.href) ? "page" : undefined}>
          <Icon name={item.icon} width={19} height={19} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Reads the URL, so it sits behind Suspense; the plain nav shows until it resolves. */
function ActiveNav() {
  return <Nav path={usePathname()} />;
}

export function Sidebar() {
  return (
    <aside className="side">
      <Link className="brand" href="/" aria-label="Faculty Atlas home">
        <BrandMark />
        <div>
          <b>Faculty Atlas</b>
          <small>Northfield University</small>
        </div>
      </Link>
      <Suspense fallback={<Nav path={null} />}>
        <ActiveNav />
      </Suspense>
      <div className="side-foot">
        <p className="side-note">
          <b>Phase 4 build.</b> Edit your profile from My profile. The 3D profile page arrives in Phase 5.
        </p>
      </div>
    </aside>
  );
}

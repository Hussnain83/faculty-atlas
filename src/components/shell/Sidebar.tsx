"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ORG } from "@/lib/org";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/groups", label: "Groups", icon: "layers" },
  { href: "/people", label: "People", icon: "users" },
  { href: "/profile/edit", label: "My profile", icon: "user" },
];
/** The component showcase is only useful while building and demoing. */
const DEMO_NAV = { href: "/design", label: "Design system", icon: "palette" as IconName };

function Nav({ path, demo }: { path: string | null; demo: boolean }) {
  const isActive = (href: string) => path !== null && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="nav" aria-label="Main">
      {(demo ? [...NAV, DEMO_NAV] : NAV).map((item) => (
        <Link key={item.href} href={item.href} title={item.label} aria-current={isActive(item.href) ? "page" : undefined}>
          <Icon name={item.icon} width={19} height={19} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Reads the URL, so it sits behind Suspense; the plain nav shows until it resolves. */
function ActiveNav({ demo }: { demo: boolean }) {
  return <Nav path={usePathname()} demo={demo} />;
}

export function Sidebar({ demo = false }: { demo?: boolean }) {
  return (
    <aside className="side">
      <Link className="brand" href="/" aria-label="Faculty Atlas home">
        <BrandMark />
        <div>
          <b>Faculty Atlas</b>
          <small>{ORG.name}</small>
        </div>
      </Link>
      <Suspense fallback={<Nav path={null} demo={demo} />}>
        <ActiveNav demo={demo} />
      </Suspense>
      <div className="side-foot">
        <p className="side-note">
          {demo ? (
            <>
              <b>Demo copy.</b> Sample data for testing. Press / to search.
            </>
          ) : (
            <>
              Press <kbd>/</kbd> to search people, skills, groups and papers.
            </>
          )}
        </p>
      </div>
    </aside>
  );
}

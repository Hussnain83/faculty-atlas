import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { displayName, getAccount } from "@/lib/auth";
import { signedUrls } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export async function UserChip() {
  const account = await getAccount();
  if (!account) return null;
  const name = displayName(account);
  const office = account.isAdmin && !account.person;
  const photoPath = account.person?.photoPath ?? null;
  const photo = photoPath ? ((await signedUrls(await createClient(), "photos", [photoPath])).get(photoPath) ?? null) : null;
  return (
    <div className="userchip">
      {office ? (
        <span className="av" style={{ ["--s" as string]: "34px", ["--a1" as string]: "#0D1B2A", ["--a2" as string]: "#44566A" }} aria-hidden="true">
          RO
        </span>
      ) : (
        <Link href="/profile/edit" aria-label="Edit my profile">
          <Avatar name={name} src={photo} size={34} />
        </Link>
      )}
      <span className="uc-name">
        <b>{name}</b>
        <small>{account.isAdmin ? "Admin" : "Member"}</small>
      </span>
      <form action={signOut}>
        <button className="icon-btn" type="submit" aria-label="Sign out" title="Sign out">
          <Icon name="logout" />
        </button>
      </form>
    </div>
  );
}

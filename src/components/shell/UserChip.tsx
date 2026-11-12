import { signOut } from "@/app/(auth)/actions";
import { Icon } from "@/components/ui/Icon";
import { displayName, getAccount, initials } from "@/lib/auth";

export async function UserChip() {
  const account = await getAccount();
  if (!account) return null;
  const name = displayName(account);
  const role = account.isAdmin ? "Admin" : "Member";
  return (
    <div className="userchip">
      <span
        className="av"
        style={{
          ["--s" as string]: "34px",
          ...(account.isAdmin && !account.person ? { ["--a1" as string]: "#0D1B2A", ["--a2" as string]: "#44566A" } : {}),
        }}
        aria-hidden="true"
      >
        {account.isAdmin && !account.person ? "RO" : initials(name)}
      </span>
      <span className="uc-name">
        <b>{name}</b>
        <small>{role}</small>
      </span>
      <form action={signOut}>
        <button className="icon-btn" type="submit" aria-label="Sign out" title="Sign out">
          <Icon name="logout" />
        </button>
      </form>
    </div>
  );
}

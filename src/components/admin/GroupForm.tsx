"use client";

import { useKeptForm } from "@/lib/use-kept-form";
import type { GroupFormState } from "@/app/(app)/groups/actions";
import { Icon } from "@/components/ui/Icon";
import { GROUP_COLORS } from "@/lib/validation";

type Group = { name: string; short_code: string; description: string; color: string; founded_year: number | null };

export function GroupForm({
  action,
  group,
  submitLabel,
}: {
  action: (prev: GroupFormState, form: FormData) => Promise<GroupFormState>;
  group?: Group;
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useKeptForm(action, null);
  const err = (k: "name" | "short_code" | "description" | "founded_year") => state?.errors?.[k];
  return (
    <form onSubmit={onSubmit} className="form-grid" noValidate>
      <div className={`form-field span-2${err("name") ? " bad" : ""}`}>
        <label htmlFor="gf-name">
          Group name<span className="req"> required</span>
        </label>
        <input id="gf-name" name="name" className="input" defaultValue={group?.name} placeholder="Robotics & Autonomous Systems" />
        {err("name") && <p className="field-err">{err("name")}</p>}
      </div>
      <div className={`form-field${err("short_code") ? " bad" : ""}`}>
        <label htmlFor="gf-code">
          Short code<span className="req"> required</span>
        </label>
        <input id="gf-code" name="short_code" className="input mono" maxLength={4} defaultValue={group?.short_code} placeholder="RA" style={{ textTransform: "uppercase" }} />
        {err("short_code") && <p className="field-err">{err("short_code")}</p>}
      </div>
      <div className={`form-field${err("founded_year") ? " bad" : ""}`}>
        <label htmlFor="gf-year">Founded (year)</label>
        <input id="gf-year" name="founded_year" type="number" className="input" defaultValue={group?.founded_year ?? ""} placeholder="2026" />
        {err("founded_year") && <p className="field-err">{err("founded_year")}</p>}
      </div>
      <div className={`form-field span-2${err("description") ? " bad" : ""}`}>
        <label htmlFor="gf-desc">What the group works on</label>
        <textarea id="gf-desc" name="description" className="input textarea" maxLength={600} defaultValue={group?.description} placeholder="One or two sentences shown on the group page." />
        {err("description") && <p className="field-err">{err("description")}</p>}
      </div>
      <fieldset className="form-field span-2">
        <legend>Colour</legend>
        <div className="swatch-pick">
          {GROUP_COLORS.map((c) => (
            <label key={c} title={c}>
              <input type="radio" name="color" value={c} defaultChecked={(group?.color ?? "lagoon") === c} />
              <span style={{ ["--c" as string]: `var(--${c})` }} />
              <span className="sr-only">{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-actions span-2">
        {state?.errors?.form && <p className="field-err">{state.errors.form}</p>}
        {state?.ok && state.message && (
          <p className="saved" role="status">
            <Icon name="check" width={15} height={15} />
            {state.message}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? <span className="spin dark" /> : <Icon name="check" />}
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

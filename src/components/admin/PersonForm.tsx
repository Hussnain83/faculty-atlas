"use client";

import { useKeptForm } from "@/lib/use-kept-form";
import type { FormState } from "@/app/(app)/people/actions";
import { Icon } from "@/components/ui/Icon";

type Person = {
  full_name: string;
  email: string;
  title: string;
  department: string;
  office: string | null;
  phone_ext: string | null;
  joined_year: number | null;
};
type GroupOption = { id: string; name: string; short_code: string };

export function PersonForm({
  action,
  person,
  groups,
  submitLabel,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  person?: Person;
  groups?: GroupOption[];
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useKeptForm(action, null);
  const err = (k: string) => state?.errors?.[k as keyof NonNullable<FormState>["errors"]];
  const field = (name: keyof Person, label: string, opts: { type?: string; placeholder?: string; required?: boolean; span?: boolean } = {}) => (
    <div className={`form-field${opts.span ? " span-2" : ""}${err(name) ? " bad" : ""}`}>
      <label htmlFor={`pf-${name}`}>
        {label}
        {opts.required && <span className="req"> required</span>}
      </label>
      <input
        id={`pf-${name}`}
        name={name}
        className="input"
        type={opts.type ?? "text"}
        defaultValue={person?.[name] ?? ""}
        placeholder={opts.placeholder}
        aria-invalid={err(name) ? true : undefined}
      />
      {err(name) && <p className="field-err">{err(name)}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="form-grid" noValidate>
      {field("full_name", "Full name", { required: true, placeholder: "Dr. Sara Malik", span: true })}
      {field("email", "Work email", { type: "email", required: true, placeholder: "s.malik@northfield.edu", span: true })}
      {field("title", "Title", { placeholder: "Assistant Professor" })}
      {field("department", "Department", { placeholder: "Computer Science" })}
      {field("office", "Office", { placeholder: "Block C · Room 214" })}
      {field("phone_ext", "Phone extension", { placeholder: "Ext. 4127" })}
      {field("joined_year", "Joined Northfield (year)", { type: "number", placeholder: "2024" })}
      {groups && groups.length > 0 && (
        <fieldset className="form-field span-2">
          <legend>Add to groups (optional)</legend>
          <div className="check-chips">
            {groups.map((g) => (
              <label key={g.id} className="check-chip">
                <input type="checkbox" name="groups" value={g.id} />
                <span>
                  {g.short_code} · {g.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
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

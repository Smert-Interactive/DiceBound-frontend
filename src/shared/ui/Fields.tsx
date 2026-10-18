import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  changed?: boolean;
  readOnly?: boolean;
  className?: string;
}
function descriptions(id: string, hint?: string, error?: string, external?: string) {
  return [external, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}
function FieldNotes({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return <>{hint && <span className="ui-field__hint" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="ui-field__error" id={`${id}-error`}>{error}</span>}</>;
}

export function Input({ label, hint, error, changed, readOnly, className = "", id: suppliedId,
  "aria-describedby": external, ...props }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className">) {
  const generated = useId();
  const id = suppliedId ?? generated;
  const describedBy = descriptions(id, hint, error, external);
  return <div className={`ui-field ${className}`}>
    {readOnly ? <><span className="ui-field__label" id={`${id}-label`}>{label}</span>
      <div className="ui-readonly" data-type={props.type} aria-labelledby={`${id}-label`} aria-describedby={describedBy}>{props.value ?? props.defaultValue ?? "—"}</div></>
      : <><label className="ui-field__label" htmlFor={id}>{label}</label>
        <input {...props} id={id} className="ui-control" data-changed={changed || undefined}
          aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={describedBy} /></>}
    <FieldNotes id={id} hint={hint} error={error} />
  </div>;
}

interface Option { value: string; label: string }
export function Select({ label, hint, error, changed, readOnly, options, className = "", id: suppliedId,
  "aria-describedby": external, ...props }: FieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & { options: readonly Option[] }) {
  const generated = useId();
  const id = suppliedId ?? generated;
  const describedBy = descriptions(id, hint, error, external);
  const value = props.value ?? props.defaultValue;
  return <div className={`ui-field ${className}`}>
    {readOnly ? <><span className="ui-field__label" id={`${id}-label`}>{label}</span>
      <div className="ui-readonly" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>{options.find(option => option.value === value)?.label ?? "—"}</div></>
      : <><label className="ui-field__label" htmlFor={id}>{label}</label>
        <div className="ui-select">
        <select {...props} id={id} className="ui-control" data-changed={changed || undefined}
          aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={describedBy}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <svg className="ui-select__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </div></>}
    <FieldNotes id={id} hint={hint} error={error} />
  </div>;
}

export function Checkbox({ label, hint, error, readOnly, changed, className = "", id: suppliedId,
  "aria-describedby": external, ...props }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const generated = useId();
  const id = suppliedId ?? generated;
  const checked = props.checked ?? props.defaultChecked ?? false;
  const describedBy = descriptions(id, hint, error, external);
  return <div className={`ui-field ${className}`}>
    {readOnly ? <div className="ui-check ui-readonly" aria-describedby={describedBy}>
      <svg className="ui-check__box" data-checked={checked || undefined} viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9 3 3 7-7" /></svg><span>{label}: {checked ? "Да" : "Нет"}</span>
    </div> : <label className="ui-check" data-disabled={props.disabled || undefined} data-changed={changed || undefined} data-error={!!error || undefined}>
      <input {...props} id={id} type="checkbox" aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={describedBy} />
      <svg className="ui-check__box" viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9 3 3 7-7" /></svg><span>{label}</span>
    </label>}
    <FieldNotes id={id} hint={hint} error={error} />
  </div>;
}

export function RadioCard({ label, description, className = "", ...props }:
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; description?: ReactNode }) {
  const id = useId();
  return <label className={`ui-radio ${className}`}>
    <input {...props} type="radio" aria-describedby={description ? id : props["aria-describedby"]} />
    <span className="ui-radio__circle" aria-hidden="true" />
    <span><span className="ui-radio__title">{label}</span>{description && <span className="ui-radio__description" id={id}>{description}</span>}</span>
  </label>;
}

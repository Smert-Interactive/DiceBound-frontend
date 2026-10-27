import { useId } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { ChevronDownIcon } from "../icons";
import {
  joinDescriptions,
  useFieldAccessibility,
} from "./useFieldAccessibility";

import "./Fields.css";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  changed?: boolean;
  readOnly?: boolean;
  className?: string;
}

interface FieldNotesProps {
  hintId: string;
  errorId: string;
  hint?: string;
  error?: string;
}

function FieldNotes({ hintId, errorId, hint, error }: FieldNotesProps) {
  return (
    <>
      {hint && (
        <span className="ui-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="ui-field__error" id={errorId}>
          {error}
        </span>
      )}
    </>
  );
}

type InputProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    // Кнопки по бокам поля (счётчик −/+).
    before?: ReactNode;
    after?: ReactNode;
    // Подпись внутри поля справа (диапазон «1–20»); не доступна скринридеру как текст поля.
    suffix?: ReactNode;
  };

export function Input({
  label,
  hint,
  error,
  changed,
  readOnly,
  before,
  after,
  suffix,
  className = "",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...inputProps
}: InputProps) {
  const accessibility = useFieldAccessibility({
    id,
    hint,
    error,
    describedBy,
    invalid,
  });
  let control: ReactNode;

  if (readOnly) {
    control = (
      <>
        <span className="ui-field__label" id={accessibility.labelId}>
          {label}
        </span>
        <div
          role="group"
          className="ui-readonly"
          data-type={inputProps.type}
          aria-labelledby={accessibility.labelId}
          aria-describedby={accessibility.describedBy}
        >
          {inputProps.value ?? inputProps.defaultValue ?? "—"}
        </div>
      </>
    );
  } else {
    const input = (
      <input
        {...inputProps}
        id={accessibility.id}
        className="ui-control"
        data-changed={changed || undefined}
        aria-invalid={accessibility.invalid}
        aria-describedby={accessibility.describedBy}
      />
    );

    control = (
      <>
        <label className="ui-field__label" htmlFor={accessibility.id}>
          {label}
        </label>
        {before || after || suffix ? (
          <div className="ui-input">
            {before}
            <div className="ui-input__control">
              {input}
              {suffix && (
                <span className="ui-input__suffix" aria-hidden="true">
                  {suffix}
                </span>
              )}
            </div>
            {after}
          </div>
        ) : (
          input
        )}
      </>
    );
  }

  return (
    <div className={`ui-field ${className}`}>
      {control}
      <FieldNotes {...accessibility} hint={hint} error={error} />
    </div>
  );
}

interface Option {
  value: string;
  label: string;
}

type SelectProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
    options: readonly Option[];
  };

export function Select({
  label,
  hint,
  error,
  changed,
  readOnly,
  options,
  className = "",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...selectProps
}: SelectProps) {
  const accessibility = useFieldAccessibility({
    id,
    hint,
    error,
    describedBy,
    invalid,
  });
  const value = selectProps.value ?? selectProps.defaultValue;
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "—";
  let control: ReactNode;

  if (readOnly) {
    control = (
      <>
        <span className="ui-field__label" id={accessibility.labelId}>
          {label}
        </span>
        <div
          role="group"
          className="ui-readonly"
          aria-labelledby={accessibility.labelId}
          aria-describedby={accessibility.describedBy}
        >
          {selectedLabel}
        </div>
      </>
    );
  } else {
    control = (
      <>
        <label className="ui-field__label" htmlFor={accessibility.id}>
          {label}
        </label>
        <div className="ui-select">
          <select
            {...selectProps}
            id={accessibility.id}
            className="ui-control"
            data-changed={changed || undefined}
            aria-invalid={accessibility.invalid}
            aria-describedby={accessibility.describedBy}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="ui-select__arrow" />
        </div>
      </>
    );
  }

  return (
    <div className={`ui-field ${className}`}>
      {control}
      <FieldNotes {...accessibility} hint={hint} error={error} />
    </div>
  );
}

type CheckboxProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function CheckMark({ checked }: { checked?: boolean }) {
  return (
    <svg
      className="ui-check__box"
      data-checked={checked || undefined}
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path d="m4 9 3 3 7-7" />
    </svg>
  );
}

export function Checkbox({
  label,
  hint,
  error,
  readOnly,
  changed,
  className = "",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...inputProps
}: CheckboxProps) {
  const accessibility = useFieldAccessibility({
    id,
    hint,
    error,
    describedBy,
    invalid,
  });
  const checked = inputProps.checked ?? inputProps.defaultChecked ?? false;
  let control: ReactNode;

  if (readOnly) {
    control = (
      <div
        role="group"
        className="ui-check ui-readonly"
        aria-labelledby={accessibility.labelId}
        aria-describedby={accessibility.describedBy}
      >
        <CheckMark checked={checked} />
        <span id={accessibility.labelId}>
          {label}
          {/* Состояние видно по квадрату, скринридеру его говорит скрытый текст. */}
          <span className="ui-visually-hidden">: {checked ? "Да" : "Нет"}</span>
        </span>
      </div>
    );
  } else {
    control = (
      <label
        className="ui-check"
        data-disabled={inputProps.disabled || undefined}
        data-changed={changed || undefined}
        data-error={Boolean(error) || undefined}
      >
        <input
          {...inputProps}
          id={accessibility.id}
          type="checkbox"
          aria-invalid={accessibility.invalid}
          aria-describedby={accessibility.describedBy}
        />
        <CheckMark />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <div className={`ui-field ${className}`}>
      {control}
      <FieldNotes {...accessibility} hint={hint} error={error} />
    </div>
  );
}

type RadioCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  description?: ReactNode;
};

export function RadioCard({
  label,
  description,
  className = "",
  "aria-describedby": externalDescription,
  ...inputProps
}: RadioCardProps) {
  const descriptionId = useId();
  const describedBy = joinDescriptions(
    externalDescription,
    description ? descriptionId : undefined,
  );

  return (
    <label className={`ui-radio ${className}`}>
      <input {...inputProps} type="radio" aria-describedby={describedBy} />
      <span className="ui-radio__circle" aria-hidden="true" />
      <span>
        <span className="ui-radio__title">{label}</span>
        {description && (
          <span className="ui-radio__description" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

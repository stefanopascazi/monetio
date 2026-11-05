import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { Field, describedBy } from "../Field/Field";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Content inside the control before the input (icon or text). */
  prefix?: ReactNode;
  /** Content inside the control after the input. */
  suffix?: ReactNode;
}

export function TextField({ label, hint, error, optional, prefix, suffix, id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} optional={optional} className={className}>
      <div className="mio-control">
        {prefix && <span className="mio-control__affix">{prefix}</span>}
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
        />
        {suffix && <span className="mio-control__affix">{suffix}</span>}
      </div>
    </Field>
  );
}

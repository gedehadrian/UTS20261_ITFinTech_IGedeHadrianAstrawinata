import AreaSearch from "@/components/AreaSearch";
import type { ShippingDetails, ShippingErrors } from "@/lib/validation";

interface ShippingFormProps {
  value: ShippingDetails;
  errors: ShippingErrors;
  onChange: (value: ShippingDetails) => void;
}

interface FieldConfig {
  name: Exclude<keyof ShippingDetails, "area">;
  label: string;
  type?: string;
  autoComplete: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  placeholder?: string;
  span?: boolean;
}

const CONTACT_FIELDS: FieldConfig[] = [
  { name: "fullName", label: "Full name", autoComplete: "name", span: true },
  { name: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "0812 3456 7890" },
];

const ADDRESS_FIELDS: FieldConfig[] = [
  { name: "address", label: "Street address", autoComplete: "street-address", placeholder: "Jl. Kemang Raya No. 10", span: true },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "postalCode", label: "Postal code", autoComplete: "postal-code", inputMode: "numeric", placeholder: "12730" },
];

export default function ShippingForm({ value, errors, onChange }: ShippingFormProps) {
  function renderField(field: FieldConfig) {
    const error = errors[field.name];
    const id = `shipping-${field.name}`;
    return (
      <div key={field.name} className={field.span ? "sm:col-span-2" : undefined}>
        <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
          {field.label}
        </label>
        <input
          id={id}
          name={field.name}
          type={field.type ?? "text"}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          placeholder={field.placeholder}
          value={value[field.name]}
          onChange={(e) => onChange({ ...value, [field.name]: e.target.value })}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 w-full rounded-lg border bg-white px-3 text-[15px] outline-none transition placeholder:text-ink/30 focus:ring-2 ${
            error ? "border-accent focus:ring-accent/15" : "border-line focus:border-ink/40 focus:ring-ink/5"
          }`}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-accent">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {CONTACT_FIELDS.map(renderField)}

      <div className="sm:col-span-2">
        <AreaSearch
          onSelect={(s) => onChange({ ...value, area: s.area, city: s.city, postalCode: s.postalCode })}
        />
        {value.area && (
          <p className="mt-2 flex items-start justify-between gap-3 rounded-lg bg-success-soft px-3 py-2 text-xs text-success">
            <span>{value.area}</span>
            <button
              type="button"
              onClick={() => onChange({ ...value, area: "" })}
              className="shrink-0 underline underline-offset-2"
            >
              Clear
            </button>
          </p>
        )}
      </div>

      {ADDRESS_FIELDS.map(renderField)}
    </div>
  );
}

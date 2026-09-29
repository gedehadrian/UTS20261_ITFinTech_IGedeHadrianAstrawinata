export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  /** Kelurahan, kecamatan and province picked from the address search (optional). */
  area: string;
  city: string;
  postalCode: string;
}

export type ShippingErrors = Partial<Record<keyof ShippingDetails, string>>;

export const EMPTY_SHIPPING: ShippingDetails = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  area: "",
  city: "",
  postalCode: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+62|62|0)8\d{7,11}$/;
const POSTAL_RE = /^\d{5}$/;

export function normalizePhone(phone: string) {
  return phone.replace(/[\s-]/g, "");
}

export function validateShipping(details: ShippingDetails): ShippingErrors {
  const errors: ShippingErrors = {};
  if (details.fullName.trim().length < 3) errors.fullName = "Enter the recipient's full name.";
  if (!EMAIL_RE.test(details.email.trim())) errors.email = "Enter a valid email address.";
  if (!PHONE_RE.test(normalizePhone(details.phone))) errors.phone = "Use an Indonesian mobile number, e.g. 0812 3456 7890.";
  if (details.address.trim().length < 6) errors.address = "Enter the street name and number.";
  if (details.city.trim().length < 3) errors.city = "Enter a city.";
  if (!POSTAL_RE.test(details.postalCode.trim())) errors.postalCode = "Postal code is 5 digits.";
  return errors;
}

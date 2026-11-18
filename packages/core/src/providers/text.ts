import { asRecord } from "../record";

export function joinTextParts(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value : null;
  if (!Array.isArray(value)) return null;
  const text = value
    .map((part) => {
      if (typeof part === "string") return part;
      const record = asRecord(part);
      return typeof record?.text === "string" ? record.text : "";
    })
    .join("");
  return text.trim() ? text : null;
}

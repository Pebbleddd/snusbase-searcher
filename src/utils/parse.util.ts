import parsePhoneNumberFromString, {CountryCode} from "libphonenumber-js";
import {ConfigService} from "../config/ConfigService";
import {Config} from "../types/config.types";
import {BreachRecord, ValidatedBreachRecord} from "../types/response.types";

const emailRegex = new RegExp("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "g");

export function findEmailsInLine(line: string): RegExpMatchArray | [] {
  return line.match(emailRegex) ?? [];
}

/**
 * Validates a phone number and normalizes the format in E.164 form, e.g. "+14155551234"
 *
 * @params phoneNumber
 * @returns E.164 formatted phone number, or null if the phone number could not be parsed
 */
function parsePhoneNumber(phoneNumber: string): string | null {
  try {
    const config: Config = ConfigService.getInstance().getConfig();
    const parsed = parsePhoneNumberFromString(phoneNumber.trim(), config.defaultISOCountryCode as CountryCode);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.number; // E.164 form, e.g. "+14155551234"
  } catch {
    return null;
  }
}

/**
 * Validates a raw breach record and normalizes its fields. Returns null if
 * the record is missing required fields (phone, name) or has an unparseable
 * phone number.
 *
 * Phone numbers are returned in E.164 format. Names are trimmed.
 *
 * @param databaseEntry  Raw record from Snusbase /search response.
 * @returns A new ValidatedBreachRecord, or null if the record was rejected.
 */
export function validateAndParseEntry(databaseEntry: BreachRecord): ValidatedBreachRecord | null {
  if (!databaseEntry.phone) return null;

  const parsedPhoneNumber = parsePhoneNumber(databaseEntry.phone);
  if (!parsedPhoneNumber) return null;

  if (!isValidName(databaseEntry.name)) return null;

  const trimmed = databaseEntry.name.trim();

  return {
    ...databaseEntry,
    name: trimmed,
    phone: parsedPhoneNumber
  };
}

export function buildLine(databaseEntry: ValidatedBreachRecord): string {
  let line = `${databaseEntry.name.toLowerCase()} | ${databaseEntry.email.toLowerCase()} | ${databaseEntry.phone}`;

  //optional fields
  if (looksLikeLocation(databaseEntry.address)) {
    line += ` | ${databaseEntry.address.toLowerCase()}`
  }
  return line;
}

function isValidName(name: string | undefined): name is string {
  if (!name?.trim()) {
    return false;
  }

  const trimmed = name.trim();

  // must contain at least one letter
  if (!/[a-z]/i.test(trimmed)) {
    return false;
  }

  // reject if mostly digits
  const digitCount = (trimmed.match(/\d/g) ?? []).length;

  return digitCount <= trimmed.length / 2;
}

function looksLikeLocation(input: string | undefined): input is string {
  if (!input) return false;

  const value = input.trim();

  if (value.length < 2) return false;

  if (/^[^a-zA-Z0-9]+$/.test(value)) return false;

  if (/\d/.test(value) && /[,\n]/.test(value)) return true;

  if (/^[A-Za-z .'-]+,\s*[A-Za-z .'-]{2,}$/.test(value)) return true;

  if (/^[A-Z]{2}$/.test(value)) return true;

  return /^[A-Za-z .'-]{3,}$/.test(value);
}

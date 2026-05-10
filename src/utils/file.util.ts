import fs from "fs";
import readline from "readline";

const emailRegex = new RegExp("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "g");

export async function parseFileDataForEmails(filePath: string): Promise<Set<string>> {
  const results = new Set<string>();

  const fileStream = fs.createReadStream(filePath, {
    encoding: "utf-8",
  });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const emails = line.match(emailRegex) ?? [];

    for (const email of emails) {
      results.add(email.toLowerCase());
    }
  }

  return results;
}
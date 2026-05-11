import fs from "fs";
import readline from "readline";
import {findEmailsInLine} from "./parse.util";



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
    const emails =  findEmailsInLine(line);
    if (emails.length === 0) {
      continue;
    }

    for (const email of emails) {
      results.add(email.toLowerCase());
    }
  }

  return results;
}
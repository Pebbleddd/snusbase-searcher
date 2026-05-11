import fs from "fs";
import readline from "readline";
import {findEmailsInLine} from "./parse.util";

export async function parseFileDataForEmailBatches(filePath: string, batchSize: number, onBatch: (batch: string[]) => void): Promise<void> {
  const seenEmails = new Set<string>();
  let batch: string[] = [];


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
      const normalizedEmail = email.toLowerCase();

      if (seenEmails.has(normalizedEmail)) {
        continue;
      }

      seenEmails.add(normalizedEmail);
      batch.push(normalizedEmail);

      if (batch.length >= batchSize) {
        onBatch(batch);
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    onBatch(batch);
  }
}
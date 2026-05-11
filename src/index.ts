import {parseFileDataForEmailBatches} from "./utils/file.util";
import {DatabaseSearchResponse} from "./types/response.types";
import axios from "axios"
import "dotenv/config"
import {ConfigService} from "./config/ConfigService";
import {Config} from "./types/config.types";
import Denque from "denque";
import {buildLine, validateAndParseEntry} from "./utils/parse.util";
import {appendFile} from "node:fs/promises";

const config: Config = ConfigService.getInstance().getConfig();

let activeBatchSearchCount = 0;
const batchSearchQueue = new Denque<() => Promise<void>>();

let activeLineWriteCount = 0;
const lineWriteQueue = new Denque<string>();

const foundNumbers = new Set<string>();

function processBatchSearchQueue(maxConcurrent: number) {
  while (activeBatchSearchCount < maxConcurrent && batchSearchQueue.length > 0) {
    const job = batchSearchQueue.shift();
    if (!job) return;

    activeBatchSearchCount++;

    job()
      .catch(console.error)
      .finally(() => {
        activeBatchSearchCount--;
        processBatchSearchQueue(maxConcurrent);
      });
  }
}

async function processLineWriteQueue() {
  if (activeLineWriteCount >= 1) return;

  activeLineWriteCount++;

  try {
    while (lineWriteQueue.length > 0) {
      const line = lineWriteQueue.shift();
      if (!line) continue;

      console.log(line);
      await appendFile("output.txt", line + "\n");
    }
  } catch (err) {
    console.error(err);
  } finally {
    activeLineWriteCount--;
  }
}

async function getBatchData(emailBatch: string[]) {
  const {data} = await axios.post<DatabaseSearchResponse>("https://api.snusbase.com/data/search", {
    terms: emailBatch, types: config.types,
  }, {
    headers: {
      "Content-Type": "application/json", "Auth": config.apiKey
    },
  })

  if (!data) {
    throw new Error("Error obtaining data from /search")
  }

  for (const database of Object.keys(data.results)) {
    for (const databaseEntry of data.results[database]!) {
      const validatedDatabaseEntry = validateAndParseEntry(databaseEntry);
      if (!validatedDatabaseEntry) continue;

      const line = buildLine(validatedDatabaseEntry);

      if (foundNumbers.has(line)) continue;  // checks if this line has already been written

      foundNumbers.add(line);

      lineWriteQueue.push(line);
      processLineWriteQueue().then();
    }
  }
}

async function main() {
  await parseFileDataForEmailBatches(
    "./emails.txt",
    config.batchSize,
    (batch) => {
      batchSearchQueue.push(() => getBatchData(batch));
      processBatchSearchQueue(config.concurrentBatches);
    }
  );
}

main().then();
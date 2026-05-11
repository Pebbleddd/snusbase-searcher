import {parseFileDataForEmailBatches} from "./utils/file.util";
import {DatabaseSearchResponse} from "./types/response.types";
import axios from "axios"
import "dotenv/config"
import {ConfigService} from "./config/ConfigService";
import {Config} from "./types/config.types";
import Denque from "denque";
import {buildLine, validateAndParseEntry} from "./utils/parse.util";
import {appendFile} from "node:fs/promises";
import {sleep} from "./utils/time.util";

const config: Config = ConfigService.getInstance().getConfig();

type emailBatch = {
  batch: string[]; retryCount: number;
};

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

async function getBatchData(emailBatch: emailBatch) {
  if (config.chunkDelaySeconds > 0) await sleep(config.chunkDelaySeconds * 1000);
  let data: DatabaseSearchResponse | undefined;
  try {
    ({data} = await axios.post<DatabaseSearchResponse>("https://api.snusbase.com/data/search", {
      terms: emailBatch.batch, types: config.types, wildcard: config.wildcard
    }, {
      headers: {
        "Content-Type": "application/json", Auth: config.apiKey,
      }, timeout: config.requestTimeoutSeconds * 1000,
    }));
  } catch (error) {
    console.error(`Request failed due to ${error}`);
    if (emailBatch.retryCount < config.attemptCount) {
      emailBatch.retryCount++;
      console.log(`Retrying batch, attempt #${emailBatch.retryCount}`)
      batchSearchQueue.push(() => getBatchData(emailBatch));
    }
    return;
  }

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
  await parseFileDataForEmailBatches("./emails.txt", config.batchSize, (batch) => {
    batchSearchQueue.push(() => getBatchData({batch, retryCount: 1}));
    processBatchSearchQueue(config.concurrentBatches);
  });
}

main().then();
import Denque from "denque";
import {ProxyEntry} from "./types/proxy.types";
import {parseFileDataForEmailBatches} from "./utils/file.util";
import {DatabaseSearchResponse, ValidatedBreachRecord} from "./types/response.types";
import axios, {AxiosRequestConfig} from "axios"
import {buildLine, validateAndParseEntry} from "./utils/parse.util";
import {appendFile} from "node:fs/promises";
import {sleep} from "./utils/time.util";
import {EmailBatch} from "./types/batch.types";
import {getRandomProxy, parseProxyFile, toAxiosProxy} from "./utils/proxy.util";
import {Config} from "./types/config.types";
import {ConfigService} from "./config/ConfigService";

export class Searcher {
  private config: Config = ConfigService.getInstance().getConfig();

  private proxies: ProxyEntry[] = [];

  private activeBatchSearchCount = 0;
  private batchSearchQueue = new Denque<() => Promise<void>>();

  private activeLineWriteCount = 0;
  private lineWriteQueue = new Denque<string>();

  private writtenLines = new Set<string>();

  private batchCompleteCount = 0;

  private processBatchSearchQueue(maxConcurrent: number) {
    while (this.activeBatchSearchCount < maxConcurrent && this.batchSearchQueue.length > 0) {
      const job = this.batchSearchQueue.shift();
      if (!job) return;

      this.activeBatchSearchCount++;

      job()
        .catch(console.error)
        .finally(() => {
          this.activeBatchSearchCount--;
          this.processBatchSearchQueue(maxConcurrent);
        });
    }
  }

  private async processLineWriteQueue() {
    if (this.activeLineWriteCount >= 1) return;

    this.activeLineWriteCount++;

    try {
      while (this.lineWriteQueue.length > 0) {
        const line = this.lineWriteQueue.shift();
        if (!line) continue;

        await appendFile("output.txt", line + "\n");
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.activeLineWriteCount--;
    }
  }

  private buildAxiosConfig(): AxiosRequestConfig {
    const requestConfig: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
        Auth: this.config.apiKey,
      },
      timeout: this.config.requestTimeoutSeconds * 1000,
    };

    const proxy = this.config.useProxies ? getRandomProxy(this.proxies) : null;

    if (proxy) {
      requestConfig.proxy = toAxiosProxy(proxy);
    } else {
      requestConfig.proxy = false;
    }

    return requestConfig;
  }

  private async getBatchData(emailBatch: EmailBatch) {
    let data: DatabaseSearchResponse | undefined;

    try {
      ({ data } = await axios.post<DatabaseSearchResponse>(
        "https://api.snusbase.com/data/search",
        {
          terms: emailBatch.batch,
          types: this.config.types,
          wildcard: this.config.wildcard,
        },
        this.buildAxiosConfig()
      ));
    } catch (error) {
      console.error(`Request failed due to ${error}`);

      if (emailBatch.attemptCount < this.config.attemptCount) {
        emailBatch.attemptCount++;
        console.log(`Retrying batch, attempt #${emailBatch.attemptCount}`);
        this.batchSearchQueue.push(() => this.getBatchData(emailBatch));
        this.processBatchSearchQueue(this.config.concurrentBatches);
      }

      return;
    }

    if (!data) {
      throw new Error("Error obtaining data from /search")
    }

    for (const [, entries] of Object.entries(data.results)) {
      for (const databaseEntry of entries) {
        const validatedDatabaseEntry: ValidatedBreachRecord | null = validateAndParseEntry(databaseEntry);
        if (!validatedDatabaseEntry) continue;

        const line = buildLine(validatedDatabaseEntry);

        if (this.writtenLines.has(line)) continue;  // checks if this line has already been written

        this.writtenLines.add(line);
        this.lineWriteQueue.push(line);
        void this.processLineWriteQueue();
      }
    }
    this.batchCompleteCount++;
    console.log(`Batch #${this.batchCompleteCount} Complete`);
  }

  private async waitForCompletion(): Promise<void> {
    while (
      this.batchSearchQueue.length > 0 ||
      this.activeBatchSearchCount > 0 ||
      this.lineWriteQueue.length > 0 ||
      this.activeLineWriteCount > 0
      ) {
      await sleep(100);
    }
  }

  public async run (): Promise<number> {
    this.proxies = this.config.useProxies
      ? await parseProxyFile("./proxies.txt")
      : [];
    await parseFileDataForEmailBatches("./emails.txt", this.config.batchSize, async (batch) => {
      if (this.config.chunkDelaySeconds > 0) await sleep(this.config.chunkDelaySeconds * 1000);
      this.batchSearchQueue.push(() => this.getBatchData({batch, attemptCount: 1}));
      this.processBatchSearchQueue(this.config.concurrentBatches);
    });
    await this.waitForCompletion();
    return this.batchCompleteCount;
  }
}
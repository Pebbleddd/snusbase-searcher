export interface Config {
  apiKey?: string;
  concurrentBatches: number;
  batchSize: number;
  attemptCount: number;
  chunkDelaySeconds: number;
  requestTimeoutSeconds: number;
  wildcard: boolean;
  types: string[];
  defaultISOCountryCode: string;
}
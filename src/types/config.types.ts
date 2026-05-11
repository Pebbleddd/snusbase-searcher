export interface Config {
  apiKey?: string;
  useProxies: boolean;
  concurrentBatches: number;
  batchSize: number;
  attemptCount: number;
  chunkDelaySeconds: number;
  requestTimeoutSeconds: number;
  wildcard: boolean;
  types: string[];
  defaultISOCountryCode: string;
}
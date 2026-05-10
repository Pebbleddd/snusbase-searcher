export interface Config {
  apiKey?: string,
  threadCount: number
  batchSize: number,
  attemptCount: number,
  chunkDelaySeconds: number,
  requestTimeoutSeconds: number,
  wildcard: boolean
}
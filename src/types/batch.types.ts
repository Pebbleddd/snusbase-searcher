export type EmailBatch = {
  /** Array of emails to be processed together. */
  batch: string[];
  /** How many times a batch has been processed in case of failure */
  attemptCount: number;
};
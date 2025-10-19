/**
 * State Checkpointing Service
 * Allows resuming long-running operations after failures or interruptions
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CheckpointData<T = any> {
  id: string;
  operation: string;
  state: T;
  timestamp: number;
  completed: boolean;
  progress?: number; // 0-100 percentage
  error?: string;
}

export interface CheckpointOptions {
  storageKey?: string;
  ttl?: number; // Time-to-live in milliseconds (default: 1 hour)
  autoCleanup?: boolean;
}

/**
 * State Checkpoint Manager
 * Persists operation state to chrome.storage.local for resumption
 */
export class StateCheckpoint {
  private static readonly DEFAULT_STORAGE_KEY = 'operation_checkpoints';
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

  private storageKey: string;
  private ttl: number;
  private autoCleanup: boolean;

  constructor(options: CheckpointOptions = {}) {
    this.storageKey = options.storageKey || StateCheckpoint.DEFAULT_STORAGE_KEY;
    this.ttl = options.ttl || StateCheckpoint.DEFAULT_TTL;
    this.autoCleanup = options.autoCleanup !== false;

    if (this.autoCleanup) {
      this.cleanupExpired();
    }
  }

  /**
   * Save a checkpoint for an operation
   */
  async save<T>(checkpoint: Omit<CheckpointData<T>, 'timestamp'>): Promise<void> {
    const checkpoints = await this.getAllCheckpoints();

    const fullCheckpoint: CheckpointData<T> = {
      ...checkpoint,
      timestamp: Date.now(),
    };

    checkpoints[checkpoint.id] = fullCheckpoint;

    await chrome.storage.local.set({
      [this.storageKey]: checkpoints,
    });

    console.log(`✅ Checkpoint saved: ${checkpoint.id} (${checkpoint.progress ?? 0}% complete)`);
  }

  /**
   * Load a checkpoint by ID
   */
  async load<T>(id: string): Promise<CheckpointData<T> | null> {
    const checkpoints = await this.getAllCheckpoints();
    const checkpoint = checkpoints[id];

    if (!checkpoint) {
      return null;
    }

    // Check if checkpoint has expired
    if (this.isExpired(checkpoint)) {
      console.warn(`⚠️ Checkpoint ${id} has expired`);
      await this.delete(id);
      return null;
    }

    return checkpoint as CheckpointData<T>;
  }

  /**
   * Delete a checkpoint
   */
  async delete(id: string): Promise<void> {
    const checkpoints = await this.getAllCheckpoints();
    delete checkpoints[id];

    await chrome.storage.local.set({
      [this.storageKey]: checkpoints,
    });

    console.log(`🗑️ Checkpoint deleted: ${id}`);
  }

  /**
   * Mark a checkpoint as completed
   */
  async complete(id: string): Promise<void> {
    const checkpoint = await this.load(id);

    if (!checkpoint) {
      console.warn(`⚠️ Checkpoint ${id} not found`);
      return;
    }

    await this.save({
      ...checkpoint,
      completed: true,
      progress: 100,
    });

    console.log(`✅ Checkpoint completed: ${id}`);
  }

  /**
   * Update checkpoint progress
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateProgress(id: string, progress: number, state?: any): Promise<void> {
    const checkpoint = await this.load(id);

    if (!checkpoint) {
      console.warn(`⚠️ Checkpoint ${id} not found`);
      return;
    }

    await this.save({
      ...checkpoint,
      progress: Math.min(100, Math.max(0, progress)),
      state: state ?? checkpoint.state,
    });
  }

  /**
   * Record an error in the checkpoint
   */
  async recordError(id: string, error: Error): Promise<void> {
    const checkpoint = await this.load(id);

    if (!checkpoint) {
      console.warn(`⚠️ Checkpoint ${id} not found`);
      return;
    }

    await this.save({
      ...checkpoint,
      error: error.message,
    });

    console.error(`❌ Checkpoint error: ${id} - ${error.message}`);
  }

  /**
   * Get all checkpoints for an operation type
   */
  async getByOperation(operation: string): Promise<CheckpointData[]> {
    const checkpoints = await this.getAllCheckpoints();

    return Object.values(checkpoints).filter(
      (cp) => cp.operation === operation && !this.isExpired(cp)
    );
  }

  /**
   * Get all incomplete checkpoints
   */
  async getIncomplete(): Promise<CheckpointData[]> {
    const checkpoints = await this.getAllCheckpoints();

    return Object.values(checkpoints).filter((cp) => !cp.completed && !this.isExpired(cp));
  }

  /**
   * Clean up expired checkpoints
   */
  async cleanupExpired(): Promise<number> {
    const checkpoints = await this.getAllCheckpoints();
    let cleanedCount = 0;

    for (const [id, checkpoint] of Object.entries(checkpoints)) {
      if (this.isExpired(checkpoint)) {
        delete checkpoints[id];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await chrome.storage.local.set({
        [this.storageKey]: checkpoints,
      });
      console.log(`🧹 Cleaned up ${cleanedCount} expired checkpoints`);
    }

    return cleanedCount;
  }

  /**
   * Clear all checkpoints
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.remove(this.storageKey);
    console.log('🗑️ All checkpoints cleared');
  }

  /**
   * Get all checkpoints from storage
   */
  private async getAllCheckpoints(): Promise<Record<string, CheckpointData>> {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey] || {};
  }

  /**
   * Check if a checkpoint has expired
   */
  private isExpired(checkpoint: CheckpointData): boolean {
    return Date.now() - checkpoint.timestamp > this.ttl;
  }
}

/**
 * Helper function to execute an operation with automatic checkpointing
 * Supports batch processing with progress tracking
 *
 * @example
 * ```typescript
 * const results = await executeWithCheckpoint(
 *   'batch-categorize-tabs',
 *   tabs,
 *   async (batch, checkpoint) => {
 *     const result = await categorizeTabs(batch);
 *     await checkpoint.updateProgress(
 *       'batch-categorize',
 *       (processedCount / totalCount) * 100
 *     );
 *     return result;
 *   },
 *   { batchSize: 10 }
 * );
 * ```
 */
export async function executeWithCheckpoint<T, R>(
  operationId: string,
  items: T[],
  processFn: (batch: T[], checkpoint: StateCheckpoint) => Promise<R>,
  options: {
    batchSize?: number;
    checkpoint?: StateCheckpoint;
    resumable?: boolean;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, resumable = true } = options;
  const checkpoint = options.checkpoint || new StateCheckpoint();

  // Check for existing checkpoint
  let startIndex = 0;
  let previousResults: R[] = [];

  if (resumable) {
    const existing = await checkpoint.load<{ processedIndex: number; results: R[] }>(operationId);

    if (existing && !existing.completed) {
      startIndex = existing.state.processedIndex;
      previousResults = existing.state.results || [];
      console.log(`🔄 Resuming from checkpoint: ${operationId} (${startIndex}/${items.length})`);
    }
  }

  const results: R[] = [...previousResults];

  try {
    for (let i = startIndex; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));

      // Process batch
      const batchResult = await processFn(batch, checkpoint);
      results.push(batchResult);

      // Update checkpoint
      const progress = ((i + batch.length) / items.length) * 100;
      await checkpoint.save({
        id: operationId,
        operation: 'batch-processing',
        state: {
          processedIndex: i + batch.length,
          results,
        },
        completed: false,
        progress,
      });

      console.log(`📊 Progress: ${Math.round(progress)}% (${i + batch.length}/${items.length})`);
    }

    // Mark as completed
    await checkpoint.complete(operationId);

    return results;
  } catch (error) {
    // Record error in checkpoint
    await checkpoint.recordError(operationId, error as Error);
    throw error;
  }
}

/**
 * Default checkpoint instance for simple use cases
 */
export const defaultCheckpoint = new StateCheckpoint();

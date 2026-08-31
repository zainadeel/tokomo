import { existsSync, renameSync, rmSync } from 'node:fs';

export function removePath(target) {
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

/**
 * Replace files/directories as one best-effort transaction.
 *
 * Existing targets stay in adjacent backups until every staged replacement has
 * moved successfully. Any failure attempts every rollback step and reports all
 * recovery errors instead of stopping after the first one.
 */
export function replaceTransactionally(
  replacements,
  {
    nonce = `${process.pid}-${Date.now()}`,
    onCleanupError = (target, error) =>
      console.warn(`Could not remove completed-build backup ${target}: ${error.message}`),
  } = {},
) {
  const committed = [];

  try {
    for (const replacement of replacements) {
      const backup = `${replacement.target}.backup-${nonce}`;
      const hadTarget = existsSync(replacement.target);
      if (hadTarget) renameSync(replacement.target, backup);

      try {
        renameSync(replacement.staged, replacement.target);
      } catch (replacementError) {
        const recoveryErrors = [];
        if (hadTarget) {
          try {
            renameSync(backup, replacement.target);
          } catch (error) {
            recoveryErrors.push(error);
          }
        }
        if (recoveryErrors.length) {
          throw new AggregateError(
            [replacementError, ...recoveryErrors],
            `Failed to replace ${replacement.target} and restore its backup`,
          );
        }
        throw replacementError;
      }

      committed.push({ ...replacement, backup, hadTarget });
    }
  } catch (replacementError) {
    const recoveryErrors = [];
    for (const replacement of committed.reverse()) {
      try {
        removePath(replacement.target);
      } catch (error) {
        recoveryErrors.push(error);
        continue;
      }
      if (replacement.hadTarget) {
        try {
          renameSync(replacement.backup, replacement.target);
        } catch (error) {
          recoveryErrors.push(error);
        }
      }
    }

    if (recoveryErrors.length) {
      throw new AggregateError(
        [replacementError, ...recoveryErrors],
        'Build replacement failed and one or more rollback steps also failed',
      );
    }
    throw replacementError;
  }

  for (const replacement of committed) {
    if (!replacement.hadTarget) continue;
    try {
      removePath(replacement.backup);
    } catch (error) {
      onCleanupError(replacement.backup, error);
    }
  }
}

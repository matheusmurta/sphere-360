export class StorageError extends Error {
  constructor(
    message: string,
    public readonly kind: 'quota' | 'unknown',
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; inner?: { name?: string }; message?: string }
  return (
    e.name === 'QuotaExceededError' ||
    e.inner?.name === 'QuotaExceededError' ||
    /quota/i.test(e.message ?? '')
  )
}

export function toStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err
  if (isQuotaError(err)) {
    return new StorageError(
      'Espaço de armazenamento insuficiente. Exclua algumas fotos ou libere espaço no dispositivo.',
      'quota',
    )
  }
  return new StorageError('Falha ao acessar o armazenamento local.', 'unknown')
}

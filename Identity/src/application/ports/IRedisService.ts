export interface IRedisService {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, ttlSeconds: number) => Promise<void>
  delete: (key: string) => Promise<void>
  isConnected: () => boolean
  close: () => Promise<void>
}

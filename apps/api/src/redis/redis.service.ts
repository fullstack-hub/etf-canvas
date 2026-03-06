import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    const sentinels = process.env.REDIS_SENTINELS;
    if (sentinels) {
      this.client = new Redis({
        sentinels: sentinels.split(',').map((s) => {
          const [host, port] = s.split(':');
          return { host, port: Number(port) };
        }),
        name: process.env.REDIS_MASTER_NAME || 'mymaster',
        password: process.env.REDIS_PASSWORD || undefined,
        sentinelPassword: process.env.REDIS_PASSWORD || undefined,
      });
    } else {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      });
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}

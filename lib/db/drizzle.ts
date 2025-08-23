// @/lib/db/drizzle.ts
// 连接数据库并提供全局客户端与 ORM 的 API
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres'; 

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

type DrizzleDbWithSchema = PostgresJsDatabase<typeof schema> & { $client: Sql<{}> };

declare global {
  var cachedClient: postgres.Sql | undefined;
  var cachedDb: DrizzleDbWithSchema | undefined;
}

let clientInstance: postgres.Sql;
let database: DrizzleDbWithSchema;

if (process.env.NODE_ENV === 'production') {
  clientInstance = postgres(process.env.POSTGRES_URL);
  // 在生产环境，直接创建并强制类型转换为精确类型
  database = drizzle(clientInstance, { schema }) as DrizzleDbWithSchema;
} else {
  // 避免开发模式重复加载
  if (!global.cachedClient) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL environment variable is not set');
    }
    global.cachedClient = postgres(process.env.POSTGRES_URL);
  }
  clientInstance = global.cachedClient;

  if (!global.cachedDb) {
    global.cachedDb = drizzle(clientInstance, { schema }) as DrizzleDbWithSchema;
  }
  database = global.cachedDb;
}

export const client = clientInstance;
export const db = database;
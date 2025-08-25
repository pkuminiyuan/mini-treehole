// @/lib/db/clear.ts
import { db } from './drizzle';
import { sql } from 'drizzle-orm';
import * as readline from 'readline';

// 简化版确认
export async function clearDatabase() {
    console.log('--- Starting database clearing process ---');
    console.warn('!!! WARNING: This will permanently delete ALL data in the public schema !!!');
    console.warn('!!!          Ensure you are running this on a DEVELOPMENT database      !!!');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const answer = await new Promise<string>((resolve) => {
            rl.question('\n🚨 确认清空数据库？(y/n): ', resolve);
        });

        if (answer.trim().toLowerCase() !== 'y') {
            console.log('❌ 操作已取消。');
            rl.close();
            return;
        }

        // 执行清空操作...
        await db.execute(sql.raw(`DROP SCHEMA public CASCADE;`));
        await db.execute(sql.raw(`CREATE SCHEMA public;`));
        await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`));

        console.log('🎉 数据库清空完成！');

    } catch (error) {
        console.error('❌ 清空数据库失败:', error);
        throw error;
    } finally {
        rl.close();
    }
}

// 允许该脚本作为独立可执行文件运行
if (require.main === module) {
    clearDatabase()
        .then(() => {
            console.log('✅ Database clear script finished.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Database clear script failed:', err);
            process.exit(1);
        });
}
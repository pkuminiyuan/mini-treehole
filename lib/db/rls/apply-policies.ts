// @/lib/db/rls/apply-policies.ts
import { db } from '../drizzle';
import { sql } from 'drizzle-orm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function applyRlsPolicies() {
    console.log('--- Applying RLS policies ---');
    try {
        const policiesSql = await fs.readFile(
            path.join(process.cwd(), 'lib', 'db', 'rls', 'rls-policies.sql'),
            'utf8'
        );

        // IMPORTANT: For local development and testing, you might want to set session variables
        // to simulate a logged-in user before applying policies, especially if the policies
        // rely on current_setting('request.jwt.claims') or custom 'app.user_id' etc.
        // However, the policies themselves are set by the DB admin role, which doesn't
        // need a user context for policy *creation*.
        // The functions created in the SQL will then use these session variables when
        // a regular user performs DML operations (SELECT, INSERT, UPDATE, DELETE).

        await db.execute(sql.raw(policiesSql));
        console.log('RLS policies applied successfully.');
    } catch (error) {
        console.error('RLS application script failed:', error);
        throw error;
    } finally {
        // If your 'db' client needs explicit termination
        // if (typeof db.end === 'function') {
        //   await db.end();
        // }
    }
}

if (require.main === module) {
    applyRlsPolicies()
        .then(() => {
            console.log('RLS application script finished.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('RLS application script failed with error:', err);
            process.exit(1);
        });
}
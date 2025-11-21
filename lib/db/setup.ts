// @/lib/db/setup.ts
// 用于自动初始化 database 的脚本
import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';

const execAsync = promisify(exec);

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function getPostgresURL(): Promise<string> {
  console.log('Step 2: Setting up Postgres');
  const dbChoice = await question(
    'Do you want to use a local Postgres instance with Docker (L) or a remote Postgres instance (R)? (L/R): '
  );

  if (dbChoice.toLowerCase() === 'l') {
    console.log('Setting up local Postgres instance with Docker...');
    await setupLocalPostgres();
    return 'postgres://postgres:postgres@localhost:54322/postgres'; // 本地 Docker 数据库 URL
  } else {
    console.log(
      'You can find Postgres databases at: https://vercel.com/marketplace?category=databases'
    );
    // 即使是远程数据库，也提示用户输入，用户应该输入Supabase的连接字符串
    return await question('Enter your POSTGRES_URL (e.g., your Supabase connection string): ');
  }
}

async function setupLocalPostgres() {
  console.log('Checking if Docker is installed...');
  try {
    await execAsync('docker --version');
    console.log('Docker is installed.');
  } catch (error) {
    console.error(
      'Docker is not installed. Please install Docker and try again.'
    );
    console.log(
      'To install Docker, visit: https://docs.docker.com/get-docker/'
    );
    process.exit(1);
  }

  console.log('Creating docker-compose.yml file...');
  const dockerComposeContent = `
services:
  postgres:
    image: postgres:16.4-alpine
    container_name: next_saas_starter_postgres
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "54322:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;

  await fs.writeFile(
    path.join(process.cwd(), 'docker-compose.yml'),
    dockerComposeContent
  );
  console.log('docker-compose.yml file created.');

  console.log('Starting Docker container with `docker compose up -d`...');
  try {
    await execAsync('docker compose up -d');
    console.log('Docker container started successfully.');
  } catch (error) {
    console.error(
      'Failed to start Docker container. Please check your Docker installation and try again.'
    );
    process.exit(1);
  }
}

function generateAuthSecret(): string {
  console.log('Step 5: Generating AUTH_SECRET...');
  return crypto.randomBytes(32).toString('hex');
}

async function getSupabaseEnvVars(): Promise<Record<string, string>> {
  console.log('\nStep 3: Setting up Supabase (required for authentication)');
  console.log('Please go to your Supabase project dashboard:');
  console.log('  - Project URL: Settings -> API -> Project URL');
  console.log('  - Anon Key:    Settings -> API -> Project API keys -> anon public');
  console.log('  - Service Role Key: Settings -> API -> Project API keys -> service_role');

  const supabaseUrl = await question('Enter your NEXT_PUBLIC_SUPABASE_URL: ');
  const supabaseAnonKey = await question('Enter your NEXT_PUBLIC_SUPABASE_ANON_KEY: ');
  const supabaseServiceRoleKey = await question('Enter your SUPABASE_SERVICE_ROLE_KEY: ');

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
  };
}

async function writeEnvFile(envVars: Record<string, string>) {
  console.log('Step 6: Writing environment variables to .env'); // 更新步骤号
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  await fs.writeFile(path.join(process.cwd(), '.env'), envContent);
  console.log('.env file created with the necessary variables.');
}

async function main() {
  const POSTGRES_URL = await getPostgresURL(); // Step 2
  const supabaseEnvVars = await getSupabaseEnvVars(); // Step 3
  const BASE_URL = 'http://localhost:3000'; // Step 4
  const AUTH_SECRET = generateAuthSecret(); // Step 5

  await writeEnvFile({
    POSTGRES_URL,
    BASE_URL,
    AUTH_SECRET,
    ...supabaseEnvVars,
  });

  console.log('\n🎉 Setup completed successfully!');
  console.log('--------------------------------------------------------------------------');
  console.log('Next steps:');
  console.log('1. Generate database migrations: `pnpm db:generate`');
  console.log('2. Apply database migrations:    `pnpm db:migrate`');
  console.log('3. Apply RLS policies:           `pnpm db:apply-rls`');
  console.log('4. Seed initial data (optional): `pnpm db:seed`');
  console.log('5. Start your application:       `pnpm dev`');
  console.log('--------------------------------------------------------------------------');
  console.log('Remember to add these variables to your Vercel project environment variables for deployment:');
  console.log('- POSTGRES_URL');
  console.log('- AUTH_SECRET');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
}

main().catch(console.error);
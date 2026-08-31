/**
 * Creates the first administrator.
 *
 * Run over SSH on the server:
 *   npm run admin:create -- --email steven@example.com --name "Steven Imes III"
 *
 * The password is prompted rather than passed as an argument so it does not
 * land in shell history or the process list.
 */
import { createInterface } from 'node:readline';
import { stdin, stdout, argv, exit } from 'node:process';
import bcrypt from 'bcryptjs';
import { db } from '../src/libs/db';

function arg(flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const email = arg('--email');
  const name = arg('--name');

  if (!email || !name) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<name>"');
    exit(1);
  }

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.error(`An administrator already exists for ${email}. Refusing to overwrite.`);
    exit(1);
  }

  const password = await prompt('Password (min 8 characters): ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    exit(1);
  }

  const confirm = await prompt('Confirm password: ');
  if (confirm !== password) {
    console.error('Passwords do not match.');
    exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await db.adminUser.create({ data: { email, name, passwordHash } });

  console.log(`Created administrator ${admin.email} (${admin.id})`);
  await db.$disconnect();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await db.$disconnect();
  exit(1);
});

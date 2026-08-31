/**
 * Creates the first administrator.
 *
 * Locally:
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * On the server, against the running container:
 *   docker compose exec api node dist/scripts/create-admin.js  *     --email steven@example.com --name "Steven Imes III"
 *
 * It lives under src/ rather than a top-level scripts/ directory so that it is
 * compiled into dist/ by the ordinary build and ships inside the runtime image.
 * The image installs production dependencies only and never copied a top-level
 * scripts/ folder, so tsx and the original file were both absent from it and
 * `npm run admin:create` could not run there at all.
 *
 * The password is prompted rather than passed as an argument so it does not
 * land in shell history or the process list.
 */
import { createInterface } from 'node:readline';
import { stdin, stdout, argv, exit } from 'node:process';
import bcrypt from 'bcryptjs';
import { db } from '../libs/db';

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
    console.error('Usage: --email <email> --name "<name>"');
    console.error('  local:  npm run admin:create -- --email you@example.com --name "Your Name"');
    console.error('  server: docker compose exec api node dist/scripts/create-admin.js --email you@example.com --name "Your Name"');
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

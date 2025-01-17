import { execSync } from 'child_process';
import fetch from 'cross-fetch';
import { getAppName, isObject, timeout } from '../shared';

async function main() {
  let error;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not set');

  const accountDomain = process.env.CLOUDFLARE_ACCOUNT_DOMAIN;
  if (!accountDomain) throw new Error('CLOUDFLARE_ACCOUNT_DOMAIN is not set');

  const accountApiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountApiToken) throw new Error('CLOUDFLARE_API_TOKEN is not set');

  const appName = getAppName('cf-workers');
  const deploymentUrl = `https://${appName}.${accountDomain}.workers.dev`;

  // Install client
  execSync(`npm install @xata.io/client@${process.env.VERSION_TAG} --no-save`, { cwd: __dirname });

  try {
    // Publish the app to CF
    execSync(`npx wrangler publish test.ts --name ${appName}`, { cwd: __dirname });

    // Add secrets
    execSync(`npx wrangler secret --name ${appName} put XATA_API_KEY`, {
      input: Buffer.from(process.env.XATA_API_KEY ?? '')
    });
    execSync(`npx wrangler secret --name ${appName} put XATA_WORKSPACE`, {
      input: Buffer.from(process.env.XATA_WORKSPACE ?? '')
    });

    console.log(`App published in CF, running at: ${deploymentUrl}`);

    await timeout(5000);

    const response = await fetch(deploymentUrl);
    const body = await response.json();

    if (
      isObject(body) &&
      Array.isArray(body.users) &&
      Array.isArray(body.teams) &&
      body.users.length > 0 &&
      body.teams.length > 0
    ) {
      console.log('Successfully fetched data from CF');
    } else {
      throw new Error('Failed to fetch data from CF');
    }
  } catch (e) {
    error = e;
  }

  await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${appName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accountApiToken}` }
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }
}

main();

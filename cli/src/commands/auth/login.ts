import prompts from 'prompts';
import { BaseCommand } from '../../base.js';
import { getProfile, setProfile } from '../../credentials.js';

export default class Login extends BaseCommand {
  static description = 'Authenticate with Xata';

  static examples = [];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    const existingProfile = await getProfile(true);
    if (existingProfile) {
      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: 'Authentication is already configured, do you want to overwrite it?'
      });
      if (!overwrite) this.exit(2);
    }

    const key = await this.obtainKey();

    await this.verifyAPIKey(key);

    await setProfile({ apiKey: key });

    this.log('All set! you can now start using xata');
  }
}

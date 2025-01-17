import prompts from 'prompts';
import { BaseCommand } from '../../base.js';
import { getProfile, removeProfile } from '../../credentials.js';

export default class Logout extends BaseCommand {
  static description = 'Logout from Xata';

  static examples = [];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    const existingProfile = await getProfile(true);
    if (!existingProfile) {
      return this.error('You are not logged in');
    }
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to logout of Xata?'
    });
    if (!confirm) this.exit(2);

    await removeProfile();

    this.log('Logged out correctly');
  }
}

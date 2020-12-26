import * as core from '@actions/core';
import Launcher from './base/Launcher';

(async function main(): Promise<void> {
	const cacheKey = core.getInput('cache-key') || 'wechat-devtools';
	try {
		const launcher = new Launcher(cacheKey);

		core.info('Preparing user data directory....');
		await launcher.prepare();

		const anonymous = await launcher.isAnonymous();
		if (anonymous) {
			core.info('Start login request. A QR Code will be send to your email address.');
			await launcher.login();
		}
	} catch (error) {
		core.setFailed(error);
	}
}());

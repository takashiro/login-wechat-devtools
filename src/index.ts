import * as core from '@actions/core';
import DevToolFactory from './base/DevToolFactory';

(async function main(): Promise<void> {
	const launcher = DevToolFactory.getInstance();
	if (!launcher) {
		core.setFailed('The operating system is not supported yet.');
		return;
	}

	try {
		core.info('Preparing user data directory...');
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

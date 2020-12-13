import * as os from 'os';
import * as path from 'path';
import * as exec from 'execa';
import * as core from '@actions/core';
import DevTool, { devToolMap } from './DevTool';

import email from '../util/email';
import exist from '../util/exist';

async function sendLoginCode(qrcode: string): Promise<void> {
	await exist(qrcode);

	const workflow = process.env.GITHUB_WORKFLOW;
	const actor = process.env.GITHUB_ACTOR;
	const repository = process.env.GITHUB_REPOSITORY;
	const sha = process.env.GITHUB_SHA;

	await email({
		subject: `[${repository}] Login Request: ${workflow}`,
		html: `<p>Author: ${actor}</p><p>Commit: ${sha}</p><p><img src="cid:login-qrcode" /></p>`,
		attachments: [
			{
				filename: 'login-qrcode.png',
				path: qrcode,
				cid: 'login-qrcode',
			},
		],
	});
}

export default class Launcher {
	protected readonly tool: DevTool;

	protected readonly cliName: string;

	constructor() {
		const dev = devToolMap[os.platform()];
		if (!dev) {
			throw new Error('Failed to locate CLI of WeChat Developer Tools.');
		}
		this.tool = dev;
		this.cliName = core.getInput('cli') || 'wxdev';
	}

	async prepare(): Promise<void> {
		await exec(this.tool.gui, ['--disable-gpu', '--enable-service-port'], {
			cwd: this.tool.installDir,
			stdio: 'inherit',
		});
		await this.tool.allowCli();
	}

	async login(): Promise<void> {
		const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
		await Promise.all([
			this.cli('login', '-f', 'image', '-o', loginQrCode),
			sendLoginCode(loginQrCode),
		]);
	}

	cli(...args: string[]): exec.ExecaChildProcess<string> {
		return exec(this.cliName, args, {
			shell: true,
			stdio: 'inherit',
		});
	}
}

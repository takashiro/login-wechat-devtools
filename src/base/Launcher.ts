import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as exec from 'execa';
import * as util from 'util';
import * as sncp from 'ncp';
import * as cache from '@actions/cache';

import DevTool, { devToolMap } from './DevTool';

import email from '../util/email';
import exist from '../util/exist';
import idle from '../util/idle';

const readdir = util.promisify(fs.readdir);
const rename = util.promisify(fs.rename);
const ncp = util.promisify(sncp);

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

	constructor() {
		const dev = devToolMap[os.platform()];
		if (!dev) {
			throw new Error('Failed to locate CLI of WeChat Developer Tools.');
		}
		this.tool = dev;
	}

	async prepare(): Promise<void> {
		if (!fs.existsSync(this.tool.installDir)) {
			throw new Error(`Install location is not found at ${this.tool.installDir}`);
		}

		const guiApp = path.join(this.tool.installDir, this.tool.gui);
		if (!fs.existsSync(guiApp)) {
			throw new Error(`GUI app is not found at ${guiApp}`);
		}

		const restored = await this.restoreUserData();
		if (restored) {
			await this.allowCli();
		} else {
			const cmd = os.platform() === 'win32' ? this.tool.gui : `./${this.tool.gui}`;
			await Promise.all([
				exec(cmd, ['--disable-gpu', '--enable-service-port'], {
					cwd: this.tool.installDir,
					shell: true,
					stdio: 'inherit',
				}),
				this.allowCli(),
			]);
		}
	}

	async login(): Promise<void> {
		const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
		await Promise.all([
			this.cli('login', '-f', 'image', '-o', loginQrCode),
			sendLoginCode(loginQrCode),
		]);

		await this.cli('quit');
		await idle(os.platform() === 'win32' ? 10000 : 3000);

		await this.saveUserData();
	}

	cli(...args: string[]): exec.ExecaChildProcess<string> {
		return exec(this.getCommand(), args, {
			cwd: this.tool.installDir,
			shell: true,
			stdio: 'inherit',
		});
	}

	getCommand(): string {
		return os.platform() === 'win32' ? this.tool.cli : `./${this.tool.cli}`;
	}

	async allowCli(): Promise<void> {
		const toolDir = path.join(os.homedir(), this.tool.dataDir);
		await exist(toolDir);

		const userDataDir = os.platform() === 'win32' ? path.join(toolDir, 'User Data') : toolDir;
		await exist(userDataDir);

		const userDirs = await readdir(userDataDir);
		let found = false;
		for (const userDir of userDirs) {
			if (userDir.length !== 32 || userDir.startsWith('.')) {
				continue;
			}

			found = true;
			const markFiles = ['.ide', '.ide-status'];
			await Promise.all(markFiles.map((markFile) => exist(
				path.join(userDataDir, userDir, 'Default', markFile),
			)));
		}

		if (!found) {
			throw new Error('No user data directory is found.');
		}
	}

	async isAnonymous(): Promise<boolean> {
		const str = await exec(this.getCommand(), [
			'cloud', 'functions', 'list',
			'--env', 'test-123',
			'--appid', 'wx1111111111111',
		], {
			cwd: this.tool.installDir,
			shell: true,
		});
		return str.stdout.includes('Login is required');
	}

	async saveUserData(): Promise<void> {
		await ncp(this.getDataDir(), 'UserData');
		await cache.saveCache(['UserData'], `wechat-devtools-${os.platform()}`);
	}

	async restoreUserData(): Promise<boolean> {
		const cacheKey = await cache.restoreCache(['UserData'], `wechat-devtools-${os.platform()}`);
		if (cacheKey && fs.existsSync('UserData')) {
			await rename('UserData', this.getDataDir());
			return true;
		}
		return false;
	}

	getDataDir(): string {
		return path.join(os.homedir(), this.tool.dataDir);
	}
}

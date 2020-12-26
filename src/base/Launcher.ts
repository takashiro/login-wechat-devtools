import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as exec from 'execa';
import * as util from 'util';
import * as smv from 'mv';
import * as sncp from 'ncp';
import * as cache from '@actions/cache';

import DevTool, { devToolMap } from './DevTool';
import CodeMailer from './CodeMailer';

import exist from '../util/exist';
import idle from '../util/idle';

const readdir = util.promisify(fs.readdir);
const mv = util.promisify(smv);
const ncp = util.promisify(sncp);

function sh(cmd: string): string {
	return os.platform() === 'win32' ? cmd : `./${cmd}`;
}

export default class Launcher {
	protected readonly tool: DevTool;

	constructor() {
		const dev = devToolMap[os.platform()];
		if (!dev) {
			throw new Error('The operating system is not supported.');
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
			await Promise.all([
				exec(sh(this.tool.gui), ['--disable-gpu', '--enable-service-port'], {
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
		const mailer = new CodeMailer(loginQrCode);
		const [login] = await Promise.all([
			this.cli('login', '-f', 'image', '-o', loginQrCode),
			mailer.send(),
		]);

		await this.cli('quit');

		if (login.exitCode !== 0) {
			throw new Error('Login failed.');
		}

		await idle(os.platform() === 'win32' ? 10000 : 3000);
		await this.saveUserData();
	}

	cli(...args: string[]): exec.ExecaChildProcess<string> {
		return exec(sh(this.tool.cli), args, {
			cwd: this.tool.installDir,
			shell: true,
			stdio: 'inherit',
		});
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
		const str = await exec(sh(this.tool.cli), [
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
			await mv('UserData', this.getDataDir());
			return true;
		}
		return false;
	}

	getDataDir(): string {
		return path.join(os.homedir(), this.tool.dataDir);
	}
}

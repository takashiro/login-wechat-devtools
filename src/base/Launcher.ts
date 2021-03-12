import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as exec from 'execa';
import * as util from 'util';
import * as smv from 'mv';
import * as sncp from 'ncp';
import * as core from '@actions/core';
import * as cache from '@actions/cache';

import DevTool, { devToolMap } from './DevTool';
import CodeMailer from './CodeMailer';

import exist from '../util/exist';
import idle from '../util/idle';
import md5 from '../util/md5';

const mv = util.promisify(smv);
const ncp = util.promisify(sncp);
const symlink = util.promisify(fs.symlink);

function sh(cmd: string): string {
	return os.platform() === 'win32' ? cmd : `./${cmd}`;
}

export default class Launcher {
	protected readonly tool: DevTool;

	protected readonly cacheKey: string;

	protected readonly cacheIgnoreErrors: boolean;

	constructor() {
		const dev = devToolMap[os.platform()];
		if (!dev) {
			throw new Error('The operating system is not supported.');
		}
		this.tool = dev;
		this.cacheKey = `${core.getInput('cache-key') || 'wechat-devtools'}-${os.platform()}`;
		this.cacheIgnoreErrors = core.getInput('cache-ignore-errors') === 'true';
	}

	async prepare(): Promise<void> {
		if (!fs.existsSync(this.tool.installDir)) {
			throw new Error(`Install location is not found at ${this.tool.installDir}`);
		}

		const guiApp = path.join(this.tool.installDir, this.tool.gui);
		if (!fs.existsSync(guiApp)) {
			throw new Error(`GUI app is not found at ${guiApp}`);
		}

		await this.restoreUserData();
		await Promise.all([
			this.launchGui(),
			this.allowCli(),
		]);

		await idle(this.tool.launchDelay);
	}

	async launchGui(): Promise<void> {
		await exec(sh(this.tool.gui), ['--disable-gpu', '--enable-service-port'], {
			cwd: this.tool.installDir,
			shell: true,
			stdio: 'inherit',
		});
	}

	async login(): Promise<void> {
		const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
		const mailer = new CodeMailer(loginQrCode);
		const [login] = await Promise.all([
			this.cli('login', '-f', 'image', '-o', loginQrCode),
			mailer.send(),
		]);

		if (login.exitCode !== 0 || await this.isAnonymous()) {
			throw new Error('Login failed.');
		}

		await idle(this.tool.logoutDelay);
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
		const dataDir = this.getDataDir();
		await exist(dataDir);

		const userDataDir = path.join(dataDir, this.tool.userDataDir);
		await exist(userDataDir);

		const userDir = path.join(userDataDir, md5(this.tool.installDir));
		if (!fs.existsSync(userDir)) {
			throw new Error('No user data directory is found.');
		}

		const markFiles = ['.ide', '.ide-status'];
		await Promise.all(markFiles.map((markFile) => exist(
			path.join(userDir, 'Default', markFile),
		)));

		// Hack for an issue on OS X
		if (os.platform() === 'darwin') {
			const from = path.join(userDataDir, 'f1fed8de4c2182d92f6729442499eb45');
			if (from) {
				await exec('rm', ['-rf', from]);
			}
			await symlink(userDir, from);
			await exec('sudo', ['ln', '-s', this.tool.installDir, '/Applications']);
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
		if (this.cacheIgnoreErrors) {
			try {
				await cache.saveCache(['UserData'], this.cacheKey);
			} catch (error) {
				core.error(error);
			}
		} else {
			await cache.saveCache(['UserData'], this.cacheKey);
		}
	}

	async restoreUserData(): Promise<boolean> {
		let cacheKey: string | undefined;
		if (this.cacheIgnoreErrors) {
			try {
				cacheKey = await cache.restoreCache(['UserData'], this.cacheKey);
			} catch (error) {
				core.error(error);
			}
		} else {
			cacheKey = await cache.restoreCache(['UserData'], this.cacheKey);
		}
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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as exec from 'execa';
import * as util from 'util';
import * as smv from 'mv';
import * as sncp from 'ncp';
import * as core from '@actions/core';
import * as cache from '@actions/cache';

import CodeMailer from './CodeMailer';

import exist from '../util/exist';
import idle from '../util/idle';
import md5 from '../util/md5';

const mv = util.promisify(smv);
const ncp = util.promisify(sncp);
const symlink = util.promisify(fs.symlink);

interface DevToolConfig {
	cli: string;
	gui: string;
	installDir: string;
	dataDir: string;
	userDataDir: string;
	launchDelay: number;
	actionDelay: number;
}

export default class DevTool {
	protected cliPath: string;

	protected guiPath: string;

	protected installDir: string;

	protected dataDir: string;

	protected userDataDir: string;

	protected launchDelay: number;

	protected actionDelay: number;

	protected readonly cacheKey: string;

	protected readonly cacheIgnoreErrors: boolean;

	constructor(config: DevToolConfig) {
		this.installDir = config.installDir;
		this.cliPath = path.join(this.installDir, config.cli);
		this.guiPath = path.join(this.installDir, config.gui);
		this.dataDir = path.join(os.homedir(), config.dataDir);
		this.userDataDir = path.join(this.dataDir, config.userDataDir);
		this.launchDelay = config.launchDelay;
		this.actionDelay = config.actionDelay;

		this.cacheKey = `${core.getInput('cache-key') || 'wechat-devtools'}-${os.platform()}`;
		this.cacheIgnoreErrors = core.getInput('cache-ignore-errors') === 'true';
	}

	getInstallDir(): string {
		return this.installDir;
	}

	getCliPath(): string {
		return this.cliPath;
	}

	getGuiPath(): string {
		return this.guiPath;
	}

	getDataDir(): string {
		return this.dataDir;
	}

	getUserDataDir(): string {
		return this.userDataDir;
	}

	async prepare(): Promise<void> {
		const installDir = this.getInstallDir();
		if (!fs.existsSync(installDir)) {
			throw new Error(`Install location is not found at ${installDir}`);
		}

		const guiPath = this.getGuiPath();
		if (!fs.existsSync(guiPath)) {
			throw new Error(`GUI app is not found at ${guiPath}`);
		}

		await this.restoreUserData();
		await Promise.all([
			this.launchGui(),
			this.allowCli(),
		]);

		await idle(this.launchDelay);
	}

	async login(): Promise<void> {
		const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
		const mailer = new CodeMailer(loginQrCode);
		const [login] = await Promise.all([
			this.cli('login', '-f', 'image', '-o', loginQrCode),
			mailer.send(),
		]);
		await idle(this.actionDelay);

		if (login.exitCode !== 0 || await this.isAnonymous()) {
			throw new Error('Login failed.');
		}

		await this.cli('quit');
		await idle(this.actionDelay);

		await this.saveUserData();
	}

	async launchGui(): Promise<void> {
		const gui = this.getGuiPath();
		await exec(gui, ['--disable-gpu', '--enable-service-port'], {
			cwd: this.getInstallDir(),
			stdio: 'inherit',
		});
	}

	cli(...args: string[]): exec.ExecaChildProcess<string> {
		const cli = this.getCliPath();
		return exec(cli, args, {
			cwd: this.getInstallDir(),
		});
	}

	async allowCli(): Promise<void> {
		const dataDir = this.getDataDir();
		await exist(dataDir);

		const userDataDir = this.getUserDataDir();
		await exist(userDataDir);

		const userDir = path.join(userDataDir, md5(this.getInstallDir()));
		if (!fs.existsSync(userDir)) {
			throw new Error('No user data directory is found.');
		}

		const markFiles = ['.ide', '.ide-status'];
		await Promise.all(markFiles.map((markFile) => exist(
			path.join(userDir, 'Default', markFile),
		)));

		// Fix incorrect install path on OS X
		if (os.platform() === 'darwin') {
			const from = path.join(userDataDir, 'f1fed8de4c2182d92f6729442499eb45');
			if (from) {
				await exec('rm', ['-rf', from]);
			}
			await symlink(userDir, from);
			await exec('sudo', ['ln', '-s', this.getInstallDir(), '/Applications']);
		}
	}

	async isAnonymous(): Promise<boolean> {
		const str = await this.cli(
			'cloud', 'functions', 'list',
			'--env', 'test-123',
			'--appid', 'wx1111111111111',
		);
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
}

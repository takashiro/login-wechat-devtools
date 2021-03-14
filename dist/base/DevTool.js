"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const exec = require("execa");
const util = require("util");
const smv = require("mv");
const sncp = require("ncp");
const core = require("@actions/core");
const cache = require("@actions/cache");
const CodeMailer_1 = require("./CodeMailer");
const exist_1 = require("../util/exist");
const idle_1 = require("../util/idle");
const md5_1 = require("../util/md5");
const mv = util.promisify(smv);
const ncp = util.promisify(sncp);
const symlink = util.promisify(fs.symlink);
class DevTool {
    constructor(config) {
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
    getInstallDir() {
        return this.installDir;
    }
    getCliPath() {
        return this.cliPath;
    }
    getGuiPath() {
        return this.guiPath;
    }
    getDataDir() {
        return this.dataDir;
    }
    getUserDataDir() {
        return this.userDataDir;
    }
    async prepare() {
        const installDir = this.getInstallDir();
        if (!fs.existsSync(installDir)) {
            throw new Error(`Install location is not found at ${installDir}`);
        }
        const guiPath = this.getGuiPath();
        if (!fs.existsSync(guiPath)) {
            throw new Error(`GUI app is not found at ${guiPath}`);
        }
        await this.restoreUserData();
        await this.launch();
    }
    async launch() {
        await Promise.all([
            this.launchGui(),
            this.allowCli(),
        ]);
        await idle_1.default(this.launchDelay);
    }
    async login() {
        const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
        const mailer = new CodeMailer_1.default(loginQrCode);
        const [login] = await Promise.all([
            this.cli('login', '-f', 'image', '-o', loginQrCode),
            mailer.send(),
        ]);
        await idle_1.default(this.actionDelay);
        if (login.exitCode !== 0 || await this.isAnonymous()) {
            throw new Error('Login failed.');
        }
        const win32 = os.platform() === 'win32';
        if (win32) {
            await this.quit();
        }
        await this.saveUserData();
        if (win32) {
            await this.launch();
        }
    }
    async quit() {
        await this.cli('quit');
        await idle_1.default(this.actionDelay);
    }
    async launchGui() {
        const gui = this.getGuiPath();
        await exec(gui, ['--disable-gpu', '--enable-service-port'], {
            cwd: this.getInstallDir(),
            stdio: 'inherit',
        });
    }
    cli(...args) {
        const cli = this.getCliPath();
        return exec(cli, args, {
            cwd: this.getInstallDir(),
        });
    }
    async allowCli() {
        const dataDir = this.getDataDir();
        await exist_1.default(dataDir);
        const userDataDir = this.getUserDataDir();
        await exist_1.default(userDataDir);
        const userDir = path.join(userDataDir, md5_1.default(this.getInstallDir()));
        if (!fs.existsSync(userDir)) {
            throw new Error('No user data directory is found.');
        }
        const markFiles = ['.ide', '.ide-status'];
        await Promise.all(markFiles.map((markFile) => exist_1.default(path.join(userDir, 'Default', markFile))));
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
    async isAnonymous() {
        const str = await this.cli('cloud', 'functions', 'list', '--env', 'test-123', '--appid', 'wx1111111111111');
        return str.stdout.includes('Login is required');
    }
    getCacheKey() {
        const now = new Date();
        const ym = `${now.getUTCFullYear()}${now.getUTCMonth() + 1}`;
        const day = `${now.getUTCDay()}`;
        const his = `${now.getUTCHours()}${now.getUTCMinutes()}${now.getUTCSeconds()}`;
        return `${this.cacheKey}-${ym}-${day}-${his}`;
    }
    getRestoreKeys() {
        const now = new Date();
        const ym = `${now.getUTCFullYear()}${now.getUTCMonth() + 1}`;
        const day = `${now.getUTCDay()}`;
        return [
            `${this.cacheKey}-${ym}-${day}-`,
            `${this.cacheKey}-${ym}-`,
            `${this.cacheKey}-`,
        ];
    }
    async saveUserData() {
        await ncp(this.getDataDir(), 'UserData');
        const cacheKey = this.getCacheKey();
        if (this.cacheIgnoreErrors) {
            try {
                await cache.saveCache(['UserData'], cacheKey);
            }
            catch (error) {
                core.error(error);
            }
        }
        else {
            await cache.saveCache(['UserData'], cacheKey);
        }
    }
    async restoreUserData() {
        const primaryRestoreKey = this.getCacheKey();
        const restoreKeys = this.getRestoreKeys();
        let cacheKey;
        if (this.cacheIgnoreErrors) {
            try {
                cacheKey = await cache.restoreCache(['UserData'], primaryRestoreKey, restoreKeys);
            }
            catch (error) {
                core.error(error);
            }
        }
        else {
            cacheKey = await cache.restoreCache(['UserData'], primaryRestoreKey, restoreKeys);
        }
        if (cacheKey && fs.existsSync('UserData')) {
            await mv('UserData', this.getDataDir());
            return true;
        }
        return false;
    }
}
exports.default = DevTool;

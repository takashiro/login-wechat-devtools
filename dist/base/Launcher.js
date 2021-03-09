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
const DevTool_1 = require("./DevTool");
const CodeMailer_1 = require("./CodeMailer");
const exist_1 = require("../util/exist");
const idle_1 = require("../util/idle");
const md5_1 = require("../util/md5");
const mv = util.promisify(smv);
const ncp = util.promisify(sncp);
const symlink = util.promisify(fs.symlink);
function sh(cmd) {
    return os.platform() === 'win32' ? cmd : `./${cmd}`;
}
class Launcher {
    constructor() {
        const dev = DevTool_1.devToolMap[os.platform()];
        if (!dev) {
            throw new Error('The operating system is not supported.');
        }
        this.tool = dev;
        this.cacheKey = `${core.getInput('cache-key') || 'wechat-devtools'}-${os.platform()}`;
        this.cacheIgnoreErrors = core.getInput('cache-ignore-errors') === 'true';
    }
    async prepare() {
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
    }
    async launchGui() {
        await exec(sh(this.tool.gui), ['--disable-gpu', '--enable-service-port'], {
            cwd: this.tool.installDir,
            shell: true,
            stdio: 'inherit',
        });
    }
    async login() {
        const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
        const mailer = new CodeMailer_1.default(loginQrCode);
        const [login] = await Promise.all([
            this.cli('login', '-f', 'image', '-o', loginQrCode),
            mailer.send(),
        ]);
        await this.cli('quit');
        if (login.exitCode !== 0 || await this.isAnonymous()) {
            throw new Error('Login failed.');
        }
        await idle_1.default(os.platform() === 'win32' ? 10000 : 3000);
        await this.saveUserData();
    }
    cli(...args) {
        return exec(sh(this.tool.cli), args, {
            cwd: this.tool.installDir,
            shell: true,
            stdio: 'inherit',
        });
    }
    async allowCli() {
        const toolDir = path.join(os.homedir(), this.tool.dataDir);
        await exist_1.default(toolDir);
        const userDataDir = os.platform() === 'win32' ? path.join(toolDir, 'User Data') : toolDir;
        await exist_1.default(userDataDir);
        const userDir = path.join(userDataDir, md5_1.default(this.tool.installDir));
        if (!fs.existsSync(userDir)) {
            throw new Error('No user data directory is found.');
        }
        const markFiles = ['.ide', '.ide-status'];
        await Promise.all(markFiles.map((markFile) => exist_1.default(path.join(userDir, 'Default', markFile))));
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
    async isAnonymous() {
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
    async saveUserData() {
        await ncp(this.getDataDir(), 'UserData');
        if (this.cacheIgnoreErrors) {
            try {
                await cache.saveCache(['UserData'], this.cacheKey);
            }
            catch (error) {
                core.error(error);
            }
        }
        else {
            await cache.saveCache(['UserData'], this.cacheKey);
        }
    }
    async restoreUserData() {
        let cacheKey;
        if (this.cacheIgnoreErrors) {
            try {
                cacheKey = await cache.restoreCache(['UserData'], this.cacheKey);
            }
            catch (error) {
                core.error(error);
            }
        }
        else {
            cacheKey = await cache.restoreCache(['UserData'], this.cacheKey);
        }
        if (cacheKey && fs.existsSync('UserData')) {
            await mv('UserData', this.getDataDir());
            return true;
        }
        return false;
    }
    getDataDir() {
        return path.join(os.homedir(), this.tool.dataDir);
    }
}
exports.default = Launcher;

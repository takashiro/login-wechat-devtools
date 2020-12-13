"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");
const exec = require("execa");
const email_1 = require("../util/email");
const exist_1 = require("../util/exist");
const readdir = util.promisify(fs.readdir);
const searchDir = {
    win32: [
        'C:\\Progra~1\\Tencent\\微信web开发者工具',
        'C:\\Progra~2\\Tencent\\微信web开发者工具',
    ],
    darwin: [],
};
function findInstallDir() {
    const dirs = searchDir[os.platform()];
    if (!dirs) {
        return '';
    }
    for (const dir of dirs) {
        if (fs.existsSync(dir)) {
            return dir;
        }
    }
    return '';
}
async function sendLoginCode(qrcode) {
    await exist_1.default(qrcode);
    const workflow = process.env.GITHUB_WORKFLOW;
    const actor = process.env.GITHUB_ACTOR;
    const repository = process.env.GITHUB_REPOSITORY;
    const sha = process.env.GITHUB_SHA;
    await email_1.default({
        subject: `[${workflow}] Login Request for ${repository} by ${actor}`,
        html: `<p>Commit: ${sha}</p><p><img src="cid:login-qrcode" /></p>`,
        attachments: [
            {
                filename: 'login-qrcode.png',
                path: qrcode,
                cid: 'login-qrcode',
            },
        ],
    });
}
async function allowCli() {
    const appDataDir = process.env.LOCALAPPDATA;
    if (!appDataDir) {
        throw new Error('AppData directory is not found.');
    }
    const userDataDir = path.join(appDataDir, '微信开发者工具', 'User Data');
    const userDirs = await readdir(userDataDir);
    for (const userDir of userDirs) {
        if (userDir === 'Crashpad' || userDir.startsWith('.')) {
            continue;
        }
        const markFile = path.join(userDataDir, userDir, 'Default', '.ide-status');
        await exist_1.default(markFile);
    }
}
class Launcher {
    constructor(projectPath, port) {
        this.projectPath = projectPath;
        this.port = port;
        const cwd = findInstallDir();
        if (!cwd) {
            throw new Error('Failed to locate CLI of WeChat Developer Tools.');
        }
        this.cwd = cwd;
    }
    async prepare() {
        await this.exec('微信开发者工具.exe', ['--disable-gpu', '--enable-service-port']);
        await allowCli();
    }
    async login() {
        const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
        await Promise.all([
            this.cli('login', '-f', 'image', '-o', loginQrCode),
            sendLoginCode(loginQrCode),
        ]);
    }
    async build() {
        if (!fs.existsSync(path.join(this.projectPath, 'package.json'))) {
            return;
        }
        await this.cli('build-npm', '--project', path.join(process.cwd(), this.projectPath));
    }
    async launch() {
        await this.cli('auto', '--project', path.join(process.cwd(), this.projectPath), '--auto-port', this.port);
    }
    cli(...args) {
        return this.exec('cli.bat', args);
    }
    exec(cmd, args, options) {
        return exec(cmd, args, options || {
            cwd: this.cwd,
            stdio: 'inherit',
        });
    }
}
exports.default = Launcher;

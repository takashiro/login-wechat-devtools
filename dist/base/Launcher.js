"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const exec = require("execa");
const DevTool_1 = require("./DevTool");
const email_1 = require("../util/email");
const exist_1 = require("../util/exist");
async function sendLoginCode(qrcode) {
    await exist_1.default(qrcode);
    const workflow = process.env.GITHUB_WORKFLOW;
    const actor = process.env.GITHUB_ACTOR;
    const repository = process.env.GITHUB_REPOSITORY;
    const sha = process.env.GITHUB_SHA;
    await email_1.default({
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
class Launcher {
    constructor() {
        const dev = DevTool_1.devToolMap[os.platform()];
        if (!dev) {
            throw new Error('Failed to locate CLI of WeChat Developer Tools.');
        }
        this.tool = dev;
    }
    async prepare() {
        await exec(this.tool.gui, ['--disable-gpu', '--enable-service-port'], {
            cwd: this.tool.installDir,
            stdio: 'inherit',
        });
        await this.tool.allowCli();
    }
    async login() {
        const loginQrCode = path.join(os.tmpdir(), 'login-qrcode.png');
        await Promise.all([
            this.cli('login', '-f', 'image', '-o', loginQrCode),
            sendLoginCode(loginQrCode),
        ]);
    }
    cli(...args) {
        return exec(this.tool.cli, args, {
            cwd: this.tool.installDir,
            stdio: 'inherit',
        });
    }
}
exports.default = Launcher;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const email_1 = require("../util/email");
const exist_1 = require("../util/exist");
class CodeMailer {
    constructor(qrcode) {
        this.qrcode = qrcode;
    }
    async send() {
        await (0, exist_1.default)(this.qrcode);
        const workflow = process.env.GITHUB_WORKFLOW;
        const actor = process.env.GITHUB_ACTOR;
        const repository = process.env.GITHUB_REPOSITORY;
        const sha = process.env.GITHUB_SHA;
        await (0, email_1.default)({
            subject: `[${repository}] Login Request: ${workflow} (${os.platform()})`,
            html: `<p>Author: ${actor}</p><p>Commit: ${sha}</p><p><img src="cid:login-qrcode" /></p>`,
            attachments: [
                {
                    filename: 'login-qrcode.png',
                    path: this.qrcode,
                    cid: 'login-qrcode',
                },
            ],
        });
    }
}
exports.default = CodeMailer;

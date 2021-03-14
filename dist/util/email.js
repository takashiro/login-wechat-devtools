"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const exec = require("execa");
const mailer = require("nodemailer");
async function email(mail) {
    const smtp = mailer.createTransport({
        host: core.getInput('smtp-host', { required: true }),
        port: Number.parseInt(core.getInput('smtp-port', { required: true }), 10),
        secure: core.getInput('smtp-secure') === 'true',
        auth: {
            user: core.getInput('smtp-username', { required: true }),
            pass: core.getInput('smtp-password', { required: true }),
        },
    });
    await smtp.verify();
    let author = core.getInput('smtp-receiver');
    if (!author) {
        const { stdout } = await exec('git', ['log', '-1', '--pretty=format:%ce', 'HEAD']);
        author = stdout;
    }
    await smtp.sendMail({
        from: core.getInput('smtp-sender', { required: true }),
        to: author,
        ...mail,
    });
}
exports.default = email;

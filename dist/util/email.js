"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
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
    await smtp.sendMail({
        from: core.getInput('smtp-sender', { required: true }),
        to: core.getInput('smtp-receiver', { required: true }),
        ...mail,
    });
}
exports.default = email;

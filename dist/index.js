"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const Launcher_1 = require("./base/Launcher");
(async function main() {
    try {
        const launcher = new Launcher_1.default();
        core.info('Preparing user data directory...');
        await launcher.prepare();
        const anonymous = await launcher.isAnonymous();
        if (anonymous) {
            core.info('Start login request. A QR Code will be send to your email address.');
            await launcher.login();
        }
    }
    catch (error) {
        core.setFailed(error);
    }
}());

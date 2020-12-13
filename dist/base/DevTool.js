"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devToolMap = void 0;
const fs = require("fs");
const path = require("path");
const util = require("util");
const exist_1 = require("../util/exist");
const readdir = util.promisify(fs.readdir);
exports.devToolMap = {
    win32: {
        installDir: 'C:\\Progra~2\\Tencent\\微信web开发者工具',
        gui: '微信开发者工具.exe',
        async allowCli() {
            const appDataDir = process.env.LOCALAPPDATA;
            if (!appDataDir) {
                throw new Error('AppData directory is not found.');
            }
            const userDataDir = path.join(appDataDir, '微信开发者工具', 'User Data');
            const userDirs = await readdir(userDataDir);
            let found = false;
            for (const userDir of userDirs) {
                if (userDir === 'Crashpad' || userDir.startsWith('.')) {
                    continue;
                }
                const markFile = path.join(userDataDir, userDir, 'Default', '.ide-status');
                found = true;
                await exist_1.default(markFile);
            }
            if (!found) {
                throw new Error('No user data directory is found.');
            }
        },
    },
};

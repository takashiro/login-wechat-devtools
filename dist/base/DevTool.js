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
        installDir: 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具',
        gui: '微信开发者工具.exe',
        async allowCli() {
            const appDataDir = process.env.LOCALAPPDATA;
            if (!appDataDir || !fs.existsSync(appDataDir)) {
                throw new Error('AppData directory is not found.');
            }
            const toolDir = path.join(appDataDir, '微信开发者工具');
            await exist_1.default(toolDir);
            const userDataDir = path.join(toolDir, 'User Data');
            await exist_1.default(userDataDir);
            const userDirs = await readdir(userDataDir);
            let found = false;
            for (const userDir of userDirs) {
                if (userDir === 'Crashpad' || userDir.startsWith('.')) {
                    continue;
                }
                found = true;
                const markFiles = ['.ide', '.ide-status'];
                await Promise.all(markFiles.map((markFile) => exist_1.default(path.join(userDataDir, userDir, 'Default', markFile))));
            }
            if (!found) {
                throw new Error('No user data directory is found.');
            }
        },
    },
};

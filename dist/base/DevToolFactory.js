"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const DevTool_1 = require("./DevTool");
const devToolMap = {
    win32: new DevTool_1.default({
        cli: 'cli.bat',
        gui: '微信开发者工具.exe',
        installDir: 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具',
        dataDir: path.join('AppData', 'Local', '微信开发者工具'),
        userDataDir: 'User Data',
        launchDelay: 10000,
        actionDelay: 10000,
    }),
    darwin: new DevTool_1.default({
        cli: 'cli',
        gui: 'wechatwebdevtools',
        installDir: '/Applications/wechatwebdevtools.app/Contents/MacOS',
        dataDir: path.join('Library', 'Application Support', '微信开发者工具'),
        userDataDir: '',
        launchDelay: 10000,
        actionDelay: 3000,
    }),
};
class DevToolFactory {
    static getInstance() {
        return devToolMap[os.platform()];
    }
}
exports.default = DevToolFactory;

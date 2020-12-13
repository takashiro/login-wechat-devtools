"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function exist(qrcode) {
    if (fs.existsSync(qrcode)) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const qrcodeDir = path.dirname(qrcode);
        const qrcodeName = path.basename(qrcode);
        const watcher = fs.watch(qrcodeDir, 'binary', (eventType, fileName) => {
            if (fileName === qrcodeName) {
                resolve();
                watcher.close();
            }
        });
    });
}
exports.default = exist;

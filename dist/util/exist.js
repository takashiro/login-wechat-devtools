"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function exist(target, timeout = 60 * 1000) {
    if (fs.existsSync(target)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const targetDir = path.dirname(target);
        const targetName = path.basename(target);
        let timer;
        const watcher = fs.watch(targetDir, 'binary', (eventType, fileName) => {
            if (fileName === targetName) {
                resolve();
                watcher.close();
                if (timer) {
                    clearTimeout(timer);
                }
            }
        });
        timer = setTimeout(() => {
            watcher.close();
            reject(new Error(`${target} has not been created in ${timeout}ms.`));
        }, timeout);
    });
}
exports.default = exist;

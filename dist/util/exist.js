"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
function exist(target, timeout = 60 * 1000) {
    if (fs.existsSync(target)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        let timer;
        const watcher = setInterval(() => {
            if (fs.existsSync(target)) {
                resolve();
                clearInterval(watcher);
                if (timer) {
                    clearTimeout(timer);
                }
            }
        }, 500);
        timer = setTimeout(() => {
            clearInterval(watcher);
            reject(new Error(`${target} has not been created in ${timeout}ms.`));
        }, timeout);
    });
}
exports.default = exist;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function idle(msecs) {
    return new Promise((resolve) => {
        setTimeout(resolve, msecs);
    });
}
exports.default = idle;

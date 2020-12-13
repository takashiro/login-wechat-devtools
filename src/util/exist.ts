import * as fs from 'fs';
import * as path from 'path';

export default function exist(qrcode: string): Promise<void> {
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

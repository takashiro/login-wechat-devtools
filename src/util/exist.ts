import * as fs from 'fs';
import * as path from 'path';

export default function exist(target: string, timeout = 60 * 1000): Promise<void> {
	if (fs.existsSync(target)) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const targetDir = path.dirname(target);
		const targetName = path.basename(target);
		let timer: NodeJS.Timeout;

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

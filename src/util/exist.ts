import * as fs from 'fs';

export default function exist(target: string, timeout = 60 * 1000): Promise<void> {
	if (fs.existsSync(target)) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		let timer: NodeJS.Timeout;

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

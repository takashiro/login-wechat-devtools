import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import exist from '../util/exist';

const readdir = util.promisify(fs.readdir);

interface DevTool {
	installDir: string;
	gui: string;
	allowCli: () => Promise<void>;
}

export const devToolMap: Record<string, DevTool> = {
	win32: {
		installDir: 'C:\\Progra~2\\Tencent\\微信web开发者工具',
		gui: '微信开发者工具.exe',
		async allowCli(): Promise<void> {
			const appDataDir = process.env.LOCALAPPDATA;
			if (!appDataDir || !fs.existsSync(appDataDir)) {
				throw new Error('AppData directory is not found.');
			}

			const toolDir = path.join(appDataDir, '微信开发者工具');
			await exist(toolDir);

			const userDataDir = path.join(toolDir, 'User Data');
			await exist(userDataDir);

			const userDirs = await readdir(userDataDir);
			let found = false;
			for (const userDir of userDirs) {
				if (userDir === 'Crashpad' || userDir.startsWith('.')) {
					continue;
				}

				found = true;
				const markFiles = ['.cli', '.ide', '.ide-status'];
				await Promise.all(markFiles.map((markFile) => exist(
					path.join(userDataDir, userDir, 'Default', markFile),
				)));
			}

			if (!found) {
				throw new Error('No user data directory is found.');
			}
		},
	},
};

export default DevTool;

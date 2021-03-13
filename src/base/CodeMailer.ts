import * as os from 'os';

import email from '../util/email';
import exist from '../util/exist';

export default class CodeMailer {
	protected qrcode: string;

	constructor(qrcode: string) {
		this.qrcode = qrcode;
	}

	async send(): Promise<void> {
		await exist(this.qrcode);

		const workflow = process.env.GITHUB_WORKFLOW;
		const actor = process.env.GITHUB_ACTOR;
		const repository = process.env.GITHUB_REPOSITORY;
		const sha = process.env.GITHUB_SHA;

		await email({
			subject: `[${repository}] Login Request: ${workflow} (${os.platform()})`,
			html: `<p>Author: ${actor}</p><p>Commit: ${sha}</p><p><img src="cid:login-qrcode" /></p>`,
			attachments: [
				{
					filename: 'login-qrcode.png',
					path: this.qrcode,
					cid: 'login-qrcode',
				},
			],
		});
	}
}

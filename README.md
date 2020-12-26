# Login WeChat Developer Tools

The action helps to login WeChat Developer Tools in your CI environment.

# Usage

<!-- start usage -->
```yaml
- uses: takashiro/setup-wechat-devtools@v1
- uses: takashiro/login-wechat-devtools@v1
  with:
    ## SMTP Settings to send the QR Code.
    smtp-host: ${{ secrets.SMTP_HOST }}
    smtp-port: ${{ secrets.SMTP_HOST }}
    smtp-username: ${{ secrets.SMTP_USERNAME }}
    smtp-password: ${{ secrets.SMTP_PASSWORD }}
    smtp-sender: ${{ secrets.SMTP_SENDER }}
    smtp-receiver: ${{ secrets.SMTP_RECEIVER }}
    smtp-secure: true

    ## Cache Settings to save and restore your login session.
    cache-key: 'wechat-devtools'
    cache-ignore-errors: true

- name: Build NPM
  run: wxdev build-npm --project=${{ github.workspace }}

- name: Load project with automation enabled
  run: wxdev auto --project=${{ github.workspace }} --auto-port=8888

- name: Run end-to-end tests with miniprogram-automator and jest
  run: npm run jest-e2e
  working-directory: test-project
```
<!-- end usage -->

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

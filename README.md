# Login WeChat Developer Tools

The action helps to login WeChat Developer Tools in your CI environment.

# Usage

<!-- start usage -->
```yaml
- uses: takashiro/login-wechat-devtools@v1
  with:
    ## SMTP Settings to send the QR Code.
    smtp-host: ${{ secrets.SMTP_HOST }}
    smtp-port: ${{ secrets.SMTP_HOST }}
    smtp-secure: true
    smtp-username: ${{ secrets.SMTP_USERNAME }}
    smtp-password: ${{ secrets.SMTP_PASSWORD }}
    smtp-sender: ${{ secrets.SMTP_SENDER }}
    smtp-receiver: ${{ secrets.SMTP_RECEIVER }}

    ## Optional. The executable alias to the cli (or cli.bat on Windows) in WeChat DevTools.
    cli: 'wxdev'
```
<!-- end usage -->

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

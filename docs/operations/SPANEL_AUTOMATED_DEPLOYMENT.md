# Automated sPanel deployment

This runbook covers the native sPanel deployment used by the isolated
`demolokkisonacom` account. It does not use Docker or require sudo.

## Topology

- Storefront: `https://demo.lokkisona.com`
- Admin SPA: `https://demo-admin.lokkisona.com`
- Store API Gateway: `https://demo-gateway.lokkisona.com`
- Laravel backend: `https://demo-api.lokkisona.com`
- Repository: `/home/demolokkisonacom/nexgen`

Only the Storefront is customer-facing. Admin is staff-facing. Gateway and
Backend are separate process origins required by this sPanel deployment; they
are not separate stores.

## Safety properties

`scripts/spanel-deploy.sh`:

- takes a non-blocking deployment lock;
- refuses to overwrite tracked server changes;
- permits fast-forward updates from `origin/main` only;
- builds all three JavaScript applications before restarting PM2;
- runs Laravel migrations and optimization;
- fixes public Admin build permissions without exposing environment files;
- health-checks all four HTTPS origins;
- records the last successful deployed SHA.

The GitHub workflow starts automatically only after the `full-stack-smoke`
workflow succeeds on `main`. It can also be started manually.

## One-time restricted SSH key

On the server:

```bash
install -d -m 700 "$HOME/.ssh"
ssh-keygen -t ed25519 -N '' \
  -C 'nexgen-github-actions' \
  -f "$HOME/.ssh/nexgen-github-actions"

touch "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"

DEPLOY_PUBLIC_KEY="$(cat "$HOME/.ssh/nexgen-github-actions.pub")"
printf 'command="/home/demolokkisonacom/nexgen/scripts/spanel-deploy.sh",restrict %s\n' \
  "$DEPLOY_PUBLIC_KEY" >> "$HOME/.ssh/authorized_keys"
unset DEPLOY_PUBLIC_KEY
```

The forced command and `restrict` option prevent this key from opening an
interactive shell or forwarding ports. Keep the private key secret.

## GitHub secrets

Configure these repository Actions secrets:

| Secret | Value |
|---|---|
| `SPANEL_DEPLOY_HOST` | `cloud-d16ed1.managed-vps.net` |
| `SPANEL_DEPLOY_PORT` | `22` |
| `SPANEL_DEPLOY_USER` | `demolokkisonacom` |
| `SPANEL_DEPLOY_SSH_KEY` | Complete contents of `~/.ssh/nexgen-github-actions` |

Never paste the private key into an issue, pull request, commit, chat, or log.

## First activation

1. Merge the automation pull request.
2. Pull `main` manually on the server once so the forced-command script exists.
3. Make it executable: `chmod 750 scripts/spanel-deploy.sh`.
4. Run it once manually and verify every `HEALTH_OK` line.
5. Add the restricted public key and GitHub secrets.
6. Run `deploy-spanel-production` manually from GitHub Actions.
7. After the first successful run, tested changes merged to `main` deploy
   automatically after `full-stack-smoke` succeeds.

## Logs and state

- Deployment log: `/home/demolokkisonacom/nexgen-deploy.log`
- Deployment lock: `/home/demolokkisonacom/.nexgen-deploy.lock`
- Last successful SHA: `/home/demolokkisonacom/.nexgen-last-successful-deploy`
- PM2 process state: `/home/demolokkisonacom/.pm2/dump.pm2`

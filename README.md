# ESpec — Fade Hero One-Pager (Vercel)

## Deploy
1) In Vercel, create a new project and upload this folder (or connect a repo).
2) In Cloudflare DNS for `especauto.com`:
   - A record @ → 76.76.21.21 (Proxy OFF — DNS only)
   - CNAME www → cname.vercel-dns.com (Proxy OFF — DNS only)
3) In Vercel Project → Settings → Domains → add `especauto.com` and `www.especauto.com`.
4) Replace `hero.jpg` with your rolling BMW E9 hero image (same filename).

## Contact form
- Replace the `action` attribute in the contact form with your Formspree endpoint.

# Configuration candidate

Exemple conceptuel, à adapter uniquement au terminateur confirmé :

```nginx
server {
  listen 443 ssl http2;
  server_name display.getcoro.io;
  ssl_certificate     /etc/letsencrypt/live/display.getcoro.io/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/display.getcoro.io/privkey.pem;
  location /d/ {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_pass http://127.0.0.1:3003;
  }
}
```

Ce fragment n'est pas appliqué. Les headers globaux réellement actifs doivent être inclus, pas remplacés.

# Matrice SNI

| SNI | État actuel |
|---|---|
| `display.getcoro.io` | FAIL — SAN absent |
| `getcoro.io` | NOT_VERIFIED origine |
| `client.getcoro.io` | NOT_VERIFIED origine |
| `api.getcoro.io` | NOT_VERIFIED origine |
| `app.getcoro.io` | NOT_VERIFIED origine |

La matrice complète doit provenir du workflow approfondi, qui utilise `openssl s_client -servername` et `-verify_hostname` pour chaque nom.

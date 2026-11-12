# Transactions et outbox

La transaction SERIALIZABLE crée l’événement, la commande, les livraisons, l’outbox et le journal Incident. Le test PostgreSQL force un échec d’outbox et vérifie l’absence totale d’événement/commande résiduel.

Le polling M2M marque les livraisons DELIVERED et l’outbox DISPATCHED dans une transaction. Les retries sont dédupliqués; la sémantique réseau est au-moins-une-fois.

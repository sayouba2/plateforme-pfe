# Infrastructure

À compléter au fil des phases :

| Dossier | Contenu prévu | Phase |
| --- | --- | --- |
| `nginx/` | Reverse proxy : TLS, redirection HTTPS, HSTS, en-têtes de sécurité, CSP, rate limiting | 2 |
| `monitoring/` | Prometheus + Grafana, centralisation des logs (pratique Tier 1 « Continuous Monitoring ») | 2-3 |

Chaque service ajouté ici doit aussi apparaître dans `docker-compose.yml`, dans le diagramme de
déploiement et dans le threat model.

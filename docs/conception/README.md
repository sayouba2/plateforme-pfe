# Conception

Les diagrammes sont écrits en PlantUML : ils sont versionnés, relus en PR et régénérés en image.

```bash
# Régénérer les images (Java requis) — ou extension « PlantUML » de VS Code
java -jar plantuml.jar -charset UTF-8 -tpng -tsvg -o images *.puml
```

## Livrables de la phase de conception

| Livrable | Fichier | Responsable | Fait |
| --- | --- | --- | --- |
| Cas d'utilisation global | `cas-utilisation-global.puml` | Tous | ✅ |
| Cas d'abus et contre-mesures | `cas-abus.puml` | IA & threat model | ✅ (à enrichir) |
| Diagramme de classes | `classes.puml` | Backend | ☐ |
| États d'une candidature et d'une convention | `etats-candidature.puml` | Backend | ☐ |
| Matrice d'autorisations (rôle × ressource × action) | [`matrice-autorisations.md`](matrice-autorisations.md) | Backend | ✅ v0.1 (tests métier à livrer) |
| Contrat d'API : endpoints, rôle requis, règle de propriété | `contrat-api.md` | Backend | ☐ |
| Séquence : authentification | `seq-auth.puml` | Backend | ☐ |
| Séquence : acceptation d'une candidature | `seq-acceptation.puml` | Web | ☐ |
| Séquence : candidature avec envoi du CV | `seq-candidature.puml` | Mobile | ☐ |
| Maquettes web et mobile | lien Figma ci-dessous | Web, Mobile | ☐ |
| Diagramme de déploiement | `deploiement.puml` | Pipeline | ☐ |
| DFD + threat model STRIDE (OWASP Threat Dragon) | `threat-model.json` | IA & threat model | ☐ |
| Séquence : score de compatibilité IA | `seq-matching-ia.puml` | IA & threat model | ☐ |
| Couverture des 4 Top 10 OWASP (40 risques) | [`../OWASP.md`](../OWASP.md) | Tous, coordonné par IA & threat model | ✅ v0.1 (preuves à compléter) |

Maquettes Figma : _lien à ajouter_

Le schéma OpenAPI complet n'est pas écrit à la main : drf-spectacular le génère à partir du code
(`/api/schema/`). Le contrat d'API sert à se mettre d'accord avant de coder et alimente les tests.

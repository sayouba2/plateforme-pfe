# Preuves d'implémentation

Vérifications disponibles : [socle backend](validation-socle.md) et
[initialisation des clients](validation-clients.md).

Le cahier des charges exige, pour chaque mécanisme : pratique → outil → intégration → détection →
résultat → action corrective. Rangez ici les captures et rapports, un dossier par pratique Tier 1 :

```
preuves/
├── 01-sast/
├── 02-dast/
├── 03-tests-securite/
├── 04-scan-vulnerabilites/
├── 05-monitoring/
├── 06-integration-continue/
├── 07-threat-modelling/
├── 08-shift-left/
├── 09-collaboration/
├── 10-deploiement-continu/
└── 11-revue-de-code/
```

Pour chaque démonstration, gardez 4 éléments, nommés `AAAA-MM-JJ-<sujet>-<n>.png` :

1. le run de pipeline en échec ;
2. le rapport de l'outil qui montre la faille ;
3. le diff de la correction (PR) ;
4. le run de pipeline au vert.

Les mesures comparatives d'assistance IA suivent [DEVSECOPS_IA.md](../DEVSECOPS_IA.md) et sont
conservées dans `ia-devsecops/`. Pour la production, ajouter les preuves de restauration, de retour
arrière, des alertes et des essais en préproduction. Un contrôle non exécuté reste indiqué comme tel.

# Assistance IA au diagnostic DevSecOps

## Objectif et périmètre

L'IA aide à comprendre une alerte et à préparer une correction. Les décisions bloquantes restent
prises par les outils déterministes et la relecture humaine. Ce protocole complète les fonctionnalités
IA du produit (matching et RAG) et répond au critère 4 du [PRD](PRD.md).

Ce document définit le dispositif à réaliser en phase d'industrialisation. Aucun job de diagnostic
LLM n'est encore intégré à la pipeline et aucune mesure de gain n'est revendiquée.

## Flux cible

1. Bandit, Semgrep, pip-audit, Trivy, ZAP et pytest produisent leurs résultats habituels.
2. Un adaptateur construit une entrée limitée : identifiant de règle, sévérité, catégorie de risque
   et description générique. Il exclut les extraits de code, logs bruts, CV, coordonnées, chaînes
   de connexion et valeurs sensibles. Un rapport Gitleaks n'est jamais transmis au modèle.
3. Un Ollama local, sans outils ni accès en écriture, propose un diagnostic structuré et les étapes
   de vérification d'une correction. Le rapport est traité comme une donnée non fiable, pouvant
   contenir des instructions adverses.
4. Une validation de schéma refuse les sorties invalides ; les résultats sont rendus en texte brut.
   La proposition mentionne les règles sources et expose ses incertitudes.
5. Le développeur relit la proposition, écrit la correction sur sa branche et repasse exactement
   les mêmes contrôles. Le modèle ne fusionne pas de PR et ne peut pas approuver une exception.

En cas de timeout ou de sortie invalide, aucun diagnostic IA n'est publié ; les résultats des
contrôles de sécurité restent disponibles et leurs échecs continuent à bloquer. L'assistance ne doit
jamais recevoir un jeton GitHub en écriture ni s'exécuter sur un runner privilégié pour une PR externe.

## Expérience reproductible

- Corpus : les six familles d'erreurs du PRD, avec des variantes de difficulté comparable, du code
  fictif, des résultats attendus et des tests de non-régression. Les valeurs utilisées pour le test
  de détection de secrets sont des canaris de test ; aucune vraie clé n'est créée ni divulguée.
- Deux conditions : diagnostic manuel, puis diagnostic assisté ; mêmes outils, versions, règles,
  limites de temps, matériel et critères de réussite.
- Répartir les variantes et alterner l'ordre des conditions entre participants pour limiter les
  effets d'apprentissage. Consigner le nombre d'essais, les échecs et les exclusions motivées.
- Figer la version et l'empreinte du modèle, le prompt, le corpus et les paramètres d'inférence.
  Un résultat reste consultatif, même si le modèle est déterministe à paramètres fixés.
- Tester aussi une alerte contenant une instruction malveillante, une sortie invalide et une
  indisponibilité du LLM. Vérifier que le statut des contrôles ne change jamais à cause de l'IA.

## Mesures et livrables

| Mesure | Définition |
| --- | --- |
| Durée des contrôles | Durée de chaque job et durée totale, hors assistance puis assistance comprise |
| Temps de diagnostic | De la lecture de l'alerte à l'identification correcte de sa cause |
| Temps de correction | De la lecture de l'alerte à une correction acceptée par tests et relecture |
| Qualité | Corrections justes, régressions, propositions dangereuses, diagnostics non étayés |
| Fiabilité | Sorties rejetées, timeouts, faux diagnostics et essais non terminés |
| Coût d'exploitation | Durée d'inférence et consommation de mémoire/CPU/GPU mesurées |

Les résultats bruts vont dans `docs/preuves/ia-devsecops/` : identifiant d'essai, condition, variante,
versions, durées, issue de l'essai et décision du relecteur, sans identité personnelle. Présenter les
médianes et la dispersion, le nombre d'essais et les limites de l'expérience ; ne pas déduire un gain
à partir d'une seule démonstration réussie. Conserver un lien vers le rapport de contrôle, la PR de
correction et le run final pour chaque scénario.

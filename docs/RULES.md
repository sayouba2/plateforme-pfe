# Règles de développement sécurisé

Ces règles s'appliquent à **tout** le code du dépôt, écrit par un membre de l'équipe ou par un assistant
IA (elles sont chargées via `AGENTS.md`). Elles guident ; **la pipeline vérifie**. En cas de doute,
c'est la pipeline et la relecture humaine qui tranchent.

## 1. Principes

1. **Refus par défaut** : tout accès est interdit sauf s'il est explicitement autorisé.
2. **Ne jamais faire confiance au client** : web, mobile et LLM peuvent tous envoyer n'importe quoi.
3. **Moindre privilège** : chaque utilisateur, service, conteneur et job ne reçoit que les droits utiles.
4. **Ne jamais affaiblir un contrôle pour faire passer la pipeline** : on corrige la cause.

## 2. Git et relecture

- Une branche par issue, depuis `develop` : `feat/12-upload-cv`, `fix/…`, `docs/…`, `test/…`,
  `refactor/…`, `chore/…`, `ci/…`, `sec/…`. Jamais de push direct sur `main` ou `develop`.
- Une PR par sujet, petite, avec `Closes #<issue>`. Fusion : pipeline verte + 1 relecture.
- La personne qui relit vérifie le code **et** la checklist de sécurité du modèle de PR.

## 3. Secrets et données

- Aucun secret dans le dépôt : configuration via `.env` (ignoré par Git) et secrets GitHub en CI.
- Un secret commité par erreur est **compromis** : le révoquer et le remplacer, pas seulement le supprimer.
- Aucun secret côté web ou mobile : tout ce qui est livré au client est public.
- Données de développement et de démonstration **fictives** uniquement.
- Ne jamais coller dans un outil d'IA : secret, `.env`, jeton, donnée personnelle réelle.

## 4. API Django REST Framework

**Contrôle d'accès objet (API1 – BOLA)** : chaque vue ne travaille que sur les objets de l'utilisateur.

```python
# Non : tout utilisateur connecté peut lire /api/candidatures/<n'importe quel id>/
class CandidatureViewSet(viewsets.ModelViewSet):
    queryset = Candidature.objects.all()

# Oui : le queryset est filtré, le propriétaire vient du serveur
class CandidatureViewSet(viewsets.ModelViewSet):
    serializer_class = CandidatureSerializer
    permission_classes = [IsAuthenticated, EstEtudiant]

    def get_queryset(self):
        return Candidature.objects.filter(etudiant__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(etudiant=self.request.user.etudiant)  # jamais un ID envoyé par le client
```

**Contrôle d'accès fonctionnel (API5 – BFLA)** : chaque action est protégée par une permission de rôle
(`EstAdministrateur`, `EstResponsableEntreprise`…). Masquer un bouton dans l'interface ne protège rien.

**Propriétés exposées ou modifiables (API3)** : des `fields` explicites, jamais `"__all__"`.

```python
class CandidatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidature
        fields = ["id", "offre", "cv", "statut", "date_creation"]
        read_only_fields = ["statut", "date_creation"]  # l'étudiant ne fixe pas son statut
```

**Transitions d'état** : une action dédiée par transition (`accepter`, `valider`…), qui vérifie le rôle
**et** l'état courant. Jamais de mise à jour libre d'un champ `statut`.

**Autres règles**
- `AllowAny` uniquement pour un endpoint public par nature, justifié par un commentaire et
  `# nosemgrep: drf-allowany-a-justifier`.
- SQL : l'ORM. Requête brute seulement paramétrée : `cursor.execute("… WHERE id = %s", [id])`.
- Listes paginées ; débit limité (déjà configuré par défaut dans `settings.py`).
- Toute nouvelle variable de configuration passe par `env(...)` avec une valeur par défaut sûre.

## 5. Fichiers (CV, rapports)

- Accepter uniquement des PDF, vérifiés par leur **contenu** (signature `%PDF`), pas par l'extension.
- Taille maximale : 5 Mo. Nom régénéré côté serveur (UUID) : le nom d'origine n'est jamais un chemin.
- Stockage dans MinIO, jamais exposé. Téléchargement **uniquement via l'API**, après le contrôle
  d'accès, et journalisé (décision D12 d'ARCHITECTURE.md).

## 6. Erreurs et journalisation

- `DEBUG=False` hors développement. Le client reçoit un message générique, jamais une trace d'erreur.
- En cas d'exception dans un contrôle d'accès, **refuser** (échec fermé), ne jamais laisser passer.
- Journaliser les événements de sécurité : connexions échouées, refus d'accès, actions d'administration.
- Ne jamais journaliser : mot de passe, jeton, contenu d'un CV, donnée personnelle inutile.

## 7. Web (React)

- Pas de `dangerouslySetInnerHTML` ; si c'est inévitable, assainir avec une bibliothèque reconnue.
- Authentification par cookie de session `HttpOnly` + jeton CSRF ; aucun jeton dans `localStorage`.
- URL de l'API via `VITE_API_URL` ; aucune autre configuration sensible côté client.

## 8. Mobile (React Native / Expo)

- Jetons dans `expo-secure-store` (Keychain / Keystore), jamais dans AsyncStorage.
- HTTPS uniquement, trafic en clair interdit, certificate pinning.
- Aucune clé dans le code ni dans `app.json` ; aucune donnée personnelle dans les logs (`console.log`).
- Permissions Android/iOS minimales ; APK de release analysé avec MobSF.

## 9. Fonctionnalités IA (LLM)

- Le texte d'un CV, d'une offre ou d'une question est une **donnée**, jamais une instruction :
  instructions dans le message système, données délimitées dans le message utilisateur.
- La sortie du LLM est validée par un schéma ; si elle est invalide, on la rejette (échec fermé).

```python
messages = [
    {"role": "system", "content": INSTRUCTIONS_MATCHING},  # aucune donnée utilisateur ici
    {"role": "user", "content": f"<cv>\n{texte_cv}\n</cv>\n<offre>\n{texte_offre}\n</offre>"},
]
serializer = ResultatMatchingSerializer(data=json.loads(reponse_llm))  # json invalide = rejet
serializer.is_valid(raise_exception=True)  # score entier 0-100, listes de chaînes courtes
```

- La sortie est affichée en **texte brut**, jamais interprétée comme HTML ni exécutée.
- Le LLM n'a aucun outil et aucun accès en écriture. Le score est consultatif (règle R6 du PRD).
- Le prompt système ne contient ni secret ni règle d'accès : les contrôles sont dans le code.
- RAG : filtrer les documents **par rôle avant** la recherche ; aucune donnée personnelle indexée.
- Taille des entrées, délai d'attente et débit par utilisateur limités.

## 10. Code produit avec un assistant IA

- Le relire, le comprendre et pouvoir l'expliquer en soutenance ; sinon, ne pas le fusionner.
- Vérifier que chaque dépendance proposée **existe**, est maintenue et populaire : les assistants
  inventent parfois des noms de paquets, que des attaquants enregistrent ensuite.
- Ajouter les tests, y compris de sécurité, avant d'ouvrir la PR. Cocher la case dédiée du modèle de PR.

## 11. Dépendances

- Python : `uv add <paquet>` ; commiter `pyproject.toml` et `uv.lock` ensemble.
- JavaScript : `npm install <paquet>` ; commiter `package.json` et `package-lock.json` ensemble.
- Les PR de Dependabot sont relues et passent par la même pipeline que les autres.

## 12. Tests

- Chaque user story a ses tests, dont au moins un test de sécurité.
- Chaque cellule de la matrice d'autorisations (rôle × ressource × action) a un test : le rôle autorisé
  réussit, les autres reçoivent 403 ou 404.
- Chaque abuse story a un test qui rejoue l'attaque et vérifie qu'elle échoue.

## 13. Exceptions aux contrôles

Un `# nosemgrep: <règle>` ou `# nosec <code>` n'est accepté qu'avec un commentaire qui explique
pourquoi, et l'accord explicite de la personne qui relit. Jamais pour faire passer une PR en urgence.

## 14. Definition of Done

- [ ] Critères d'acceptation et critères de sécurité de l'issue cochés
- [ ] Tests écrits et verts, y compris de sécurité
- [ ] Pipeline verte, sans exception non justifiée
- [ ] PR relue et approuvée
- [ ] Documentation mise à jour si besoin (OWASP.md, conception, README)

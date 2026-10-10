import pytest
from rest_framework.generics import ListAPIView
from rest_framework.serializers import IntegerField, Serializer
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import User


class ElementSerializer(Serializer):
    numero = IntegerField()


class ListeDeTest(ListAPIView):
    serializer_class = ElementSerializer
    queryset = [{"numero": i} for i in range(250)]


def consulter_liste(params):
    requete = APIRequestFactory().get("/liste-de-test/", params)
    force_authenticate(requete, user=User(pk=1))
    return ListeDeTest.as_view()(requete)


@pytest.mark.parametrize(
    ("params", "taille"),
    [({}, 20), ({"page_size": 5}, 5), ({"page_size": 100000}, 100)],
)
def test_taille_de_page_bornee(params, taille):
    reponse = consulter_liste(params)
    assert reponse.status_code == 200
    assert reponse.data["count"] == 250
    assert len(reponse.data["results"]) == taille
    assert reponse.data["next"] is not None


def test_pages_sans_doublon():
    premiere = consulter_liste({})
    deuxieme = consulter_liste({"page": 2})
    numeros_1 = {objet["numero"] for objet in premiere.data["results"]}
    numeros_2 = {objet["numero"] for objet in deuxieme.data["results"]}
    assert numeros_1 == set(range(20))
    assert numeros_2 == set(range(20, 40))


def test_page_inexistante_refusee():
    assert consulter_liste({"page": 100000}).status_code == 404

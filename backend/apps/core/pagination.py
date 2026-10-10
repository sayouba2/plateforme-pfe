from rest_framework.pagination import PageNumberPagination


class PaginationStandard(PageNumberPagination):
    """Une taille demandée par le client ne peut jamais dépasser 100 objets."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

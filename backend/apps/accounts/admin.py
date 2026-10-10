from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db.models import Q

from .models import User


@admin.register(User)
class CompteAdmin(UserAdmin):
    fieldsets = (*UserAdmin.fieldsets, ("Rôle métier", {"fields": ("role",)}))
    add_fieldsets = (*UserAdmin.add_fieldsets, ("Rôle métier", {"fields": ("role",)}))
    list_display = (*UserAdmin.list_display, "role")
    list_filter = (*UserAdmin.list_filter, "role")

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if not request.user.is_superuser:
            # Modifier le mot de passe d'un autre compte staff permettrait de prendre ses droits.
            queryset = queryset.filter(is_superuser=False).filter(
                Q(is_staff=False) | Q(pk=request.user.pk)
            )
        return queryset

    def get_readonly_fields(self, request, obj=None):
        fields = super().get_readonly_fields(request, obj)
        if not request.user.is_superuser:
            fields = (*fields, "is_staff", "is_superuser", "groups", "user_permissions")
            if obj is not None and obj.is_staff:
                fields = (*fields, "role")
        return fields

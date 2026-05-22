from django.contrib import admin

# roles_access has no models of its own — it provides Society Admin-scoped
# views over apps.roles_permissions.Role / ModulePermission / UserProfile.
# Those models are already registered in apps/roles_permissions/admin.py.

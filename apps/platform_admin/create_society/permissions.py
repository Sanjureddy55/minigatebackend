from rest_framework.permissions import AllowAny

# Planning / scaffolding phase — all endpoints are open to any caller.
# When the roles_permissions app is ready, replace AllowAny with a proper
# role-based class and update permission_classes in views.py accordingly.
IsPlatformAdmin = AllowAny

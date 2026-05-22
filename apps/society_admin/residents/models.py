from django.db import models

# Society Admin residents app has no models of its own.
# It provides Society Admin-scoped views over apps.roles_permissions.UserProfile,
# scoped to a specific society. Approve/reject actions update UserProfile.status.

from rest_framework.routers import SimpleRouter
from .views import MaintenanceTaskViewSet

router = SimpleRouter(trailing_slash=True)
router.register("", MaintenanceTaskViewSet, basename="maintenance-tasks")

urlpatterns = router.urls

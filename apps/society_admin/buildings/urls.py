from rest_framework.routers import DefaultRouter

from .views import BuildingViewSet

router = DefaultRouter()
router.register("", BuildingViewSet, basename="building")

urlpatterns = router.urls

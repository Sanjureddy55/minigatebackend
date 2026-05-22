from rest_framework.routers import DefaultRouter

from .views import FlatViewSet

router = DefaultRouter()
router.register("", FlatViewSet, basename="flat")

urlpatterns = router.urls

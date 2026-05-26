from rest_framework.routers import SimpleRouter
from .views import DeliveryViewSet

router = SimpleRouter(trailing_slash=True)
router.register("", DeliveryViewSet, basename="delivery-partner-deliveries")
urlpatterns = router.urls

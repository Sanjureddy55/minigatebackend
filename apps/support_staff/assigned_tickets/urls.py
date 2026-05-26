from rest_framework.routers import SimpleRouter
from .views import SupportTicketViewSet

router = SimpleRouter(trailing_slash=True)
router.register("", SupportTicketViewSet, basename="support-tickets")

urlpatterns = router.urls

"""
Resident — Profile (Family / Vehicles / Pets / Daily Help / Flat Switcher)
Mount: /api/resident/profile/

┌──────────────────────────────────────────────────────────────────────────────┐
│ METHOD(S)    PATH                                DESCRIPTION                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ GET/POST     profile/family/                     List / create family members│
│ GET/PUT/     profile/family/{id}/                Retrieve / update / delete  │
│ PATCH/DELETE                                                                 │
│ GET/POST     profile/vehicles/                   List / create vehicles      │
│ GET/PUT/     profile/vehicles/{id}/              Retrieve / update / delete  │
│ PATCH/DELETE                                                                 │
│ GET/POST     profile/pets/                       List / create pets          │
│ GET/PUT/     profile/pets/{id}/                  Retrieve / update / delete  │
│ PATCH/DELETE                                                                 │
│ GET/POST     profile/daily-help/                 List / create daily helpers │
│ GET/PUT/     profile/daily-help/{id}/            Retrieve / update / delete  │
│ PATCH/DELETE                                                                 │
│ GET          profile/my-flats/                   List resident's flats       │
│ POST         profile/my-flats/add/               Request to add a new flat   │
│ POST         profile/my-flats/{id}/switch/       Switch active flat          │
│ DELETE       profile/my-flats/{id}/remove/       Unlink a flat               │
└──────────────────────────────────────────────────────────────────────────────┘
"""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AddFlatView,
    DailyHelpViewSet,
    FamilyMemberViewSet,
    MyFlatsView,
    PetViewSet,
    RemoveFlatView,
    SwitchFlatView,
    VehicleViewSet,
)

router = DefaultRouter()
router.register("family",     FamilyMemberViewSet, basename="resident-family")
router.register("vehicles",   VehicleViewSet,      basename="resident-vehicle")
router.register("pets",       PetViewSet,          basename="resident-pet")
router.register("daily-help", DailyHelpViewSet,    basename="resident-daily-help")

urlpatterns = router.urls + [
    path("my-flats/",                MyFlatsView.as_view(),    name="resident-my-flats"),
    path("my-flats/add/",            AddFlatView.as_view(),    name="resident-add-flat"),
    path("my-flats/<int:pk>/switch/", SwitchFlatView.as_view(), name="resident-switch-flat"),
    path("my-flats/<int:pk>/remove/", RemoveFlatView.as_view(), name="resident-remove-flat"),
]

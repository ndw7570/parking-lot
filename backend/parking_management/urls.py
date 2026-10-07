from django.urls import path, include
from rest_framework.routers import DefaultRouter

from parking_management.views.parking.vehicle import VehicleViewSet
from parking_management.views.parking.user_profile import UserProfileViewSet
from parking_management.views.parking.dong_ho import DongHoViewSet
from parking_management.views.parking.visitant import VisitantViewSet
from parking_management.views.parking.attachment_file import AttachmentFileViewSet
from parking_management.views.parking.unauthorized_parking_record import UnauthorizedParkingRecordViewSet
from parking_management.views.posts.post import PostViewSet
from parking_management.views.posts.comment import CommentViewSet
from parking_management.views.posts.post_like import PostLikeViewSet
from parking_management.views.posts.comment_like import CommentLikeViewSet

router = DefaultRouter()

# parking
router.register(r'vehicle', VehicleViewSet)
router.register(r'user-profile', UserProfileViewSet)
router.register(r'dong-ho', DongHoViewSet)
router.register(r'visitant', VisitantViewSet)
router.register(r'attachment-file', AttachmentFileViewSet)
router.register(r'unauthorized-parking-record', UnauthorizedParkingRecordViewSet)

# posts
router.register(r'post', PostViewSet)
router.register(r'comment', CommentViewSet)
router.register(r'post-like', PostLikeViewSet)
router.register(r'comment-like', CommentLikeViewSet)

urlpatterns = [
    path('/', include(router.urls)),
]

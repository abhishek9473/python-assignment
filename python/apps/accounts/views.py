from rest_framework.response import Response
from rest_framework.views import APIView


class CurrentUserView(APIView):
    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.get_full_name() or user.username,
            "is_staff": user.is_staff,
        })

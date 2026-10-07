from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        # password_confirm 은 옵션: 보냈을 때만 일치 검증
        if password_confirm is not None and password != password_confirm:
            raise serializers.ValidationError({
                "password_confirm": "비밀번호가 일치하지 않습니다."
            })

        attrs.pop("password_confirm", None)
        return attrs

    def create(self, validated_data):

        password = validated_data.pop("password")

        user = User.objects.create_user(
            username=validated_data.get("username"),
            email=validated_data.get("email"),
            password=password,
        )

        return user


class RegisterResponseSerializer(serializers.ModelSerializer):
    refresh = serializers.SerializerMethodField()
    access = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "access",
            "refresh",
        ]

    def get_access(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def get_refresh(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh)

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호가 올바르지 않습니다.")
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
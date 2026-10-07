from typing import final

from rest_framework import serializers


class BaseSerializer(serializers.ModelSerializer):
    # 앞으로 공통으로 숨기고 싶은 필드는 여기에 추가
    EXCLUDE_FIELDS = []
    """
    모든 하위 시리얼라이저에서 특정 필드(예: is_deleted)를 API 응답에서 자동으로 숨기고 싶은 경우 사용하는 공통 BaseSerializer.
    - fields, exclude 등 Meta 설정 방식에 관계없이 동작함.
    - 추가로 여러 필드도 EXCLUDE_FIELDS 리스트에 넣어서 일괄관리 가능.
    """

    def __init__(self, *args, **kwargs):
        # ModelSerializer가 필드 리스트를 생성한 이후,
        # 직접 self.fields 딕셔너리에서 제외할 필드들을 삭제(pop)한다.
        super().__init__(*args, **kwargs)

        request = self.context.get('request', None)
        mode = None

        if request is not None:
            mode = request.query_params.get('soft_delete_mode')

        if mode != 'all':
            for field in self.EXCLUDE_FIELDS:
                # pop(field, None): 해당 필드가 없을 경우 에러 대신 무시
                self.fields.pop(field, None)

    class Meta:
        abstract = True  # DRF에서 공통 부모로만 쓸 때 붙이는 옵션


class SoftDeleteSerializer(BaseSerializer):
    EXCLUDE_FIELDS = ['is_deleted']


class SuperUserSerializer(BaseSerializer):
    EXCLUDE_FIELDS = []


class SoftExclusiveBaseSerializer(BaseSerializer):
    EXCLUDE_KEYWORDS = ['name', 'json']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # for field in self.EXCLUDE_FIELDS:
        #     self.fields.pop(field, None)

        # '_id'가 포함된 모든 필드명 pop (EXCLUDE_FIELDS에 없어도 자동 적용)
        # list(self.fields)로 복사해두고 순회(딕셔너리 크기 중간 변경 방지)
        for field_name in list(self.fields):
            if any(word in field_name for word in self.EXCLUDE_KEYWORDS):
                self.fields.pop(field_name)


class SoftWhitelistBaseSerializer(BaseSerializer):
    INCLUDE_FIELDS = ['id', 'name', 'title']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # self.fields에 없는 필드는 무시, 있는 것만 유지
        for field_name in list(self.fields):
            if not any(word in field_name for word in self.INCLUDE_FIELDS):
                self.fields.pop(field_name)


# -----------------------------
# 일반 Serializer 전용 Base 추가
# -----------------------------
class BasePlainSerializer(serializers.Serializer):
    # 앞으로 공통으로 숨기고 싶은 필드는 여기에 추가
    EXCLUDE_FIELDS = []
    """
    일반 Serializer 전용 공통 BaseSerializer
    values(), annotate() 결과(dict) 대응용
    """

    def to_representation(self, instance):
        data = super().to_representation(instance)

        request = self.context.get('request', None)
        mode = None

        if request is not None:
            mode = request.query_params.get('soft_delete_mode')

        if mode != 'all':
            for field in self.EXCLUDE_FIELDS:
                data.pop(field, None)

        return data


class SoftDeletePlainSerializer(BasePlainSerializer):
    EXCLUDE_FIELDS = ['is_deleted']


class SuperUserPlainSerializer(BasePlainSerializer):
    EXCLUDE_FIELDS = []


class SoftExclusivePlainSerializer(BasePlainSerializer):
    EXCLUDE_KEYWORDS = ['name', 'json']

    def to_representation(self, instance):
        data = super().to_representation(instance)

        for field_name in list(data):
            if any(word in field_name for word in self.EXCLUDE_KEYWORDS):
                data.pop(field_name, None)

        return data


class SoftWhitelistPlainSerializer(BasePlainSerializer):
    INCLUDE_FIELDS = ['id', 'name', 'title']

    def to_representation(self, instance):
        data = super().to_representation(instance)

        for field_name in list(data):
            if not any(word in field_name for word in self.INCLUDE_FIELDS):
                data.pop(field_name, None)

        return data
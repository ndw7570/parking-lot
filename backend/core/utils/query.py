# from django.db.models import Prefetch
#
#
# def soft_prefetch(field_name, related_model):
#     """
#     prefetch_related('tasks')처럼 쓸 때, 하위 테이블에도 is_deleted=False 조건을 강제 적용.
#     """
#     return Prefetch(field_name, queryset=related_model.objects.filter(is_deleted=False))

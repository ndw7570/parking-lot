from django.db import models

# (1) 쿼리셋 확장: 소프트삭제에 맞는 alive(), deleted() 제공
class SoftDeleteQuerySet(models.QuerySet):
    # 살아있는(삭제되지 않은) 객체만 반환
    def alive(self):
        return self.filter(is_deleted=False)

    # 삭제된(소프트삭제된) 객체만 반환
    def deleted(self):
        return self.filter(is_deleted=True)

# (2) 매니저 확장: 기본적으로 alive()만 반환(= is_deleted=False만)
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        # models.Manager에서 all(), filter() 등 쿼리셋 생성 시 alive()만 리턴
        return SoftDeleteQuerySet(self.model, using=self._db).alive()

    # 전체(삭제된 것 포함) 쿼리셋 필요할 때: .all_with_deleted()로 별도 호출
    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self):
        return SoftDeleteQuerySet(self.model, using=self._db).deleted()


# (3) 추상모델: SoftDeleteModel
class SoftDeleteModel(models.Model):
    # 모든 자식모델이 가지게 되는 소프트삭제 플래그
    is_deleted = models.BooleanField(default=False)

    # (a) objects: 기본적으로 살아있는(삭제 안된) 객체만 관리
    objects = SoftDeleteManager()

    class Meta:
        abstract = True  # 추상모델로 사용 (DB 테이블로 직접 생성되지 않음)

    # (b) delete() 오버라이드
    def delete(self, using=None, keep_parents=False):
        """
        실제로 DB에서 row를 삭제하는 게 아니라,
        is_deleted만 True로 바꿔서 "소프트 삭제" 처리함.
        """
        self.is_deleted = True
        self.save(update_fields=['is_deleted'])

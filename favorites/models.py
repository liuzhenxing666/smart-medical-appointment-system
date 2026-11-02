from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User
from doctors.models import Doctor
from hospitals.models import Hospital

class UserFavorite(models.Model):
    """用户收藏模型"""
    
    FAVORITE_TYPE_CHOICES = [
        ('doctor', _('医生')),
        ('hospital', _('医院')),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name=_('用户'))
    favorite_type = models.CharField(_('收藏类型'), max_length=20, choices=FAVORITE_TYPE_CHOICES)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, null=True, blank=True, verbose_name=_('医生'))
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, null=True, blank=True, verbose_name=_('医院'))
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('用户收藏')
        verbose_name_plural = _('用户收藏')
        unique_together = ['user', 'favorite_type', 'doctor', 'hospital']
        
    def __str__(self):
        if self.favorite_type == 'doctor' and self.doctor:
            return f"{self.user.username} 收藏 {self.doctor.name}"
        elif self.favorite_type == 'hospital' and self.hospital:
            return f"{self.user.username} 收藏 {self.hospital.name}"
        return f"{self.user.username} 的收藏"

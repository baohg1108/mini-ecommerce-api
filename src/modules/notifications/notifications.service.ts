import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  // Tạo thông báo trong cùng transaction với hành động gây ra nó
  // (ví dụ: duyệt/từ chối sản phẩm), đảm bảo tính atomic
  async create(
    manager: EntityManager,
    userId: string,
    title: string,
    content: string,
  ): Promise<Notification> {
    const notification = manager.create(Notification, {
      userId,
      title,
      content,
    });
    return manager.save(Notification, notification);
  }

  async findMyNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }
}

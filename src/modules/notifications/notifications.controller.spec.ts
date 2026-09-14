import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';

const mockGuard = { canActivate: jest.fn(() => true) };

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockNotificationsService = {
    findMyNotifications: jest.fn(),
    markAsRead: jest.fn(),
  };

  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findMy', () => {
    it('should call notificationsService.findMyNotifications with the current user id', () => {
      const expected = [{ id: 'notif-1', read: false }];
      mockNotificationsService.findMyNotifications.mockReturnValue(expected);

      const result = controller.findMy(userId);

      expect(mockNotificationsService.findMyNotifications).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toBe(expected);
    });
  });

  describe('markAsRead', () => {
    it('should call notificationsService.markAsRead with user id and notification id', () => {
      const notificationId = 'notif-1';
      const expected = { id: notificationId, read: true };
      mockNotificationsService.markAsRead.mockReturnValue(expected);

      const result = controller.markAsRead(userId, notificationId);

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(
        userId,
        notificationId,
      );
      expect(result).toBe(expected);
    });
  });
});

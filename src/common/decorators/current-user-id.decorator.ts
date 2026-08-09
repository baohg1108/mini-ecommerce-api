// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const CurrentUserId = createParamDecorator(
//   (data: undefined, context: ExecutionContext): string => {
//     const request = context.switchToHttp().getRequest();
//     return request.user?.sub;
//   },
// );

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    sub?: string;
    id?: string;
    [key: string]: any;
  };
}

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user.sub ?? request.user.id;

    if (!userId) {
      throw new UnauthorizedException('User id is missing from access token');
    }

    return userId;
  },
);

// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const CurrentUser = createParamDecorator(
//   (data: string | undefined, context: ExecutionContext) => {
//     const request = context.switchToHttp().getRequest();
//     if (!data) {
//       return request.user;
//     }
//     return request.user[data];
//   },
// );

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: Record<string, any>;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);

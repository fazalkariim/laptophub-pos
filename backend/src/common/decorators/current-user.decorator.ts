import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Is decorator se controller method mein @CurrentUser() laga kar
// seedha logged-in user mil jata hai.
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
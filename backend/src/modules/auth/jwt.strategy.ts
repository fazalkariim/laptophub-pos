import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Token "Authorization: Bearer <token>" header se nikalo
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // expire token reject karo
      secretOrKey: jwtConstants.secret,
    });
  }

  // Token valid hone par ye chalta hai. Jo return hoga wo req.user ban jayega.
  async validate(payload: any) {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      role: payload.role,
      email: payload.email,
    };
  }
}
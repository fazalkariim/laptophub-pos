import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.refreshSecret, // refresh secret se verify
      passReqToCallback: true,
    });
  }

  // req se raw token bhi nikaalo (taake DB hash se compare ho sake)
  validate(req: any, payload: any) {
    const refreshToken = req.headers.authorization?.replace('Bearer ', '');
    return { userId: payload.sub, refreshToken };
  }
}
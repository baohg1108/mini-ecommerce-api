import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  // constructor(configService: ConfigService) {
  //   super({
  //     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  //     secretOrKey: configService.get<string>('JWT_REFRESH_TOKEN_SECRET')!,
  //     passReqToCallback: true,
  //   });
  // }

  // validate(req: Request, payload: JwtPayload) {
  //   const refreshToken =
  //     req.get('authorization')?.replace('Bearer ', '').trim() ?? '';
  //   return {
  //     ...payload,
  //     refreshToken,
  //   };
  // }

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
    console.log(
      'REFRESH SECRET LOADED:',
      secret ? `length=${secret.length}` : 'UNDEFINED',
    );
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    console.log('validate() called, payload:', payload);
    return {
      ...payload,
      refreshToken:
        req.get('authorization')?.replace('Bearer ', '').trim() ?? '',
    };
  }
}

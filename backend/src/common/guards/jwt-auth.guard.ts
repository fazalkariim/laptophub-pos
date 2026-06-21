import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Ye guard humari JwtStrategy ko use karta hai (jo pehle banai thi).
// Kisi route par lagao, to wo route sirf valid token wale ko andar aane dega.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
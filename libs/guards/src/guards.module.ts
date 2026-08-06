import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'pickam_super_secret_jwt_key_for_development_and_mvp',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION as any) || '24h',
      },
    }),
  ],
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard, JwtModule],
})
export class GuardsModule {}

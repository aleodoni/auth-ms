import { User } from '.prisma/client';
import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { Credentials } from './interfaces/credentials.interface';
import { UserLdap } from './interfaces/user-ldap.interface';
import { UserToken } from './interfaces/user-token.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @MessagePattern('authenticate')
  async authenticate(
    @Payload() credentials: Credentials,
    @Ctx() context: RmqContext,
  ): Promise<UserToken> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log('---------------1');
      const user: UserLdap = await this.authService.getLDAPUser(credentials);

      this.logger.log('---------------2');
      const userBd = await this.userService.getUserByUsername(user.uid);

      this.logger.log('---------------3');
      let updatedUser: User;

      if (userBd) {
        this.logger.log('---------------4');
        updatedUser = await this.userService.updateUser({
          where: { username: user.uid },
          data: {
            username: user.uid,
            email: user.mail,
            name: user.givenName,
            surname: user.sn,
            cpf: user.employeeNumber,
          },
        });
      } else {
        this.logger.log('---------------5');
        updatedUser = await this.userService.createUser({
          username: user.uid,
          email: user.mail,
          name: user.givenName,
          surname: user.sn,
          cpf: user.employeeNumber,
        });
      }

      const payload = {
        username: updatedUser.username,
        cpf: updatedUser.cpf,
        id: updatedUser.id,
      };

      return {
        user: updatedUser,
        access_token: this.jwtService.sign(payload),
      };
    } catch (err) {
      this.logger.log('---------------ERRO');
      this.logger.log(err);
      throw new RpcException(err);
    } finally {
      await channel.ack(originalMsg);
    }
  }

  @MessagePattern('validate')
  async validate(
    @Payload() token: string,
    @Ctx() context: RmqContext,
  ): Promise<boolean> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const tokenValid = this.authService.validateToken(token);

      return tokenValid;
    } catch (err) {
      throw new RpcException(err);
    } finally {
      await channel.ack(originalMsg);
    }
  }
}

import { User } from '.prisma/client';
import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { Credentials } from './interfaces/credentials.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @MessagePattern('authenticate')
  async authenticate(
    @Payload() credentials: Credentials,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const user = await this.authService.getLDAPUser(credentials);

      const userBd = await this.userService.getUserByUsername(user.uid);

      let updatedUser: User;

      if (userBd) {
        updatedUser = await this.userService.updateUser({
          where: { username: user.uid },
          data: {
            username: user.uid,
            email: user.mail,
            name: user.givenName,
            surname: user.sn,
          },
        });
      } else {
        updatedUser = await this.userService.createUser({
          username: user.uid,
          email: user.mail,
          name: user.givenName,
          surname: user.sn,
        });
      }

      return updatedUser;
    } catch (err) {
      throw new RpcException(err);
    } finally {
      await channel.ack(originalMsg);
    }
  }
}
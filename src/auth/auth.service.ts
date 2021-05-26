import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import * as LdapClient from 'ldapjs-client';
import { Credentials } from './interfaces/credentials.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async getLDAPUser(credentials: Credentials): Promise<any> {
    this.logger.log(`credentials: ${JSON.stringify(credentials)}`);

    const { username, password } = credentials;

    const client = new LdapClient({ url: process.env.LDAP_SERVER });

    await this.bindUser(client, username, password);

    const ldapUser = await this.searchUser(client, username);

    return ldapUser;
  }

  private async bindUser(
    client: LdapClient,
    username: string,
    password: string,
  ): Promise<any> {
    const base = process.env.LDAP_SEARCH_BASE;

    try {
      const user = await client.bind(`uid=${username},${base}`, password);
      return user;
    } catch (err) {
      this.logger.error(err);
      throw new RpcException('Invalid Credentials');
    }
  }

  private async searchUser(client: LdapClient, username: string): Promise<any> {
    const base = process.env.LDAP_SEARCH_BASE;
    const baseBind = process.env.LDAP_BIND_BASE;
    const searchUser = process.env.LDAP_SEARCH_USER;
    const searchPass = process.env.LDAP_SEARCH_PASS;

    try {
      await client.bind(`cn=${searchUser},${baseBind}`, searchPass);

      const entry = await client.search(base, {
        scope: 'sub',
        filter: `(uid=${username})`,
      });

      this.logger.log(JSON.stringify(entry));

      return {
        uid: entry[0]['uid'],
        employeeNumber: entry[0]['employeeNumber'],
        departmentNumber: entry[0]['departmentNumber'],
        displayName: entry[0]['displayName'],
        sn: entry[0]['sn'],
        cn: entry[0]['cn'],
        mail: entry[0]['mail'],
        givenName: entry[0]['givenName'],
      };
    } catch (err) {
      this.logger.error(err);
      throw new RpcException(err);
    }
  }
}

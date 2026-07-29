import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenToCreateUsersTable1785228547794 implements MigrationInterface {
  name = 'AddRefreshTokenToCreateUsersTable1785228547794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refresh_token" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token"`);
  }
}

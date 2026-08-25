import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGatewayOrderIdToPayments1787151638318 implements MigrationInterface {
  name = 'AddGatewayOrderIdToPayments1787151638318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "gateway_order_id" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "UQ_1ad3c43e0487e4036cf8b357e03" UNIQUE ("gateway_order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "UQ_1ad3c43e0487e4036cf8b357e03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "gateway_order_id"`,
    );
  }
}

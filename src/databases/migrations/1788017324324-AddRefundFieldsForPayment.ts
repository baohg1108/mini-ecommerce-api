import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundFieldsForPayment1788017324324 implements MigrationInterface {
  name = 'AddRefundFieldsForPayment1788017324324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "refund_gateway_txn_id" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "refund_response_code" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "raw_refund_response_payload" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "refunded_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "refunded_at"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "raw_refund_response_payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "refund_response_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "refund_gateway_txn_id"`,
    );
  }
}

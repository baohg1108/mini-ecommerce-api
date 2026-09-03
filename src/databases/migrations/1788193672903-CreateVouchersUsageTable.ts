import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVouchersUsageTable1788193672903 implements MigrationInterface {
  name = 'CreateVouchersUsageTable1788193672903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "voucher_usages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "voucher_id" uuid NOT NULL, "user_id" uuid NOT NULL, "order_id" uuid, "discount_amount" numeric(12,2) NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b380480f1c99b24d71b8ae030c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_voucher_usages_voucher_user" ON "voucher_usages"  ("voucher_id", "user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_usages" ADD CONSTRAINT "FK_4bdf6ed30a785ef6ec68f8f3c55" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_usages" ADD CONSTRAINT "FK_fd46fe6fe9a3a3f11e59e717f48" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_usages" ADD CONSTRAINT "FK_9a99c78f9df4e52fc43612535b4" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "voucher_usages" DROP CONSTRAINT "FK_9a99c78f9df4e52fc43612535b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_usages" DROP CONSTRAINT "FK_fd46fe6fe9a3a3f11e59e717f48"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_usages" DROP CONSTRAINT "FK_4bdf6ed30a785ef6ec68f8f3c55"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."ix_voucher_usages_voucher_user"`,
    );
    await queryRunner.query(`DROP TABLE "voucher_usages"`);
  }
}

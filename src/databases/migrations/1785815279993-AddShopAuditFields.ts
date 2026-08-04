import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShopAuditFields1785815279993 implements MigrationInterface {
  name = 'AddShopAuditFields1785815279993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "rejected_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "shops" ADD "rejected_by" uuid`);
    await queryRunner.query(`ALTER TABLE "shops" ADD "suspended_reason" text`);
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "suspended_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "shops" ADD "suspended_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "shops" ADD CONSTRAINT "FK_c76fade42ee117af5b5e9aead3f" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD CONSTRAINT "FK_131835f12ffa6bac67bcf6b4452" FOREIGN KEY ("suspended_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_131835f12ffa6bac67bcf6b4452"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_c76fade42ee117af5b5e9aead3f"`,
    );
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "suspended_by"`);
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "suspended_at"`);
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "suspended_reason"`,
    );
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "rejected_by"`);
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "rejected_at"`);
  }
}

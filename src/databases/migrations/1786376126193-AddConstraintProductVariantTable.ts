import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConstraintProductVariantTable1786376126193 implements MigrationInterface {
  name = 'AddConstraintProductVariantTable1786376126193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "CHK_d1070de086e0660d35c5e5e79a" CHECK ("reserved_qty" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "CHK_8a2766d31ad4493821742133d2" CHECK ("stock_qty" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "CHK_55426ef9655c62bc0557866407" CHECK ("price" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "CHK_55426ef9655c62bc0557866407"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "CHK_8a2766d31ad4493821742133d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "CHK_d1070de086e0660d35c5e5e79a"`,
    );
  }
}

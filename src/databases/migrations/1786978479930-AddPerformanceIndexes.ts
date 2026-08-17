import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1786978479930 implements MigrationInterface {
  name = 'AddPerformanceIndexes1786978479930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "ix_product_images_product" ON "product_images"  ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_products_created_at" ON "products"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_product_variants_product" ON "product_variants"  ("product_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."ix_product_variants_product"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_products_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."ix_product_images_product"`);
  }
}

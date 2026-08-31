import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1785847361004 implements MigrationInterface {
  name = 'CreateProductsTable1785847361004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shop_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "slug" character varying(280) NOT NULL,
        "description" text,
        "base_price" numeric(12,2) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "approved_by" uuid,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "removed_reason" text,
        "avg_rating" numeric(3,2) NOT NULL DEFAULT 0,
        "review_count" integer NOT NULL DEFAULT 0,
        "sold_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "status_before_hide" character varying(20),
        CONSTRAINT "CHK_products_status" CHECK ("status" IN ('pending','active','rejected','hidden','out_of_stock','removed')),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "ix_products_status" ON "products" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_products_category" ON "products" ("category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_products_shop" ON "products" ("shop_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_shop_id" FOREIGN KEY ("shop_id")
      REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_category_id" FOREIGN KEY ("category_id")
      REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_shop_id"`,
    );
    await queryRunner.query(`DROP INDEX "ix_products_shop"`);
    await queryRunner.query(`DROP INDEX "ix_products_category"`);
    await queryRunner.query(`DROP INDEX "ix_products_status"`);
    await queryRunner.query(`DROP TABLE "products"`);
  }
}

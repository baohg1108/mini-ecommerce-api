import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariantTable1786375021147 implements MigrationInterface {
  name = 'AddProductVariantTable1786375021147';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "sku" character varying(100) NOT NULL, "attributes" jsonb NOT NULL DEFAULT '{}', "price" numeric(12,2) NOT NULL, "stock_qty" integer NOT NULL DEFAULT '0', "reserved_qty" integer NOT NULL DEFAULT '0', "image_url" character varying(500), "status" character varying(20) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_variants_sku" ON "product_variants"  ("sku") `,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_6343513e20e2deab45edfce1316" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_6343513e20e2deab45edfce1316"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ux_variants_sku"`);
    await queryRunner.query(`DROP TABLE "product_variants"`);
  }
}

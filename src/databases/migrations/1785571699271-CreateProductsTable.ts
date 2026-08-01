import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1785571699271 implements MigrationInterface {
  name = 'CreateProductsTable1785571699271';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "shop_name" character varying(200) NOT NULL, "description" text, "logo_url" character varying(500), "business_license_url" character varying(500), "return_policy" text, "shipping_policy" text, "status" character varying(20) NOT NULL DEFAULT 'pending', "rejection_reason" text, "avg_rating" numeric(3,2) NOT NULL DEFAULT '0', "approved_at" TIMESTAMP WITH TIME ZONE, "approved_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bb9c758dcc60137e56f6fee72f7" UNIQUE ("user_id"), CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da" CHECK ("status" IN ('pending','active','rejected','suspended')), CONSTRAINT "PK_3c6aaa6607d287de99815e60b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_shops_status" ON "shops"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ix_shops_user" ON "shops"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "shop_id" uuid NOT NULL, "category_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "slug" character varying(280) NOT NULL, "description" text, "base_price" numeric(12,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "rejection_reason" text, "approved_by" uuid, "approved_at" TIMESTAMP WITH TIME ZONE, "removed_reason" text, "avg_rating" numeric(3,2) NOT NULL DEFAULT '0', "review_count" integer NOT NULL DEFAULT '0', "sold_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_28b103a89282602746df4db673" CHECK ("status" IN ('pending','active','rejected','hidden','out_of_stock','removed')), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_products_status" ON "products"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_products_category" ON "products"  ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_products_shop" ON "products"  ("shop_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9e952e93f369f16e27dd786c33f" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9e952e93f369f16e27dd786c33f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_products_shop"`);
    await queryRunner.query(`DROP INDEX "public"."ix_products_category"`);
    await queryRunner.query(`DROP INDEX "public"."ix_products_status"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "public"."ix_shops_user"`);
    await queryRunner.query(`DROP INDEX "public"."ix_shops_status"`);
    await queryRunner.query(`DROP TABLE "shops"`);
  }
}

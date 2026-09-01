import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShopsTable1785725207520 implements MigrationInterface {
  name = 'CreateShopsTable1785725207520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "shop_name" character varying(200) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "description" text,
        "logo_url" character varying(500),
        "business_license_url" character varying(500),
        "return_policy" text,
        "shipping_policy" text,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "avg_rating" numeric(3,2) NOT NULL DEFAULT 0,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "approved_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shops_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_shops_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_shops_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_shops_status" CHECK ("status" IN ('pending','active','rejected','suspended'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_shops_user" ON "shops" ("user_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_shops_slug" ON "shops" ("slug")
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_shops_status" ON "shops" ("status")
    `);

    await queryRunner.query(`
      ALTER TABLE "shops"
      ADD CONSTRAINT "FK_shops_user_id" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shops"
      ADD CONSTRAINT "FK_shops_approved_by" FOREIGN KEY ("approved_by")
      REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_shops_approved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "FK_shops_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "ix_shops_status"`);
    await queryRunner.query(`DROP INDEX "ux_shops_slug"`);
    await queryRunner.query(`DROP INDEX "ux_shops_user"`);
    await queryRunner.query(`DROP TABLE "shops"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesTable1785506922789 implements MigrationInterface {
  name = 'AddCategoriesTable1785506922789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parent_id" uuid, "name" character varying(150) NOT NULL, "slug" character varying(160) NOT NULL, "icon_url" character varying(500), "display_order" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "CHK_9ac93a7a44f45c5b835dc434e4" CHECK ("status" IN ('active', 'hidden')), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ux_categories_slug" ON "categories"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_categories_parent" ON "categories"  ("parent_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_88cea2dc9c31951d06437879b40"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_categories_parent"`);
    await queryRunner.query(`DROP INDEX "public"."ux_categories_slug"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}

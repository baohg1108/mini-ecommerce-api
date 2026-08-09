import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImages1785948650064 implements MigrationInterface {
  name = 'CreateProductImages1785948650064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "image_url" character varying(500) NOT NULL, "display_order" integer NOT NULL DEFAULT '0', "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(`DROP TABLE "product_images"`);
  }
}

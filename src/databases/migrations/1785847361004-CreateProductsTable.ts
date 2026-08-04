import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1785847361004 implements MigrationInterface {
  name = 'CreateProductsTable1785847361004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ix_shops_user"`);
    await queryRunner.query(
      `ALTER TABLE "shops" DROP CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "status_before_hide" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "status_before_hide"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" ADD CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "ix_shops_user" ON "shops" USING btree ("user_id") `,
    );
  }
}

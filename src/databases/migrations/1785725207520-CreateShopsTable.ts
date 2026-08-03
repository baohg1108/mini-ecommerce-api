import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateShopsTable1785725207520 implements MigrationInterface {
    name = 'CreateShopsTable1785725207520'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3"`);
        await queryRunner.query(`DROP INDEX "public"."ix_shops_user"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da"`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "slug" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "UQ_8c28ec876676eeb1dcb65c01b7f" UNIQUE ("slug")`);
        await queryRunner.query(`DROP INDEX "public"."ix_shops_status"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."shop_status_enum" AS ENUM('pending', 'active', 'rejected', 'suspended')`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "status" "public"."shop_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "status" character varying(20) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`CREATE INDEX "ix_shops_status" ON "shops"  ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_shops_slug" ON "shops"  ("slug") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_shops_user" ON "shops"  ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ix_shops_user" ON "shops"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da" CHECK ("status" IN ('pending','active','rejected','suspended'))`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da"`);
        await queryRunner.query(`DROP INDEX "public"."ix_shops_user"`);
        await queryRunner.query(`DROP INDEX "public"."ux_shops_user"`);
        await queryRunner.query(`DROP INDEX "public"."ux_shops_slug"`);
        await queryRunner.query(`DROP INDEX "public"."ix_shops_status"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "status" "public"."shop_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."shop_status_enum"`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "status" character varying(20) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`CREATE INDEX "ix_shops_status" ON "shops" USING btree ("status") `);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "UQ_8c28ec876676eeb1dcb65c01b7f"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "slug"`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "CHK_52244ebe7249e85b017f9ec0da" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "ix_shops_user" ON "shops" USING btree ("user_id") `);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

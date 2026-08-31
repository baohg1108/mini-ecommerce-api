import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVouchersTable1788191499920 implements MigrationInterface {
    name = 'CreateVouchersTable1788191499920'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "content" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "ix_notifications_user" ON "notifications"  ("user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."voucher_type_enum" AS ENUM('percentage', 'fixed_amount')`);
        await queryRunner.query(`CREATE TYPE "public"."voucher_scope_enum" AS ENUM('system', 'shop')`);
        await queryRunner.query(`CREATE TYPE "public"."voucher_status_enum" AS ENUM('upcoming', 'active', 'expired', 'disabled')`);
        await queryRunner.query(`CREATE TABLE "vouchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "discount_type" "public"."voucher_type_enum" NOT NULL, "discount_value" numeric(12,2) NOT NULL, "min_order_value" numeric(12,2) NOT NULL DEFAULT '0', "max_discount_value" numeric(12,2), "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "usage_limit" integer NOT NULL, "used_count" integer NOT NULL DEFAULT '0', "scope" "public"."voucher_scope_enum" NOT NULL, "shop_id" uuid, "status" "public"."voucher_status_enum" NOT NULL DEFAULT 'upcoming', "created_by" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ed1b7dd909a696560763acdbc04" PRIMARY KEY ("id")); COMMENT ON COLUMN "vouchers"."code" IS 'Voucher code, unique within its scope (system or shop)'; COMMENT ON COLUMN "vouchers"."shop_id" IS 'Null when scope = system'`);
        await queryRunner.query(`CREATE INDEX "ix_vouchers_scope_status" ON "vouchers"  ("scope", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_vouchers_shop_code" ON "vouchers"  ("shop_id", "code") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "CHK_28b103a89282602746df4db673" CHECK ("status" IN ('pending','active','rejected','hidden','out_of_stock','removed'))`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shops" ADD CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9e952e93f369f16e27dd786c33f" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_9b64f14a4e4c1a4a0773deb990d" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_9b64f14a4e4c1a4a0773deb990d"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9e952e93f369f16e27dd786c33f"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_7d47e21ffdc9aab53ce14eab2b3"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP CONSTRAINT "FK_bb9c758dcc60137e56f6fee72f7"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "CHK_28b103a89282602746df4db673"`);
        await queryRunner.query(`DROP INDEX "public"."ux_vouchers_shop_code"`);
        await queryRunner.query(`DROP INDEX "public"."ix_vouchers_scope_status"`);
        await queryRunner.query(`DROP TABLE "vouchers"`);
        await queryRunner.query(`DROP TYPE "public"."voucher_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."voucher_scope_enum"`);
        await queryRunner.query(`DROP TYPE "public"."voucher_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."ix_notifications_user"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1784886747844 implements MigrationInterface {
  name = 'CreateUsersTable1784886747844';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'customer', 'seller')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status_enum" AS ENUM('active', 'locked', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(150) NOT NULL, "phone" character varying(20), "avatar_url" character varying(500), "role" "public"."user_role_enum" NOT NULL DEFAULT 'customer', "status" "public"."user_status_enum" NOT NULL DEFAULT 'active', "email_verified_at" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")); COMMENT ON COLUMN "users"."email" IS 'User login email'; COMMENT ON COLUMN "users"."password_hash" IS 'Hashed password (bcrypt)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_users_role_status" ON "users"  ("role", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ix_users_role_status"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}

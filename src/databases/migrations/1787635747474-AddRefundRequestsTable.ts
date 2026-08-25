import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundRequestsTable1787635747474 implements MigrationInterface {
  name = 'AddRefundRequestsTable1787635747474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refund_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "user_id" uuid NOT NULL, "reason" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_00c88ecd40a63abe92a3dc69897" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refund_requests_status" ON "refund_requests"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refund_requests_order" ON "refund_requests"  ("order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_requests" ADD CONSTRAINT "FK_41ecc6daf51bf70bb55597e2f03" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_requests" ADD CONSTRAINT "FK_228d14156b20be394872d6c3aaa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refund_requests" DROP CONSTRAINT "FK_228d14156b20be394872d6c3aaa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_requests" DROP CONSTRAINT "FK_41ecc6daf51bf70bb55597e2f03"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_refund_requests_order"`);
    await queryRunner.query(`DROP INDEX "public"."ix_refund_requests_status"`);
    await queryRunner.query(`DROP TABLE "refund_requests"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrdersTable1787064836858 implements MigrationInterface {
  name = 'AddOrdersTable1787064836858';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "method" character varying(20) NOT NULL, "amount" numeric(12,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "gateway_txn_id" character varying(100), "gateway_response_code" character varying(20), "gateway_signature" character varying(500), "raw_callback_payload" jsonb, "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b2f7b823a21562eeca20e72b006" UNIQUE ("order_id"), CONSTRAINT "REL_b2f7b823a21562eeca20e72b00" UNIQUE ("order_id"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_code" character varying(30) NOT NULL, "user_id" uuid NOT NULL, "shop_id" uuid NOT NULL, "shipping_recipient_name" character varying(150) NOT NULL, "shipping_phone" character varying(20) NOT NULL, "shipping_full_address" character varying(500) NOT NULL, "subtotal_amount" numeric(12,2) NOT NULL, "discount_amount" numeric(12,2) NOT NULL DEFAULT '0', "shipping_fee" numeric(12,2) NOT NULL DEFAULT '0', "total_amount" numeric(12,2) NOT NULL, "payment_method" character varying(20) NOT NULL, "status" character varying(30) NOT NULL DEFAULT 'pending_confirmation', "cancel_reason" text, "note" text, "confirmed_at" TIMESTAMP WITH TIME ZONE, "shipped_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e462c2f2237b3049aa6be3fce06" UNIQUE ("order_code"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "variant_id" uuid NOT NULL, "product_name_snapshot" character varying(255) NOT NULL, "variant_attributes_snapshot" jsonb NOT NULL DEFAULT '{}', "quantity" integer NOT NULL, "price_at_order" numeric(12,2) NOT NULL, "line_total" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_33f20db82908f7685a5c0c58ac6" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_db2d0ea722e16e0fe8ab3bce111" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_db2d0ea722e16e0fe8ab3bce111"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_33f20db82908f7685a5c0c58ac6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_b2f7b823a21562eeca20e72b006"`,
    );
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "payments"`);
  }
}

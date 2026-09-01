import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoucherFieldsToOrdersTable1788257208526 implements MigrationInterface {
    name = 'AddVoucherFieldsToOrdersTable1788257208526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "voucher_id" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "voucher_code" character varying(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "voucher_code"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "voucher_id"`);
    }

}

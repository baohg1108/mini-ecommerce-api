import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsageLimitPercentForVouchersTable1788238056976 implements MigrationInterface {
    name = 'AddUsageLimitPercentForVouchersTable1788238056976'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vouchers" ADD "usage_limit_per_user" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vouchers" DROP COLUMN "usage_limit_per_user"`);
    }

}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewCountToShops1788184019984 implements MigrationInterface {
  name = 'AddReviewCountToShops1788184019984';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shops" ADD "review_count" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "review_count"`);
  }
}

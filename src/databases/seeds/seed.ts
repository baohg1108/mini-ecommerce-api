import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AdminSeedService } from './admin.seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    await app.get(AdminSeedService).seed();
    console.log('Admin seed completed');
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

bootstrap();

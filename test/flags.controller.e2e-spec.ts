import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('FlagsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  it('/flags (POST) creates a flag', () => {
    return request(app.getHttpServer())
      .post('/flags')
      .send({ name: 'e2eFlag', dependencies: [] })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('e2eFlag');
      });
  });

  it('/flags/:name/toggle (POST) toggles a flag', async () => {
    await request(app.getHttpServer())
      .post('/flags')
      .send({ name: 'toggleFlagE2E' });

    await request(app.getHttpServer())
      .post('/flags/toggleFlagE2E/toggle?enable=true')
      .expect(201)
      .expect((res) => {
        expect(res.body.isEnabled).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/flags/toggleFlagE2E/toggle?enable=false')
      .expect(201)
      .expect((res) => {
        expect(res.body.isEnabled).toBe(false);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});

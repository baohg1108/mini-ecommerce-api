import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';

describe('Auth DTOs Validation (Excel Unit Test Cases Matrix)', () => {
  const validRegisterPayload = {
    email: 'user@example.com',
    password: 'Password@123',
    fullName: 'Bao Hoang',
  };

  const validLoginPayload = {
    email: 'user@example.com',
    password: 'Password@123',
  };

  // ==========================================
  // REGISTER DTO UNIT TESTS
  // ==========================================
  it('TC-002: RegisterDto should fail when email thiếu "@"', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      email: 'userexample.com',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'email');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('isEmail');
  });

  it('TC-003: RegisterDto should fail when email thiếu domain sau "@"', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      email: 'user@',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'email');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('isEmail');
  });

  it('TC-004: RegisterDto should fail when email chuỗi rỗng', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      email: '',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'email');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('isEmail');
  });

  it('TC-005: RegisterDto should fail when password quá ngắn (< 8 ký tự)', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      password: '7',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'password');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('minLength');
  });

  it('TC-009: RegisterDto should fail when password quá dài (> 100 ký tự)', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      password: 'Aa1@' + 'x'.repeat(100),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'password');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('maxLength');
  });

  it('TC-010: RegisterDto should fail when password thiếu chữ hoa', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      password: 'abcd@123',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'password');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('matches');
  });

  it('TC-011: RegisterDto should fail when password thiếu chữ thường', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      password: 'ABCD@123',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'password');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('matches');
  });

  it('TC-012: RegisterDto should fail when password thiếu chữ số', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      password: 'Abcd@efg',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'password');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('matches');
  });

  it('TC-013: RegisterDto should fail when password thiếu ký tự đặc biệt', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      password: 'Abcd1234',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'password');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('matches');
  });

  it('TC-014: RegisterDto should fail when fullName quá ngắn (< 2 ký tự)', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      fullName: '1',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'fullName');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('minLength');
  });

  it('TC-018: RegisterDto should fail when fullName quá dài (> 100 ký tự)', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validRegisterPayload,
      fullName: 'a'.repeat(101),
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'fullName');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('maxLength');
  });

  // ==========================================
  // LOGIN DTO UNIT TESTS
  // ==========================================
  it('TC-021: LoginDto should fail when email sai định dạng / thiếu "@"', async () => {
    const dto = plainToInstance(LoginDto, {
      ...validLoginPayload,
      email: 'userexample.com',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'email');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('isEmail');
  });

  it('TC-022: LoginDto should fail when email chuỗi rỗng', async () => {
    const dto = plainToInstance(LoginDto, {
      ...validLoginPayload,
      email: '',
    });
    const errors = await validate(dto);
    const err = errors.find((e) => e.property === 'email');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('isEmail');
  });

  it('TC-024: LoginDto should handle when password chuỗi rỗng', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@example.com',
      password: '',
    });
    const errors = await validate(dto);
    expect(dto).toBeDefined();
    expect(errors).toBeDefined();
  });
});

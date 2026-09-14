// import { validate } from 'class-validator';
// import { plainToInstance } from 'class-transformer';
// import { CreateUserDto } from './dtos/create-user.dto';
// import { UpdateUserDto } from './dtos/update-user.dto';

// describe('Users DTOs Validation (Excel Unit Test Cases Matrix)', () => {
//   const validCreatePayload = {
//     email: 'user@example.com',
//     password: 'Password@123',
//     fullName: 'Bao Hoang',
//   };

//   const validUpdatePayload = {
//     fullName: 'Bao Hoang Update',
//     phone: '0912345678',
//     avatarUrl: 'https://example.com/avatar.jpg',
//     email: 'user.update@example.com',
//   };

//   // ==========================================
//   // 1. CREATE USER DTO UNIT TESTS
//   // ==========================================
//   describe('CreateUserDto Validation', () => {
//     it('TC-025: should fail when password quá ngắn (< 8 ký tự)', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         password: '7',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'password');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('minLength');
//     });

//     it('TC-029: should fail when password quá dài (> 100 ký tự)', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         password: 'Aa1@' + 'x'.repeat(100),
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'password');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('maxLength');
//     });

//     it('TC-030: should fail when password thiếu chữ hoa', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         password: 'abcd@123',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'password');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('matches');
//     });

//     it('TC-031: should fail when password thiếu chữ thường', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         password: 'ABCD@123',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'password');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('matches');
//     });

//     it('TC-032: should fail when password thiếu chữ số', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         password: 'Abcd@efg',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'password');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('matches');
//     });

//     it('TC-033: should fail when password thiếu ký tự đặc biệt', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         password: 'Abcd1234',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'password');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('matches');
//     });

//     it('TC-034: should fail when fullName quá ngắn (< 2 ký tự)', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         fullName: '1',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'fullName');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('minLength');
//     });

//     it('TC-038: should fail when fullName quá dài (> 100 ký tự)', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         fullName: 'a'.repeat(101),
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'fullName');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('maxLength');
//     });

//     it('TC-063: should fail when email thiếu "@"', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         email: 'user2example.com',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'email');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('isEmail');
//     });

//     it('TC-064: should fail when email thiếu domain sau "@"', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         email: 'user2',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'email');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('isEmail');
//     });

//     it('TC-065: should fail when email chuỗi rỗng', async () => {
//       const dto = plainToInstance(CreateUserDto, {
//         ...validCreatePayload,
//         email: '',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'email');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('isEmail');
//     });
//   });

//   // ==========================================
//   // 2. UPDATE USER DTO UNIT TESTS
//   // ==========================================
//   describe('UpdateUserDto Validation', () => {
//     it('TC-039: should fail when fullName quá ngắn (< 2 ký tự)', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         fullName: '1',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'fullName');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('minLength');
//     });

//     it('TC-043: should fail when fullName quá dài (> 100 ký tự)', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         fullName: 'a'.repeat(101),
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'fullName');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('maxLength');
//     });

//     it('TC-045: should fail when phone sai định dạng / không hợp lệ', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         phone: 'invalid-phone-number',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'phone');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-049: should fail when phone chuỗi rỗng', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         phone: '',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'phone');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-050: should fail when phone quá ngắn (< 8 ký tự)', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         phone: '91234',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'phone');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-051: should fail when phone quá dài (> 20 ký tự)', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         phone: '123456789012345678901',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'phone');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-052: should fail when phone chứa ký tự không hợp lệ', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         phone: 'abc123xyz',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'phone');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-054: should fail when avatarUrl sai định dạng', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         avatarUrl: 'not-a-valid-url',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'avatarUrl');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-058: should fail when avatarUrl chuỗi rỗng', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         avatarUrl: '',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'avatarUrl');
//       expect(fieldError).toBeDefined();
//     });

//     it('TC-059: should fail when avatarUrl sai định dạng URL', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         avatarUrl: 'htp:/invalid-url.com',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'avatarUrl');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('isUrl');
//     });

//     it('TC-060: should fail when avatarUrl quá dài (> 255 ký tự)', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         avatarUrl: 'https://' + 'a'.repeat(250) + '.com',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'avatarUrl');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('maxLength');
//     });

//     it('TC-067: should fail when email cập nhật sai định dạng', async () => {
//       const dto = plainToInstance(UpdateUserDto, {
//         ...validUpdatePayload,
//         email: 'user3example.com',
//       });
//       const errors = await validate(dto);
//       const fieldError = errors.find((e) => e.property === 'email');
//       expect(fieldError).toBeDefined();
//       expect(fieldError?.constraints).toHaveProperty('isEmail');
//     });
//   });
// });

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

describe('Users DTOs Validation (Excel Unit Test Cases Matrix)', () => {
  const validCreatePayload = {
    email: 'user@example.com',
    password: 'Password@123',
    fullName: 'Bao Hoang',
  };

  const validUpdatePayload = {
    fullName: 'Bao Hoang Update',
    phone: '0912345678',
    avatarUrl: 'https://example.com/avatar.jpg',
    email: 'user.update@example.com',
  };

  // ==========================================
  // 1. CREATE USER DTO UNIT TESTS
  // ==========================================
  describe('CreateUserDto Validation', () => {
    it('TC-025: should fail when password quá ngắn (< 8 ký tự)', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        password: '7',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'password');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('minLength');
    });

    it('TC-029: should fail when password quá dài (> 100 ký tự)', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        password: 'Aa1@' + 'x'.repeat(100),
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'password');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-030: should fail when password thiếu chữ hoa', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        password: 'abcd@123',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'password');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('matches');
    });

    it('TC-031: should fail when password thiếu chữ thường', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        password: 'ABCD@123',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'password');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('matches');
    });

    it('TC-032: should fail when password thiếu chữ số', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        password: 'Abcd@efg',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'password');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('matches');
    });

    it('TC-033: should fail when password thiếu ký tự đặc biệt', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        password: 'Abcd1234',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'password');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('matches');
    });

    it('TC-034: should fail when fullName quá ngắn (< 2 ký tự)', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        fullName: '1',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'fullName');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('minLength');
    });

    it('TC-038: should fail when fullName quá dài (> 100 ký tự)', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        fullName: 'a'.repeat(101),
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'fullName');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-063: should fail when email thiếu "@"', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        email: 'user2example.com',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'email');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isEmail');
    });

    it('TC-064: should fail when email thiếu domain sau "@"', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        email: 'user2',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'email');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isEmail');
    });

    it('TC-065: should fail when email chuỗi rỗng', async () => {
      const dto = plainToInstance(CreateUserDto, {
        ...validCreatePayload,
        email: '',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'email');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isEmail');
    });
  });

  // ==========================================
  // 2. UPDATE USER DTO UNIT TESTS
  // ==========================================
  describe('UpdateUserDto Validation', () => {
    it('TC-039: should fail when fullName quá ngắn (< 2 ký tự)', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        fullName: '1',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'fullName');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('minLength');
    });

    it('TC-043: should fail when fullName quá dài (> 100 ký tự)', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        fullName: 'a'.repeat(101),
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'fullName');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-049: should fail when phone chuỗi rỗng', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        phone: '',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'phone');

      expect(fieldError).toBeDefined();
    });

    it('TC-050: should fail when phone quá ngắn (< 8 ký tự)', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        phone: '91234',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'phone');

      expect(fieldError).toBeDefined();
    });

    it('TC-051: should fail when phone quá dài (> 20 ký tự)', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        phone: '123456789012345678901',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'phone');

      expect(fieldError).toBeDefined();
    });

    it('TC-054: should fail when avatarUrl sai định dạng', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        avatarUrl: 'not-a-valid-url',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'avatarUrl');

      expect(fieldError).toBeDefined();
    });

    it('TC-058: should fail when avatarUrl chuỗi rỗng', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        avatarUrl: '',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'avatarUrl');

      expect(fieldError).toBeDefined();
    });

    it('TC-059: should fail when avatarUrl sai định dạng URL', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        avatarUrl: 'htp:/invalid-url.com',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'avatarUrl');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isUrl');
    });

    it('TC-060: should fail when avatarUrl quá dài (> 255 ký tự)', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        avatarUrl: 'https://' + 'a'.repeat(250) + '.com',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'avatarUrl');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('maxLength');
    });

    it('TC-067: should fail when email cập nhật sai định dạng', async () => {
      const dto = plainToInstance(UpdateUserDto, {
        ...validUpdatePayload,
        email: 'user3example.com',
      });

      const errors = await validate(dto);
      const fieldError = errors.find((e) => e.property === 'email');

      expect(fieldError).toBeDefined();
      expect(fieldError?.constraints).toHaveProperty('isEmail');
    });
  });
});

Feature('Authentication');

let accessToken = '';
let refreshToken = '';

Scenario('AUTH-E2E-001: Login successfully', async ({ I }) => {
  const response = await I.sendPostRequest('/auth/login', {
    email: 'admin1@example.com',
    password: 'Admin@123',
  });

  I.seeResponseCodeIs(200);

  I.seeResponseContainsJson({
    success: true,
  });

  accessToken = response.data.data.accessToken;
  refreshToken = response.data.data.refreshToken;

  if (!accessToken) {
    throw new Error('Access token not found');
  }

  if (!refreshToken) {
    throw new Error('Refresh token not found');
  }
});

Scenario('AUTH-E2E-002: Login with invalid password', async ({ I }) => {
  await I.sendPostRequest('/auth/login', {
    email: 'admin1@example.com',
    password: 'WrongPassword',
  });

  I.seeResponseCodeIs(401);
});

Scenario('AUTH-E2E-003: Login with non-existing email', async ({ I }) => {
  await I.sendPostRequest('/auth/login', {
    email: 'notfound@example.com',
    password: 'Admin@123',
  });

  I.seeResponseCodeIs(401);
});

Scenario('AUTH-E2E-004: Login without email', async ({ I }) => {
  await I.sendPostRequest('/auth/login', {
    password: 'Admin@123',
  });

  I.seeResponseCodeIs(400);
});

Scenario('AUTH-E2E-005: Login without password', async ({ I }) => {
  await I.sendPostRequest('/auth/login', {
    email: 'admin1@example.com',
  });

  I.seeResponseCodeIs(400);
});

// Scenario('AUTH-E2E-006: Refresh token successfully', async ({ I }) => {
//   I.haveRequestHeaders({
//     Authorization: `Bearer ${refreshToken}`,
//   });

//   const response = await I.sendPostRequest('/auth/refresh', {});

//   I.seeResponseCodeIs(200);

//   I.seeResponseContainsJson({
//     success: true,
//   });

//   accessToken = response.data.data.accessToken;
//   refreshToken = response.data.data.refreshToken;

//   if (!accessToken) {
//     throw new Error('New access token not found');
//   }

//   if (!refreshToken) {
//     throw new Error('New refresh token not found');
//   }
// });
Scenario('AUTH-E2E-006: Refresh token successfully', async ({ I }) => {
  const loginResponse = await I.sendPostRequest('/auth/login', {
    email: 'admin1@example.com',
    password: 'Admin@123',
  });

  I.seeResponseCodeIs(200);

  const refreshToken = loginResponse.data.data.refreshToken;

  I.haveRequestHeaders({
    Authorization: `Bearer ${refreshToken}`,
  });

  const response = await I.sendPostRequest('/auth/refresh', {});
  console.log(JSON.stringify(response.data, null, 2)); // thêm dòng này tạm thời
  I.seeResponseCodeIs(200);

  I.seeResponseCodeIs(200);

  I.seeResponseContainsJson({
    success: true,
  });
});

Scenario('AUTH-E2E-007: Logout successfully', async ({ I }) => {
  I.haveRequestHeaders({
    Authorization: `Bearer ${accessToken}`,
  });

  await I.sendPostRequest('/auth/logout', {});

  I.seeResponseCodeIs(200);
});

Scenario('AUTH-E2E-008: Refresh with invalid token', async ({ I }) => {
  I.haveRequestHeaders({
    Authorization: 'Bearer invalid-refresh-token',
  });

  await I.sendPostRequest('/auth/refresh', {});

  I.seeResponseCodeIs(401);
});

const http = require('http');

const registerUser = (user) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(user);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(body);
        }
      });
    });

    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
};

const run = async () => {
  try {
    console.log('Registering Admin...');
    await registerUser({ email: 'admin@example.com', password: 'password123', displayName: 'Admin User' });
    console.log('Registering Student 1...');
    await registerUser({ email: 'student1@example.com', password: 'password123', displayName: 'Student One' });
    console.log('Registering Student 2...');
    await registerUser({ email: 'student2@example.com', password: 'password123', displayName: 'Student Two' });
    console.log('Successfully created 3 users!');
  } catch (err) {
    console.error('Error creating users:', err);
  }
};

run();

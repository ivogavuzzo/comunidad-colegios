import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://comunidad-colegios-igavuzzo.aws-sa-east-1.turso.io',
  authToken:
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MDc0NDcsImlkIjoiMDFhMTFlMmEtMTAwMS03MjlmLWExMTktNGVkMDg1MWNiNzYzIiwia2lkIjoicXpWRVl6M1d5S2dIb29SOExjYk5XOG9sUWgxaUpxZy1qbV9TeE1objc4SSIsInJpZCI6IjhkNTYwNGY5LTM4ZTUtNGY2Ny1iZWQyLTExODk5YTEzODUwZiJ9.kUXA5IZ_6FLSCOVYKOW4X7XqhRAty7NInoL9jkiBJssDeeAQBcdja_TJ7iEVFPYnGHciMWQPqyK1x5fUmmdvBA',
});

async function main() {
  console.log('Testing Turso connection...');
  const rs = await client.execute('SELECT 1 as connected');
  console.log('Turso Connection OK:', rs.rows);
}

main().catch(console.error);

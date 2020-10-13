/** Tests for partialUpdate helper class.*/

process.env.NODE_ENV = 'test';

const partialUpdate = require('../../helpers/partialUpdate');

describe('partialUpdate()', () => {
  test('should generate a proper partial update query with just 1 field', function () {
    const sqlObj = partialUpdate('users', { username: 'admin' }, 'id', 5);

    expect(sqlObj).toEqual({
      query: 'UPDATE users SET username=$1 WHERE id=$2 RETURNING *',
      values: ['admin', 5],
    });
  });

  test('should generate a proper partial update query with multiple fields', function () {
    const sqlObj = partialUpdate(
      'users',
      { username: 'admin', email: 'a@b.cd', hat: true },
      'id',
      5
    );

    expect(sqlObj).toEqual({
      query:
        'UPDATE users SET username=$1, email=$2, hat=$3 WHERE id=$4 RETURNING *',
      values: ['admin', 'a@b.cd', true, 5],
    });
  });
});

const { success, error } = require('../../../src/libs/utils/response');

describe('response utils', () => {
  it('construye una respuesta exitosa', () => {
    const res = success({ foo: 'bar' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, data: { foo: 'bar' } });
  });

  it('construye una respuesta de error', () => {
    const res = error('algo falló', 400);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });
});

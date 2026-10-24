// Objetos res mínimos para probar controllers y middleware sin Express
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

module.exports = { mockRes };

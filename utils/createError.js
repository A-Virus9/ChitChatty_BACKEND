module.exports = (msg, code) => {
    const err = new Error(msg);
    err.statusCode = code;
    return err;
  };
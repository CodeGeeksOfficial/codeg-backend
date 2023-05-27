const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Codeg backend',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

module.exports = options;
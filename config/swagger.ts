const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Codeg backend',
      version: '1.0.0',
    },
  },
  apis: ['./routes/codeRouter.ts'], // Path to the API docs
};

export default options;
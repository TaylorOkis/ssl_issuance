class CustomAPIError extends Error {
  statusCode: any;
  constructor(message: string) {
    super(message);
  }
}

export default CustomAPIError;

import { Request } from "express";

interface Payload {
  id: string;
  name: string;
  email: string;
}

interface CustomRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export { Payload, CustomRequest };

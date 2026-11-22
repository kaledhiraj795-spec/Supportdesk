import type { RequestHandler } from "express";
import { InvalidCredentialsError, DuplicateEmailError, login, register } from "../services/auth.service";
import { loginSchema, registerSchema } from "../validators/auth.schema";

const validationDetails = (issues: Array<{ path: PropertyKey[]; message: string }>) =>
  issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message
  }));

export const registerUser: RequestHandler = async (req, res, next) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      data: null,
      error: {
        message: "Validation failed",
        details: validationDetails(validation.error.issues)
      },
      meta: null
    });
    return;
  }

  try {
    const user = await register(validation.data);
    res.status(201).json({ data: user, error: null, meta: null });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      res.status(409).json({
        data: null,
        error: { message: error.message },
        meta: null
      });
      return;
    }
    next(error);
  }
};

export const loginUser: RequestHandler = async (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      data: null,
      error: {
        message: "Validation failed",
        details: validationDetails(validation.error.issues)
      },
      meta: null
    });
    return;
  }

  try {
    const result = await login(validation.data.email, validation.data.password);
    res.status(200).json({ data: result, error: null, meta: null });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      res.status(401).json({
        data: null,
        error: { message: error.message },
        meta: null
      });
      return;
    }
    next(error);
  }
};

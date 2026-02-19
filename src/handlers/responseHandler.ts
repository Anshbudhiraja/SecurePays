import { Response } from "express";

export const responseHandler = (
  resp: Response,
  statusCode: number,
  message: string,
  status: "success" | "error" | "fail",
  data: any = null
): void => {
  resp.status(statusCode).json({ message, status, data });
};
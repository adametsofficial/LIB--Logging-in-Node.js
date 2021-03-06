import Logger, { LoggerConfig } from "../Logger"
import { Request, Response, NextFunction } from "express"
import express from "express"

interface RequestWithLogger extends Request {
  logger?: Logger
}

export default function ExpressLogger(config: LoggerConfig) {
  return (req: RequestWithLogger , res: Response, next: NextFunction) =>  {
    req.logger = new Logger(config)

    return next()
  }
}



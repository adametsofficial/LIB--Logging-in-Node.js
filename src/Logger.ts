import { Stats } from 'fs';
import path from 'path';
import fs from 'fs';

const puncture = `-----------------------------------------------------------------------------------`

type PathLike = string | Buffer 
export type LoggerConfig = {
  dir: PathLike
  singleFile: Boolean
  singleFileName: string
}
type TContent = string | Buffer | undefined; 
type ErrorCb = NodeJS.ErrnoException | null;

interface ILogger {
  get?: (
    path: PathLike, 
    callback: (error: ErrorCb, content: TContent) => void
    ) => void; 
  
  set?: (
    logCode: string,
    content: TContent, 
    callBack: (error: ErrorCb) => void
  ) => void
}


class Logger implements ILogger {
  private config: LoggerConfig;
  private date: Date = new Date();
  private instance: Logger = this;

  public readonly logType = LogTypes;

  /**
   *  If the path where the folder is not specified in the config
   *  file for writing logs, then it
   *  will automatically be created in the same directory
   *  in which it is declared.
   * 
   *  config.dir => __dirname
   * */
  public constructor(config: LoggerConfig = {dir: "", singleFile: false, singleFileName: ""}) {
    if (!config.dir.length) {
      throw SyntaxError("Directory not found or not specified")
    }

    this.config = config;

    if (this.config.singleFile) {
      if (!this.config.singleFileName.length) {
        throw SyntaxError("If you specified the singleFile parameter, then you must specify the singleFileName parameter")
      }
    }

    this.initialize();
  }

  public async get(fileName: PathLike, callBack: (error: ErrorCb, data: TContent) => void) {
    try {
      let doneRead = await this.read(fileName)

      callBack(null, doneRead)
    } catch (error) {
      callBack(error, undefined)
    }
    
    return this.instance
  }

  public async set(logType: string = "INFO", content: TContent, callBack?: (error: ErrorCb) => void) {
    if (!this.logType.hasOwnProperty(logType)) {
      const errorLogType = new TypeError("The logType argument was not found in LogTypes, please check the types in the documentation!")

      if (callBack) {
        callBack(errorLogType)
      }

      return errorLogType
    }

    if (!content) {
      if (callBack) {
        callBack(Error("Content not enterd"))
      }

      throw Error("Content not enterd")
    }

    const {singleFile, singleFileName} = this.config

    const logTypeToLow: string = !singleFile ? `${logType.toString().toLocaleLowerCase()}.log` : `${singleFileName}.log`

    const template = this.logTemplate(logType, content)
    let isExist;
    let updatedContent: string = template;
    let prevContent;

    try {
      isExist = await this.checkIsExist(logTypeToLow)
    } catch (error) {
      if (callBack) {
        callBack(error)
      }
      throw error
    }
     
    if (isExist) {
      try {
        prevContent = await this.read(!singleFile ? logType : singleFileName);
        updatedContent = prevContent + template
      } catch (error) {
        if (callBack) {
          callBack(error)
        }
        throw error
      }
    } 

    updatedContent = updatedContent.split(" ").join(" ");
    updatedContent = updatedContent.split("\n").join("") + "\n";
    updatedContent = updatedContent.split(puncture).join("\n"+puncture+"\n") + "\n"
    
    fs.writeFile(`${this.config.dir}\\${logTypeToLow}`, updatedContent, (err) => {
      if (err) {
        if (callBack) {
          callBack(err)
        }
        throw Error(err.toString())
      }
    });
    if (callBack) {
      callBack(null)
    }
    return this.instance
  }

  /**
   * Initialization func when Logger is declared 
   * */
  private async initialize() { 
    let isExist = await this.checkIsExist()
    
    if (!isExist) {
      let path = this.config.dir;

      fs.mkdir(path, (err) => {
        if (err) {
          throw err;
        }
      })
    }
  }

  /**
   * Method for read file
   * which return Promise where resolve return data:Budffer
   * */
  private async read(fileName: PathLike): Promise<TContent> {
    let pathToFile = `${this.config.dir}\\${fileName}.log`
    
    return new Promise((res, rej) => {
      fs.readFile(pathToFile, "utf-8", (error: ErrorCb, data: TContent) => {
        if (error) {
          rej(error)

          return 
        }

        res(data)
      })
    })
  }
 
  /**
   * (LogType) [(new Date.toUTCString())]: (Content) 
   * 
   * Example: 
   * ERROR [Thu, 19 Nov 2020 19:14:58 GMT]: Something went wrong with the database connection
   * */  
  private logTemplate (logTypes: string = "INFO", content: TContent) {
    return `${logTypes} [${this.date.toUTCString()}]: ${content}` + "\n" + puncture + "\n"
  } 

  /**
   * The checkIsExist function was created
   * to check the input directory for existence.
   * 
   * checkIsExist => If this.config.dir is exist return True else if does not exist return false
   * */ 
  private async checkIsExist(fileName?: string): Promise<boolean> {   
         
    return new Promise((res, rej) => {      
      fs.stat(fileName ? `${this.config.dir}\\${fileName}` : this.config.dir  , function (err: ErrorCb, stats: Stats) {
        if (err) {
          res(false)
          
          console.error(`The folder or file on the path was not found, so it was created.\n${!fileName ? err.path : err.path}`);
          return;  
        } 
        
        res(true)
      })
    })
  }    
} 

enum LogTypes {
  ERROR = "ERROR",
  INFO = "INFO",
  WARNING = "WARNING",
  DEBUG = "DEBUG",
  FATAL = "FATAL"
}

export default Logger;
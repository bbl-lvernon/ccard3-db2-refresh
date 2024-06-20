"use strict";

//const ibmdb =  require('ibm_db');
import * as ibmdb from 'ibm_db';
// import * as bblmainConfig from '../config/bblmain-ifx.datasource.json';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
// const dotenvExpand = require('dotenv-expand');
import { ApplicationLogger } from '../lib/logger';
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const logName = 'ccard3-refresh-log-%DATE%.txt';
const applicationLogger = new ApplicationLogger();
const logger = applicationLogger.instantiateLogger(logName); // Use the same instance for consistency

let connectionString: string;
let db: ibmdb.Database;

let bblmainConfig ={
  "name": `${process.env.NAME}`,
  "connector": `${process.env.CONNECTOR}`,
  "dsn": `${process.env.DSN}`,
  "host": `${process.env.HOST}`,
  "port": process.env.PORT,
  "user": `${process.env.USER}`,
  "password": `${process.env.PASSWORD}`,
  "database": `${process.env.DATABASE}`,
  "schema": `${process.env.SCHEMA}`
}

export class bbankDB2IFX {
    constructor() {
      // Initializaing connection to informix
      connectionString = `DATABASE=${bblmainConfig.database};HOSTNAME=${bblmainConfig.host};PORT=${bblmainConfig.port};UID=${bblmainConfig.user};PWD=${bblmainConfig.password}`;
    }
    
    async openConnection() {
      // opens a synchronous connection 
      let dbConnected: any;
      try{
        //logger.info('Connection String: ' + connectionString);
        db = ibmdb.openSync(connectionString);
        dbConnected = db.connected;
        //logger.info('Connection Opened... ');
      } catch(err){
        dbConnected = false;
        logger.error('There was an error opening the database connection: ' + err);
      }
      
      return dbConnected;
    }

    // execute regular query
    async executeQuery(sql: string) {
        try{
      let data: any;
      data = await db.query(sql);

      return data;
    }catch(err){'Error: ' + err;throw err;}
    }
    

    // Can be used for UPDATE, INSERT and DELETE. Returns the number of rows affected
    async executeNonQuery(sql: string): Promise<any> {
        try{
      let data: any;
      let statement = db.prepareSync(sql);
      // data = statement.executeNonQuerySync();
      data = await statement.executeNonQuery();

      return data;}catch(err){'Error: ' + err;throw err;}
    }
  
    // close this connection when finished...
    async closeConnection() {
      ibmdb.close(db);
      //logger.info('Informix Connection Closed...');
    } 

}
"use strict";

//const ibmdb =  require('ibm_db');
import * as ibmdb from 'ibm_db';
// import * as bblmainConfig from '../config/bblmain-ifx.datasource.json';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { ApplicationLogger } from '../lib/logger';
// const dotenvExpand = require('dotenv-expand');
const logName = 'ccard3-refresh-log-%DATE%.txt';
const applicationLogger = new ApplicationLogger();
const logger = applicationLogger.instantiateLogger(logName); // Use the same instance for consistency


const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

let connectionString: string;
let db: ibmdb.Database;

let bblmainConfig ={
  "name": `${process.env.db2name}`,
  "connector": `${process.env.db2connector}`,
  "dsn": `${process.env.db2dsn}`,
  "host": `${process.env.db2host}`,
  "port": process.env.db2port,
  "user": `${process.env.db2user}`,
  "password": `${process.env.db2password}`,
  "database": `${process.env.db2database}`,
  "schema": `${process.env.db2schema}`
}

export class bbankDB2 {
    constructor() {
      // Initializaing connection to informix
      connectionString = `DATABASE=${bblmainConfig.database};SCHEMA=${bblmainConfig.schema};HOSTNAME=${bblmainConfig.host};PORT=${bblmainConfig.port};UID=${bblmainConfig.user};PWD=${bblmainConfig.password}`;
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
        logger.error('There was an error opening the db2 database connection: ' + err);
      }
      
      return dbConnected;
    }

    // execute regular query
    async executeQuery(sql: string) {
      try{
        //logger.info('SQL to run'+sql);
      let data: any;
      data = await db.query(sql);

      return data;}catch(err){
        logger.error('Error' + err)
      }
    }

    // Can be used for UPDATE, INSERT and DELETE. Returns the number of rows affected
    async executeNonQuery(sql: string): Promise<boolean> {
      //logger.info('SQL to run'+sql);
      try{
      let data: any;
      let statement = db.prepareSync(sql);
      // data = statement.executeNonQuerySync();
      data = await statement.executeNonQuery();

      return data;}catch(err){
        //logger.info('SQL to run'+sql);
        throw err;
      }
    }
  
    // close this connection when finished...
    async closeConnection() {
      ibmdb.close(db);
      //logger.info('DB2 Connection Closed...');
    } 

    async execute(sql){try{
      await this.openConnection();
      await this.executeQuery(sql);}catch(err){
        logger.error('Error' + err)
      }
    }
}

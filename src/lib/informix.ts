"use strict";

//const ibmdb =  require('ibm_db');
import * as ibmdb from 'ibm_db';
// import * as bblmainConfig from '../config/bblmain-ifx.datasource.json';
import dotenv from 'dotenv';

 require('dotenv').config();

import * as winston from 'winston';
import { rejects } from 'node:assert';
const logger = winston.loggers.get('appLogger');

let connectionString: string;
let db: ibmdb.Database;
 

let bblmainConfig1 ={
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
      process.env.NAME='IFX';
      process.env.CONNECTOR='jdbc'
      let process.env.DSN='informix-sqli'
      let process.env.HOST='192.25.200.182'
      let process.env.PORT=1526
      let process.env.USER='informix'
      let process.env.PASSWORD='informix'
      let process.env.DATABASE='main_dev2'
      let process.env.SCHEMA=''
      // Initializaing connection to informix
      connectionString = `DATABASE=${bblmainConfig.database};HOSTNAME=${bblmainConfig.host};PORT=${bblmainConfig.port};UID=${bblmainConfig.user};PWD=${bblmainConfig.password}`;
    }
    
    async openConnection() {
      // opens a synchronous connection 
      let dbConnected: any;
      try{
        console.log('Connection String: ' + connectionString);
        db = ibmdb.openSync(connectionString);
        dbConnected = db.connected;
        logger.info('Connection Opened... ');
      } catch(err){
        dbConnected = false;
        logger.error('There was an error opening the infx database connection: ' + err);
        throw err;
      }
      
      return dbConnected;
    }

    // execute regular query
    async executeQuery(sql: string) {
      let data: any;
      data = await db.query(sql);

      return data;
    }

    // Can be used for UPDATE, INSERT and DELETE. Returns the number of rows affected
    async executeNonQuery(sql: string): Promise<any> {
      let data: any;
      let statement = db.prepareSync(sql);
      // data = statement.executeNonQuerySync();
      data = await statement.executeNonQuery();

      return data;
    }
  
    // close this connection when finished...
    async closeConnection() {
      ibmdb.close(db);
      console.log('Informix Connection Closed...');
    } 

    async execute(sql){try{
      await this.openConnection();
      await this.executeQuery(sql);}catch(err){
        logger.error('Error' + err)
      }
    }
  }

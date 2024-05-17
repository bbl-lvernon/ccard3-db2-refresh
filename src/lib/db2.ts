"use strict";

//const ibmdb =  require('ibm_db');
import * as ibmdb from 'ibm_db';
// import * as bblmainConfig from '../config/bblmain-ifx.datasource.json';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
// const dotenvExpand = require('dotenv-expand');
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

let connectionString: string;
let db: ibmdb.Database;

let bblmainConfig ={
  "name": `${process.env.DB2NAME}`,
  "connector": `${process.env.DB2CONNECTOR}`,
  "host": `${process.env.DB2HOST}`,
  "port": process.env.DB2PORT,
  "user": `${process.env.DB2USER}`,
  "password": `${process.env.DB2PASSWORD}`,
  "database": `${process.env.DB2DATABASE}`,
  "schema": `${process.env.DB2SCHEMA}`
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
        // console.log('Connection String: ' + connectionString);
        db = ibmdb.openSync(connectionString);
        dbConnected = db.connected;
        console.log('Connection Opened... ');
      } catch(err){
        dbConnected = false;
        console.log('There was an error opening the database connection: ' + err);
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
      console.log('DB2 Connection Closed...');
    } 

}

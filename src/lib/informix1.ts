"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const informix = require("ibm_db");
require('dotenv-safe').config();
export class Informix {
    connectionString: string = ``;
    constructor() {
        // We are getting the connection string from the db2 datasource
        this.connectionString = `DATABASE=main_dev2;PROTOCOL=SOCKETS;HOSTNAME=${process.env.HOST};PORT=9503;UID=${process.env.USER};PWD=${process.env.PASSWORD}`;
        console.log('this.connectionString' + this.connectionString);
    }
    // tslint:disable-next-line:no-any
    async executeQuery(sqlQuery: string, params?: any) {
        // tslint:disable-next-line:no-any
        return new Promise((resolve, reject) => {
            this.openConnection(this.connectionString).then((informixConn: any) => {
                informixConn.query(sqlQuery, params).then((resp: unknown) => { resolve(resp); }, (err: any) => { reject(err); });
            }, err => { console.log('err:'+err );throw(err); });
        });
    }
    async openConnection(connectionString: string) {
        return new Promise((resolve, reject) => {
            //We are defining a variable that contains the call back functionality
            const callback = (err: any, db: unknown) => {
                if (err) {
                  console.log('err:'+err );throw(err);
                  reject(err);
                }
                else {
                    resolve(db);
                }
            };
            informix.open(connectionString, callback.bind(this));
        });
    }
}
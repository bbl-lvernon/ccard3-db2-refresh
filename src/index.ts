// CT2A Reader Apllication

// imports
import dayjs from 'dayjs';
import * as lineReader from 'line-reader';
import * as fs from 'node:fs';
import * as winston from 'winston';
import { ApplicationLogger } from './lib/logger';
import { bbankDB2IFX } from "./lib/informix";
import { bbankDB2 } from "./lib/db2";
import { exit } from 'process';

const logName = 'cta2Upated-%DATE%.log';
const applicationLogger = new ApplicationLogger();
applicationLogger.instantiateLogger(logName); 
const logger = winston.loggers.get('appLogger');

const dailyFilePath = `./input/CTA2-${dayjs().format('YYYY-MM-DD')}.txt`;
const cta2InsertSQLs = `./output/CTA2DBInsertSQLs-${dayjs().format('YYYY-MM-DD')}.txt`;
const cta2UpdateSQLs = `./output/CTA2DBUpdateSQLs-${dayjs().format('YYYY-MM-DD')}.txt`;

const ifxDB = new bbankDB2IFX();
const db2 = new bbankDB2();



class ccard3Refresher{
  private SQL : string;

  constructor() {}

  // main method - starting point
  async main() {
    try{
    logger.info('CCARD3 DB2 REFRESHER APPLICATION - STARTED - ' + dayjs().format('YYYY-MM-DD'));
    logger.info(`Obtaining past month's cards from Informix...`);
    let cards = await this.getCards();
    logger.info(`Success - Got past month's cards from Informix... `);
    logger.info(`Obtaining past month's cards from FBE DB...`);
    let db2Cards = await this.getDb2Cards();
    logger.info(`Success - Got past month's cards from FBE DB2...`);  
    logger.info(`Refreshing FBE DB2 with new card info...`);  
    let cardsUpdated = await this.refreshDb2(cards , db2Cards);    
    logger.info(`Success - FBE DB2 has been updated. ${cardsUpdated} RECORDS UPDATED. Exiting...`);
  } catch(err){
    logger.error(`!Error occurred while processing runtime! ` + err);
    throw err;
}  
    
  }

  // grabs new informix records within a timeframe and compares to DB2 to find missing records... 
  // will then update DB2 with a copy of the missing/new informix records
  // once first step is complete will compare informix to DB2 to find records that have been removed... 
  async getCards() {
    let oneMth = dayjs().subtract(1, 'month').format('YYYYMMDDHHmmss');
    const timeStamp = oneMth + '00';
    //get all cards <= 1 month old (INFORMIX)
    //const sql = `select * from ccard3 where tmstamp > ${+timeStamp}`;
    const sql = `sql select * from ccard3 where recordstamp >= 2024050802043930`;
    let cards = await ifxDB.execute(sql);
    logger.info('cards from infomix =' + JSON.stringify(cards));
    await ifxDB.closeConnection();
    return cards;
  }

  async getDb2Cards() {
    //get all cards (FBE DB2)
    const sql = `select * from blb.BBL_CCARD3;`;
    let db2Cards = await db2.executeQuery(sql);
    logger.info('cards from infomix =' + JSON.stringify(db2Cards));
    await db2.closeConnection();
    return db2Cards;
  }

  async refreshDb2(ifxCards, db2Cards){
    await this.addMissing(ifxCards);
    //await this.updateRecords();
}
    //try{

    // backup of Informix records found... 
    //if(ifxRes){
    //   if(Object.keys(ifxRes).length > 0) {
    //     console.log('Informix Records found... ' + ifxRes.length);

    //     let header = true;
    //     let headerVal = 'nrcli|ccardtype|ccardno|corolcta|tmstamp|cotiuniorgcard|couniorgcard|'
    //           + 'coprodcard|cosbpcard|nrctacard|txnombcard|abnomcard';

    //     logger.log('info',`Creating Informix CTA2 Backup... `);
    //     for (const ifxRecord of ifxRes){
    //       if (header) {
    //         fs.appendFileSync(dailyFilePath,  `${headerVal}\n`);
    //           header = false;
    //       }
    //       let printRec = ifxRecord.nrcli + '|' + ifxRecord.ccardtype + '|' + ifxRecord.ccardno +
    //       '|' + ifxRecord.corolcta + '|' + ifxRecord.tmstamp + '|' + ifxRecord.cotiuniorgcard + '|' +
    //       ifxRecord.couniorgcard + '|' + ifxRecord.coprodcard + '|' + ifxRecord.cosbpcard + '|' + 
    //       ifxRecord.nrctacard + '|' + ifxRecord.txnombcard + '|' + ifxRecord.abnomcard + '\n';

    //       fs.appendFileSync(dailyFilePath, printRec);
       // }

    async addMissing(ifxCards){
        logger.info('ADDING MISSING CARDS...');

        // compare DB2 records to informix, if the record is not found in DB2 then it must be added... 
        let count = 0;          
        let updateArray = [];

        for (const card of ifxCards){
          logger.info('card:' + JSON.stringify(card));
          logger.info('ifxCards:' + JSON.stringify(ifxCards));
          logger.log('info',`Informix Count: ${Object.keys(ifxCards).length }`);
          
          const sqlDB2Compare = `SELECT * FROM BLB.BBL_CCARD3 where CCARDNO = ${card.ccardno};`;
          let db2Res = await db2.executeQuery(sqlDB2Compare);

          try{
            db2Res;
          }catch(err){
            logger.log('info',`Error getting DB2 records... ` + err);
          };

          if(db2Res){              // ifx record does not exists in DB2 so add to array to do the Insert... 
            if (Object.keys(db2Res).length < 1){

              let insertCardSql = this.insertMissing(card);
              db2.executeQuery(JSON.stringify(insertCardSql));

              //insertArray.push(sqlRec);
              count++;
              return
              //for (const newRow of insertArray){;}
            } else { // ifx record does exist in DB2 so now to compare/update...
              //check important fields
              logger.info(`card.ccardgroupcode == db2Res.ccardgroupcode || card.ccardprofile == db2Res.ccardprofile || card.ccardstatus == db2Res.ccardstatus ` + card.ccardgroupcode + db2Res.ccardgroupcode + card.ccardprofile + db2Res.ccardprofile + card.ccardstatus + db2Res.ccardstatus);
              if(card.ccardgroupcode == db2Res.ccardgroupcode || card.ccardprofile == db2Res.ccardprofile || card.ccardstatus == db2Res.ccardstatus){
                //replace entire row
                let updateSql = await this.insertMissing(card);
                await db2.executeQuery(updateSql);

              }
              count++;
              return;
            }
          }
        }
      }

      //       }
        
      //       logger.log('info',`Total Informix Records compared: ${Object.keys(ifxCards).length}, Total Records to update: ${count}`);
         
      //       // update FBE with missing records... 
      //       logger.log('info',`Update FBE CTA2`);
      //       for (const insDB2 of recToInsert){
      //         // console.log(insDB2);
              
      //         let sqlLog = insDB2 + '\n';
      //         fs.appendFileSync(cta2InsertSQLs, sqlLog);
        
      //         let results: any;
        
      //         await db2.executeNonQuery(insDB2).then(res => {
      //           results = res;
      //         }).catch( async err => {
      //           logger.log('info',`Error Inserting the following Record into DB2: ${insDB2.split('VALUES')[1]}`);
      //           logger.log('info',`${err}`);
      //         });
        
      //         if (results){
      //           if(results >= 1){
      //             logger.log('info',`Record inserted succesfully: ${insDB2.split('VALUES')[1]}`);
      //           }
      //         } else {
      //           logger.log('info',`Failed to create log record no rows inserted: ${results}`);
      //         }
        
      //       }
        
      //       logger.log('info',`Finished inserting new records into DB2...`);
      //     }
      //   }
      // }

  //  async updateRecords(ifxCards){
  //             logger.info('CARD EXISTS ON DB2 BUT IS OUTDATED. UPDATING..');
  //             // perform and update on all other records... compare the status for both records if there is a difference then do an Update
  //             if (ifxCards.status !== ifxCards[0].STATUS || ifxCards.corolcta !== ifxCards[0].COROLCTA){

  //               const updateDB2Stats = `UPDATE BLB.BBL_CTA2 SET COROLCTA = '${ifx.corolcta}', STATUS = ${ifx.status}, DATEREMOVED = ${ifx.dateremoved} WHERE NRCLI = '${ifx.nrcli}' AND CCARDTYPE = '${ifx.ccardtype}' AND CCARDNO = ${ifx.ccardno};`;

  //               let results: any;

  //               await db2.executeNonQuery(updateDB2Stats).then(res => {
  //                 results = res;
  //               }).catch( async err => {
  //                 logger.log('info',`Error Updating the following Record into DB2 -> Nrcli: ${ifx.nrcli} CCardno: ${ifx.ccardno}`);
  //                 logger.log('info',`${err}`);
  //               });

  //               if (results){
  //                 if(results >= 1){
  //                   logger.log('info',`Record updated succesfully -> Nrcli: ${ifx.nrcli} CCardno: ${ifx.ccardno}`);
  //                 }
  //               } else {
  //                 logger.log('info',`No rows affected: ${results} Record either does not exist or a status has already been set -> Details, Nrcli: ${ifx.nrcli} CCardno: ${ifx.ccardno}`);
  //               }

  //               let sqlLog = updateDB2Stats + '\n';
  //               fs.appendFileSync(cta2UpdateSQLs, sqlLog);
  //             }
              

  //           }

          
          
         // END IF
     // }
    

  // async DB2CompareToIFXStats() {

  //   const oneMonth = dayjs().subtract(1, 'month').format('YYYYMMDD');
  //   const ifxStatSQL = `Select * from cta2 where dateremoved > ${+oneMonth};`;

  //   let ifxRmv: any;  // informix dataset
  //   logger.log('info',`Getting Data from Informix.............`);

  //   logger.log('info',`${ifxStatSQL}`);
  //   await ifxDB.executeQuery(ifxStatSQL).then(res => {
  //     ifxRmv = res;
  //     logger.log('info',`Query Executed Succesfully.`);
  //   }).catch(err => {
  //     logger.log('info',`There was an error executing the statement.`);
  //     logger.log('info',`${err}`);
  //   });

  //   if (ifxRmv){
  //     if(Object.keys(ifxRmv).length > 0) {
  //       logger.log('info',`Number of records found: ${Object.keys(ifxRmv).length}`);

  //       // compare ifx stat 9 records to matching DB2 records and update DB2 status accordingly
  //       for (const rec of ifxRmv){
  //         const updateDB2Stats = `UPDATE BLB.BBL_CTA2 SET STATUS = ${rec.status}, DATEREMOVED = ${rec.dateremoved} WHERE NRCLI = '${rec.nrcli}' AND CCARDTYPE = '${rec.ccardtype}' AND CCARDNO = ${rec.ccardno};`;

  //         let results: any;

  //         await db2.executeNonQuery(updateDB2Stats).then(res => {
  //           results = res;
  //         }).catch( async err => {
  //           logger.log('info',`Error Updating the following Record into DB2 -> Nrcli: ${rec.nrcli} CCardno: ${rec.ccardno}`);
  //           logger.log('info',`${err}`);
  //         });

  //         if (results){
  //           if(results >= 1){
  //             logger.log('info',`Record updated succesfully -> Nrcli: ${rec.nrcli} CCardno: ${rec.ccardno}`);
  //           }
  //         } else {
  //           logger.log('info',`No rows affected: ${results} Record either does not exist or a status has already been set -> Details, Nrcli: ${rec.nrcli} CCardno: ${rec.ccardno}`);
  //         }

  //         let sqlLog = updateDB2Stats + '\n';
  //         fs.appendFileSync(cta2UpdateSQLs, sqlLog);

  //      } // END 

  //     } else {
  //       logger.log('info', `No records returned...`);
  //     }

  //   } // END

  //   logger.log('info',`Finished updating records in DB2...`);

  // }

  async insertMissing(ifxRecord: any){

    let CCARDNO = ifxRecord.ccardno;
    let CCARDNAMEADDR = ifxRecord.ccardnameaddr;
    let CCARD4DIGITS = ifxRecord.ccard4digits; 
    let CCARDGROUPCODE = ifxRecord.ccardgroupcode;
    let CCARDBRAND = ifxRecord.ccardbrand;
    let REPLACEDCARDNUMBER = ifxRecord.replacedcardnumber;
    let REPLACEDDT = ifxRecord.replaceddt;
    let CCARDPROFILE = ifxRecord.ccardprofile;
    let CCARDSTATUS = ifxRecord.ccardstatus;
    let ACCTBCH = ifxRecord.acctbch;
    let CCARDNOPASTDUE1 = this.sanitizeString(ifxRecord.ccardnopastdue1); 
    let INSURANCE = this.sanitizeString(ifxRecord.insurance);
    let PLASTICTYPE = ifxRecord.plastictype;
    let CCARDNOPASTDUE2 = ifxRecord.ccardnopastdue2;
    let ONLINELINKFLAG = ifxRecord.onlinelinkflag;
    let CCARDYEAR3 = ifxRecord.ccardyear3;
    let CCARDNOPASTDUE3 = ifxRecord.ccardnopastdue3;
    let CCARDNOPASTDUE3QTY = ifxRecord.ccardnopastdue3qty;
    let CCARDCREDITLIMIT = ifxRecord.ccardcreditlimit;
    let CCARDEXPDATE = ifxRecord.ccardexpdate;
    let RECORDSTAMP = ifxRecord.recordstamp;
    let CCARDACCNUM = ifxRecord.ccardaccnum;
    


    let SQL = `INSERT INTO BLB.BBL_CCARD3 (CCARDNO, CCARDNAMEADDR, CCARD4DIGITS, CCARDGROUPCODE, CCARDBRAND, REPLACEDCARDNUMBER, REPLACEDDT, CCARDPROFILE, CCARDSTATUS, ACCTBCH, CCARDNOPASTDUE1,
      INSURANCE, PLASTICTYPE, CCARDNOPASTDUE2, ONLINELINKFLAG, CCARDYEAR3, CCARDNOPASTDUE3, CCARDNOPASTDUE3QTY, CCARDCREDITLIMIT, CCARDEXPDATE, RECORDSTAMP, CCARDACCNUM) VALUES (
     '${CCARDNO}', '${CCARDNAMEADDR}', '${CCARD4DIGITS}', '${CCARDGROUPCODE}', '${CCARDBRAND}', '${REPLACEDCARDNUMBER}', '${REPLACEDDT}', '${CCARDPROFILE}', '${CCARDSTATUS}', '${ACCTBCH}', '${CCARDNOPASTDUE1}',
     '${INSURANCE}', '${PLASTICTYPE}', '${CCARDNOPASTDUE2}', '${ONLINELINKFLAG}', '${CCARDYEAR3}', '${CCARDNOPASTDUE3}', '${CCARDNOPASTDUE3QTY}', '${CCARDCREDITLIMIT}', '${CCARDEXPDATE}', '${RECORDSTAMP}', '${CCARDACCNUM}')`;

     
    // console.log(SQL);

    return SQL;

  }


  async sanitizeString(str: string) {
    return str.replace(/['"]/g, '');
  }

}

let startApp = new ccard3Refresher();
startApp.main();


// CT2A Reader Apllication

// imports
import dayjs from 'dayjs';

import { ApplicationLogger } from './lib/logger';
import { bbankDB2IFX } from "./lib/informix";
import { bbankDB2 } from "./lib/db2";
import { exit } from 'process';

const logName = 'ccard3RefreshLog-%DATE%.log';
const applicationLogger = new ApplicationLogger();
const logger = applicationLogger.instantiateLogger(logName); // Use the same instance for consistency

const ifxDB = new bbankDB2IFX();
const db2 = new bbankDB2();

class ccard3Refresher{
  private SQL : string;
  private db2Res: any[]
  private recordsUpdated = 0;
  constructor() {}
  // main method - starting point
  async main() {
    try{
    logger.info('CCARD3 DB2 REFRESHER APPLICATION - STARTED - ' + dayjs().format('YYYY-MM-DD'));
    let db2Conn = await db2.openConnection();;
    let IFXConn = await ifxDB.openConnection();
    if(!db2Conn){
      logger.log('info','No DB2 Database Connection Established, Exiting...');
      exit(0);
    }

    if(!IFXConn){
      logger.log('info','No IFX Database Connection Established, Exiting...');
      exit(0);
    }
    logger.info(`Obtaining past month's cards from Informix...`);
    let cards = await this.getCards(); 
    logger.info(`Refreshing FBE DB2 with new card info...`);  
    await this.refresh(cards);    
    logger.info(`Success - FBE DB2 has been updated.`);
    await ifxDB.closeConnection();
    await db2.closeConnection();
  } catch(err){
    logger.error(`!Error occurred while processing runtime! ` + err);
    throw err;
}      
  }
  async getCards() {
    try{
    let oneMth = dayjs().subtract(1, 'month').format('YYYYMMDDHHmmss');
    const timeStamp = oneMth + '00';
    //get all cards <= 1 month old (INFORMIX)
    const sql = `SELECT * FROM CCARD3 WHERE RECORDSTAMP > ${+timeStamp}`;
    let cards: any[] = await ifxDB.executeQuery(sql);
    //logger.info('cards from infomix =' + JSON.stringify(cards));
    logger.info('SUCCESS, RETRIEVED ' +JSON.stringify(cards.length)+ ' CARDS FROM INFOMIX ') ; 
    return cards;
    }catch(err){
      logger.info('Unable to get cards from infomix: ' + err);
    throw err;}
  
  }

    async refresh(ifxCards){
        logger.info('ADDING MISSING CARDS...');

        // compare DB2 records to informix, if the record is not found in DB2 then it must be added...  
        let insertCount = 0;
        let updateCount = 0;
        let skipCount = 0;

        for (const card of ifxCards){   

//every 5 display a log
let processed = (insertCount + updateCount + skipCount);
(processed % 100 === 0) && logger.info(`Records processed: ${processed}`);   

          const sqlDB2Compare = `SELECT * FROM BLB.BBL_CCARD3 WHERE CCARDNO = ${card.ccardno};`;
          let db2Res = await db2.executeQuery(sqlDB2Compare);
          if(!db2Res){
            logger.info(`Error getting DB2 records... `);
            return;
          }
          //logger.info(JSON.stringify(db2Res.length)+ ' matching card(s) found in db2');
          if(db2Res.length == 0){
            //logger.info(`card# ${card.ccardno}not in DB2 yet, inserting...`);
            await this.insert(card);
            insertCount++;
            logger.info(`Inserted card# ${card.ccardno}`);
          }else if(db2Res.length == 1){ 
              // ifx record does exist in DB2 so now to compare/update...
              //check important fields
              const db2Record = db2Res[0]; 
        
              //Making comparisons
              let groupcode = (card.ccardgroupcode !== db2Record.CCARDGROUPCODE);
              let profile = (card.ccardprofile !== db2Record.CCARDPROFILE);
              let status = (card.ccardstatus !== db2Record.CCARDSTATUS) ;
              let recstamp = (card.recordstamp !== db2Record.RECORDSTAMP);

              if(groupcode ||  profile ||   status ||  recstamp){
                //replace entire row
                //logger.info(`Card ending  ${card.ccardno} needs an update.`);
                try{
                  await this.update(card);
                  updateCount++;
                  logger.info(`Updated card# ${card.ccardno}`);
                }catch(err) {
                   logger.error(`Error updating card# ${card.ccardno}: ${err}`);
                   throw err;
                }
              }
              else{
               skipCount++;
               //logger.info(`Card  ${card.ccardno} doesn't need updating.`);
              };


            }
       }      logger.info(`${updateCount} RECORDS TOTAL UPDATED.`);
              logger.info(`${insertCount} RECORDS TOTAL INSERTED.`);
              logger.info(`${skipCount} RECORDS TOTAL SKIPPED.`);
    }

  async update(ifxRecord){
    try{
    let CCARDNO = ifxRecord.ccardno;
    let CCARDNAMEADDR = await this.sanitizeString(ifxRecord.ccardnameaddr);
    let CCARD4DIGITS = ifxRecord.ccard4digits; 
    let CCARDGROUPCODE = ifxRecord.ccardgroupcode;
    let CCARDBRAND = ifxRecord.ccardbrand;
    let REPLACEDCARDNUMBER = ifxRecord.replacedcardnumber;
    let REPLACEDDT = await this.sanitizeDateForDB2(ifxRecord.replaceddt); 
    let CCARDPROFILE = ifxRecord.ccardprofile;
    let CCARDSTATUS = ifxRecord.ccardstatus;
    let ACCTBCH = ifxRecord.acctbch;
    let CCARDNOPASTDUE1 = ifxRecord.ccardnopastdue1; 
    let INSURANCE = ifxRecord.insurance;
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
    

    let SQL = `UPDATE BLB.BBL_CCARD3 SET CCARDNAMEADDR = '${
      CCARDNAMEADDR}', CCARD4DIGITS = ${
      CCARD4DIGITS}, CCARDGROUPCODE = ${
      CCARDGROUPCODE}, CCARDBRAND = '${
      CCARDBRAND}', REPLACEDCARDNUMBER = ${
      REPLACEDCARDNUMBER}, REPLACEDDT = '${
      REPLACEDDT}', CCARDPROFILE = ${
      CCARDPROFILE}, CCARDSTATUS = ${
      CCARDSTATUS}, ACCTBCH = ${
      ACCTBCH}, CCARDNOPASTDUE1 = ${
      CCARDNOPASTDUE1}, INSURANCE = ${
      INSURANCE}, PLASTICTYPE = ${
      PLASTICTYPE}, CCARDNOPASTDUE2 = ${
      CCARDNOPASTDUE2}, ONLINELINKFLAG = ${
      ONLINELINKFLAG}, CCARDYEAR3 = ${
      CCARDYEAR3}, CCARDNOPASTDUE3 = ${
      CCARDNOPASTDUE3}, CCARDNOPASTDUE3QTY = ${
      CCARDNOPASTDUE3QTY}, CCARDCREDITLIMIT = ${
      CCARDCREDITLIMIT}, CCARDEXPDATE = ${
      CCARDEXPDATE}, RECORDSTAMP = ${
      RECORDSTAMP}, CCARDACCNUM = ${
      CCARDACCNUM} WHERE CCARDNO = ${
      CCARDNO}`;

    await db2.executeNonQuery(SQL);
        return;
    }catch(err){
      logger.error(err+ 'Error overwriting new record.' + JSON.stringify(ifxRecord));
      throw err;}
    }
    

async insert(ifxRecord): Promise<string>{
  //logger.info('await this.sanitizeDateForDB2(ifxRecord.replaceddt);' + await this.sanitizeDateForDB2(ifxRecord.replaceddt));
  try{
  let CCARDNO = ifxRecord.ccardno;
  let CCARDNAMEADDR = await this.sanitizeString(ifxRecord.ccardnameaddr);
  let CCARD4DIGITS = await this.sanitizeString(ifxRecord.ccard4digits); 
  let CCARDGROUPCODE = ifxRecord.ccardgroupcode;
  let CCARDBRAND = ifxRecord.ccardbrand;
  let REPLACEDCARDNUMBER = ifxRecord.replacedcardnumber;
  let REPLACEDDT = await this.sanitizeDateForDB2(ifxRecord.replaceddt);
  let CCARDPROFILE = ifxRecord.ccardprofile;
  let CCARDSTATUS = ifxRecord.ccardstatus;
  let ACCTBCH = ifxRecord.acctbch;
  let CCARDNOPASTDUE1 = ifxRecord.ccardnopastdue1; 
  let INSURANCE = ifxRecord.insurance;
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

  let SQL = `INSERT INTO BLB.BBL_CCARD3 (
    CCARDNO, CCARDNAMEADDR, CCARD4DIGITS, CCARDGROUPCODE, CCARDBRAND, REPLACEDCARDNUMBER, REPLACEDDT, CCARDPROFILE, CCARDSTATUS, ACCTBCH, 
    CCARDNOPASTDUE1, INSURANCE, PLASTICTYPE, CCARDNOPASTDUE2, ONLINELINKFLAG, CCARDYEAR3, CCARDNOPASTDUE3, CCARDNOPASTDUE3QTY, 
    CCARDCREDITLIMIT, CCARDEXPDATE, RECORDSTAMP, CCARDACCNUM
  ) VALUES (
    ${CCARDNO}, '${
    CCARDNAMEADDR}', ${
    CCARD4DIGITS}, ${
    CCARDGROUPCODE}, '${
    CCARDBRAND}', ${
    REPLACEDCARDNUMBER}, '${
    REPLACEDDT}', ${
    CCARDPROFILE}, ${
    CCARDSTATUS}, ${
    ACCTBCH}, ${
    CCARDNOPASTDUE1}, ${
    INSURANCE}, ${
    PLASTICTYPE}, ${
    CCARDNOPASTDUE2}, ${
    ONLINELINKFLAG}, ${
    CCARDYEAR3}, ${
    CCARDNOPASTDUE3}, ${
    CCARDNOPASTDUE3QTY}, ${
    CCARDCREDITLIMIT}, ${
    CCARDEXPDATE}, ${
    RECORDSTAMP}, ${
    CCARDACCNUM})`;

  await db2.executeNonQuery(SQL);
  return;

  }catch(err){
    logger.error(err+ 'Error overwriting new record.' + JSON.stringify(ifxRecord));
    throw err;}
}

//coercing date and string values for db2
async sanitizeDateForDB2(dateString): Promise<string> {
  if (dateString == 0) {
    return '1969-12-31';
  } else
   //if (/^\d{8}$/.test(dateString)) 
   {
    dateString = dateString.toString();

    // If the dateString is in YYYYMMDD format, convert it to YYYY-MM-DD
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
}

async sanitizeString(str : any) {
  str = str.toString();
  return str.replace(/["']/g, '');
}

}

let startApp = new ccard3Refresher();
startApp.main();

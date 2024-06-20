<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/BelizeBankLimited/ccard3-db2-refresh">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">BBL_CCARD3  REFRESHER</h3>

  <p align="center">
    A Node JS program, to extract new or updated cards in the informix ccadr3 table and add that information to the db2 ccard3 table.
  </p>
</p>



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#files">Files</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
### About The Project

This program is written in TypeScript and uses NodeJS.

What does it do?

* Open DB connections
* Retrieve last month's cards managed by informix.
* Compares following fields each card from INFORMIX CCAARD3 to records in FBE BBL_CCARD3
  CCARDGROUPCODE, CCARDPROFILE, 
  CCARDSTATUS, RECORDSTAMP
* Updates or insert depending on if the card is already in FBE BBL_CCARD3
* Writes a basic log.


### Files

* Log file => /ccard3-db2-refresh/logs

<!-- GETTING STARTED -->
### Getting Started / Prerequisites

This is an example of how you may setup your project locally.
To get a local copy up and running follow these simple example steps.

* npm (skip if Node 10+ already installed on server/machine)
  ```sh
  npm install npm@latest -g
  ```


### Installation

1. Clone the repo to a server with NodeJS 10+ installed && access to a DB2 database (FBE dev/regression/production)
   ```sh
   git clone https://github.com/BelizeBankLimited/ccard3-db2-refresh.git
   ```
2. Install NPM packages 
   ```sh
   npm install
   ```
3. Start the app
   ```sh
   npm start
   ```
This app can also be run with the batch.bat script located in root directory.


   Note:
   Ensure your machine has proper firewall configuration to access Database contents and ability to make changes to your filesystem.



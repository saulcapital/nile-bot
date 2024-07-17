// import * as dotenv from "dotenv";
// dotenv.config({ path: __dirname + "/.env" });
// import {Pool as PgPool} from "pg";
//
// async function main() {
//   console.log('backfilling positions');
//   const pool = new PgPool({
//     user: process.env.POSTGRES_USER,
//     host: process.env.POSTGRES_HOST,
//     database: process.env.POSTGRES_DB,
//     password: process.env.POSTGRES_PASSWORD,
//     port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 25060,
//     // if connecting to local database, do NOT enable SSL. Otherwise, do enable SSL.
//     ssl: process.env.LOCAL_DB ? undefined : { rejectUnauthorized: false },
//     max: 10, // max number of clients in the pool
//   });
//   const result = await pool.query(
//     `SELECT position_id, in_range, exchange FROM positions WHERE burned IS FALSE`,
//     [tgId]
//   );
//   return result.rows;
// }
//
// main()
//   .then(() => {
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.error(err); // Writes to stderr
//     process.exit(1);
//   });
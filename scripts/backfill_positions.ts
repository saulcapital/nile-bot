import * as dotenv from "dotenv";
dotenv.config();
import {Pool as PgPool} from "pg";

async function main() {
  console.log(__dirname + "/.env");
  console.log('process.env.POSTGRES_PORT', process.env.POSTGRES_PORT)
  const pool = new PgPool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 25060,
    // if connecting to local database, do NOT enable SSL. Otherwise, do enable SSL.
    ssl: process.env.LOCAL_DB ? undefined : { rejectUnauthorized: false },
    max: 10, // max number of clients in the pool
  });
  const result = await pool.query(
    `SELECT id, position_id, exchange FROM positions WHERE burned IS FALSE`,
  );
  const positionsToBackfill = result.rows;
  console.log(positionsToBackfill);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err); // Writes to stderr
    process.exit(1);
  });
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });
import { ethers } from "ethers";
import NonFungiblePositionManager from "./abi/NonFungiblePositionManager.json";
import ClPool from "./abi/ClPool.json";
import ERC20 from "./abi/ERC20.json";
import GaugeV2 from "./abi/GaugeV2.json";
import ClGaugeFactory from "./abi/ClGaugeFactory.json";
import {computeAerodromeClPoolAddress} from "./helpers";
import { Pool, Position } from "ramsesexchange-v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { Pool as PgPool } from "pg";
import {
  RPC_URLS,
  NFPM_ADDRESSES,
  CHAIN_IDS,
  POOL_INIT_CODE_HASHES,
  FACTORIES,
} from "./config";

export const provider = (exchange: string) =>
  new ethers.JsonRpcProvider(RPC_URLS[exchange]);
const nfpmContract = (exchange: string) =>
  new ethers.Contract(
    NFPM_ADDRESSES[exchange],
    NonFungiblePositionManager,
    provider(exchange),
  );

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
const GAUGE_FACTORIES: Record<string, string> = {
  nile: "0xAAA2D4987EEd427Ba5E2c933EeFCD75C84b446B7",
  nuri: "0xAAA2D4987EEd427Ba5E2c933EeFCD75C84b446B7",
  cleo: "0xAAA11500dDdB2B67a90d1a154dfB7eaBB518EAE6",
  ramses: "0xAA2fBD0C9393964aF7c66C1513e44A8CAAae4FDA",
  pharaoh: "0xAAA2D4987EEd427Ba5E2c933EeFCD75C84b446B7",
};
export const REWARD_TOKENS: Record<string, string> = {
  nile: "0xAAAac83751090C6ea42379626435f805DDF54DC8",
  nuri: "0xaaae8378809bb8815c08d3c59eb0c7d1529ad769",
  cleo: "0xc1e0c8c30f251a07a894609616580ad2ceb547f2",
  ramses: "0xaaa6c1e32c55a7bfa8066a6fae9b42650f262418",
  pharaoh: "0xAAAB9D12A30504559b0C5a9A5977fEE4A6081c6b",
};

// an in memory mapping of token addresses -> {symbol: string, decimals: number}
const tokenSymbols: Record<string, { symbol: string; decimals: number }> = {};

// get position data using NonFungiblePositionManager.positions() function
export const getPositionFromChain = async (
  positionId: number,
  exchange: string,
): Promise<{
  status: string;
  position?: {
    tickLower: number;
    tickUpper: number;
    token0: string;
    token1: string;
    fee: number;
    liquidity: string;
    4: number // this is tickSpacing
  };
  owner?: string;
  token0Symbol?: string;
  token1Symbol?: string;
  token0Decimals?: number;
  token1Decimals?: number;
}> => {
  let position;
  let token0Symbol;
  let token1Symbol;
  let token0Decimals;
  let token1Decimals;
  let owner;
  try {
    const nfpm = nfpmContract(exchange);
    position = await nfpm.positions(positionId);
    owner = await nfpm.ownerOf(positionId);
    // TODO: We should account for token addresses PER chain
    if (!(position.token0 in tokenSymbols)) {
      const token0Contract = new ethers.Contract(
        position.token0,
        ERC20,
        provider(exchange),
      );
      token0Symbol = await token0Contract.symbol();
      token0Decimals = await token0Contract.decimals();
      tokenSymbols[position.token0] = {
        symbol: token0Symbol,
        decimals: token0Decimals,
      };
      console.log(`Stored symbol ${token0Symbol} on ${exchange}`);
    }
    if (!(position.token1 in tokenSymbols)) {
      const token1Contract = new ethers.Contract(
        position.token1,
        ERC20,
        provider(exchange),
      );
      token1Symbol = await token1Contract.symbol();
      token1Decimals = await token1Contract.decimals();
      tokenSymbols[position.token1] = {
        symbol: token1Symbol,
        decimals: token1Decimals,
      };
      console.log(`Stored symbol ${token1Symbol} on ${exchange}`);
    }
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes("!VALID ID") || message.includes("Invalid token ID")) {
      return { status: "burned" };
    } else {
      console.log(`Error with getPosition: ${e}`);
      return { status: "error" };
    }
  }
  return {
    status: "success",
    position,
    owner,
    token0Symbol: tokenSymbols[position.token0].symbol,
    token1Symbol: tokenSymbols[position.token1].symbol,
    token0Decimals: tokenSymbols[position.token0].decimals,
    token1Decimals: tokenSymbols[position.token1].decimals,
  };
};

// Get the CLPool contract and call slot() and liquidity(). slot0[1] is tick, slot0[0] is sqrtPriceX96
export const getPoolSlot0AndLiquidity = async (
  token0: string,
  token1: string,
  fee: number,
  exchange: string,
  tickSpacing?: number,
): Promise<null | {
  slot0: [number, number, number, number, number, number, number, boolean];
  liquidity: number;
  poolAddress: string;
}> => {
  const tokenA = new Token(CHAIN_IDS[exchange], token0, 18);
  const tokenB = new Token(CHAIN_IDS[exchange], token1, 18);
  let poolAddress;
  if (exchange == 'aerodrome') {
    if (!tickSpacing) {
      console.log("You must provide tickSpacing for aerodrome")
      return null;
    }
    poolAddress = await computeAerodromeClPoolAddress(FACTORIES['aerodrome'], [token0, token1], tickSpacing, provider('aerodrome'))
  } else {
    poolAddress = Pool.getAddress(
      tokenA,
      tokenB,
      fee,
      POOL_INIT_CODE_HASHES[exchange],
      FACTORIES[exchange],
    );
  }
  const clPoolContract = new ethers.Contract(
    poolAddress,
    ClPool,
    provider(exchange),
  );
  let slot0;
  let liquidity;
  try {
    slot0 = await clPoolContract.slot0();
    liquidity = await clPoolContract.liquidity();
  } catch (e) {
    console.log(`Error with getPoolSlot0: ${e}`);
    return null;
  }
  return { slot0, liquidity, poolAddress };
};

export const getPositionRewards = async (
  poolAddress: string,
  exchange: string,
  positionId: number,
) => {
  const correctProvider = provider(exchange);
  const clGaugeFactoryContract = new ethers.Contract(
    GAUGE_FACTORIES[exchange],
    ClGaugeFactory,
    correctProvider,
  );
  const gaugeAddress = await clGaugeFactoryContract.getGauge(poolAddress);
  const gaugev2Contract = new ethers.Contract(
    gaugeAddress,
    GaugeV2,
    correctProvider,
  );
  const earned = await gaugev2Contract.earned(
    REWARD_TOKENS[exchange],
    positionId,
  );
  return earned;
};

export const getPositionsFromDatabase = async (
  positionId: number,
  exchange: string,
) => {
  let result = await pool.query(
    `SELECT tg_id, position_id, burned FROM positions WHERE position_id = $1 AND exchange = $2 AND burned IS FALSE;`,
    [positionId, exchange],
  );
  return result.rows;
};

// Get all non burned positions from the database
export const getAllPositionsFromDatabase = async (): Promise<
  {
    tg_id: string;
    username: string;
    position_id: number;
    burned: boolean;
    in_range: boolean;
    exchange: string;
  }[]
> => {
  let result = await pool.query(
    `SELECT tg_id, username, position_id, burned, in_range, exchange FROM positions WHERE burned IS FALSE;`,
  );
  return result.rows;
};

export const insertPositionIntoDatabase = async (
  positionId: number,
  tgId: string,
  inRange: boolean,
  username: string,
  exchange: string,
  token0: string,
  token1: string,
  fee: number,
  token0Symbol: string,
  token1Symbol: string,
  tickLower: number,
  tickUpper: number,
  positionLiquidity: string,
  token0Decimals: number,
  token1Decimals: number,
  owner: string,
) => {
  await pool.query(
    `INSERT INTO positions (tg_id, username, position_id, burned, in_range, exchange, token0, token1, fee, token0Symbol, token1Symbol, tickLower, tickUpper, positionLiquidity, token0decimals, token1decimals, owner) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      tgId,
      username,
      positionId,
      false,
      inRange,
      exchange,
      token0,
      token1,
      fee,
      token0Symbol,
      token1Symbol,
      tickLower,
      tickUpper,
      positionLiquidity,
      token0Decimals,
      token1Decimals,
      owner,
    ],
  );
};

export const updateDatabasePositionInRange = async (
  positionId: number,
  inRange: boolean,
  exchange: string,
) => {
  await pool.query(
    `UPDATE positions SET in_range = $1 WHERE position_id = $2 AND exchange = $3`,
    [inRange, positionId, exchange],
  );
};

export const updateDatabasePositionBurned = async (
  positionId: number,
  exchange: string,
) => {
  await pool.query(
    `UPDATE positions SET burned = TRUE WHERE position_id = $1 AND exchange = $2`,
    [positionId, exchange],
  );
};

export const removePositionFromDatabase = async (
  positionId: number,
  tgId: string,
  exchange: string,
) => {
  await pool.query(
    `DELETE FROM positions WHERE position_id = $1 AND tg_id = $2 AND exchange = $3`,
    [positionId, tgId, exchange],
  );
};

export const getUserTrackedPools = async (
  tgId: string,
): Promise<
  Array<{
    position_id: number;
    in_range: boolean;
    exchange: string;
    token0: string;
    token1: string;
    token0symbol: string;
    token1symbol: string;
    fee: number;
    ticklower: number;
    tickupper: number;
    positionliquidity: string;
    token0decimals: number;
    token1decimals: number;
    owner: string;
  }>
> => {
  const result = await pool.query(
    `SELECT position_id, in_range, exchange, token0, token1, token0symbol, token1symbol, fee, tickLower, tickUpper, positionLiquidity, token0decimals, token1decimals, owner FROM positions WHERE tg_id = $1 AND burned IS FALSE`,
    [tgId],
  );
  return result.rows;
};

export const removeAllPositionsFromDatabase = async (tgId: string) => {
  await pool.query(`DELETE FROM positions WHERE tg_id = $1`, [tgId]);
};

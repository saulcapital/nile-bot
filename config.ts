import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

export const RPC_URLS: { [key: string]: string } = {
  nile: process.env.LINEA_RPC || "https://rpc.linea.build",
  pharaoh: process.env.AVALANCHE_RPC || "https://avalanche.drpc.org",
  nuri: process.env.SCROLL_RPC || "https://scroll.drpc.org",
  ra: process.env.FRAX_RPC || "https://rpc.frax.com",
  cleo: process.env.MANTLE_RPC || "https://mantle.drpc.org",
  ramses: process.env.ARBITRUM_RPC || "https://arbitrum.drpc.org",
  aerodrome: process.env.BASE_RPC || "https://base.llamarpc.com"
};

export const NFPM_ADDRESSES: { [key: string]: string } = {
  nile: "0xAAA78E8C4241990B4ce159E105dA08129345946A",
  pharaoh: "0xAAA78E8C4241990B4ce159E105dA08129345946A",
  nuri: "0xAAA78E8C4241990B4ce159E105dA08129345946A",
  ra: "0xAAA78E8C4241990B4ce159E105dA08129345946A",
  cleo: "0xAAA78E8C4241990B4ce159E105dA08129345946A",
  ramses: "0xAA277CB7914b7e5514946Da92cb9De332Ce610EF",
  aerodrome: "0x827922686190790b37229fd06084350e74485b72"
};

export const CHAIN_IDS: { [key: string]: number } = {
  nile: 59144,
  pharaoh: 43114,
  nuri: 534352,
  ra: 252,
  cleo: 5000,
  ramses: 42161,
  aerodrome: 8453
};

export const POOL_INIT_CODE_HASHES: { [key: string]: string } = {
  nile: "0x1565b129f2d1790f12d45301b9b084335626f0c92410bc43130763b69971135d",
  pharaoh: "0x1565b129f2d1790f12d45301b9b084335626f0c92410bc43130763b69971135d",
  nuri: "0x1565b129f2d1790f12d45301b9b084335626f0c92410bc43130763b69971135d",
  ra: "0x1565b129f2d1790f12d45301b9b084335626f0c92410bc43130763b69971135d",
  cleo: "0x1565b129f2d1790f12d45301b9b084335626f0c92410bc43130763b69971135d",
  ramses: "0x1565b129f2d1790f12d45301b9b084335626f0c92410bc43130763b69971135d",
  aerodrome: "0x1137f03af9c4fae623c3fd821981f48fd7e2bb4d7e78945336a05093b92acf5c"
};

export const FACTORIES: { [key: string]: string } = {
  nile: "0xAAA32926fcE6bE95ea2c51cB4Fcb60836D320C42",
  pharaoh: "0xAAA32926fcE6bE95ea2c51cB4Fcb60836D320C42",
  nuri: "0xAAA32926fcE6bE95ea2c51cB4Fcb60836D320C42",
  ra: "0xAAA32926fcE6bE95ea2c51cB4Fcb60836D320C42",
  cleo: "0xAAA32926fcE6bE95ea2c51cB4Fcb60836D320C42",
  ramses: "0xAA2cd7477c451E703f3B9Ba5663334914763edF8",
  aerodrome: "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A"
};

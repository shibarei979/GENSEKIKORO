/**
 * ============================================================
 * 原石航路
 * Config Barrel Export
 *
 * 注意: env.client / env.server は barrel に含めない。
 * Server 専用の環境変数が Client Bundle に混入するのを防ぐため、
 * 利用側で直接 import すること。
 *
 *   import { clientEnv } from "@/config/env.client";
 *   import { serverEnv } from "@/config/env.server";
 * ============================================================
 */

export { appConfig } from "./app";

export {
    HIDE_LIKE_THRESHOLD,
    ONE_DAY_MS,
    SEVEN_DAYS_MS,
} from "./constants";

import { existsSync, readFileSync } from "node:fs";
import type { DatabaseConfig } from "@config/database.config";
import { DATABASE_CONFIG_KEY } from "@config/database.config";
import type { MikroOrmModuleOptions } from "@mikro-orm/nestjs";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { sharedMikroOrmOptions } from "./mikro-orm.shared-options";

const RDS_CA_PATH = "/cert/global-bundle.pem";

function getDriverOptions(
	nodeEnv: string,
	host: string,
): MikroOrmModuleOptions<PostgreSqlDriver>["driverOptions"] {
	const isLocal = host === "localhost" || host === "127.0.0.1";
	if (nodeEnv === "development" && isLocal) {
		return {};
	}
	// Aurora/RDS: use SSL (works with rds.force_ssl 0 or 1). CA optional for strict verification.
	const useCa = existsSync(RDS_CA_PATH);
	return {
		connection: {
			ssl: useCa
				? { rejectUnauthorized: true, ca: readFileSync(RDS_CA_PATH, "utf8") }
				: { rejectUnauthorized: false },
		},
	};
}

@Module({
	imports: [
		MikroOrmModule.forRootAsync({
			driver: PostgreSqlDriver,
			useFactory: (
				configService: ConfigService,
			): MikroOrmModuleOptions<PostgreSqlDriver> => {
				const dbConfig = configService.get<DatabaseConfig>(DATABASE_CONFIG_KEY);

				if (!dbConfig) {
					throw new Error("Database configuration not found");
				}

				const nodeEnv = configService.get<string>("app.nodeEnv") ?? "development";

				return {
					driver: PostgreSqlDriver,
					host: dbConfig.host,
					port: dbConfig.port,
					user: dbConfig.user,
					password: dbConfig.password,
					dbName: dbConfig.name,
					schema: dbConfig.schema,

					driverOptions: getDriverOptions(nodeEnv, dbConfig.host),

					// Naming strategy + global filters (softDelete) shared with the CLI
					// config (mikro-orm.config.ts) — single source so CLI and runtime
					// cannot drift. Without this the softDelete filter only existed in
					// the CLI config and soft-deleted rows leaked at runtime.
					...sharedMikroOrmOptions,

					// Entity discovery - will be populated by domain modules via forFeature()
					// entities: [],

					// Register entities from forFeature() calls automatically
					autoLoadEntities: true,

					// Lambda optimization: minimal pool
					pool: {
						min: dbConfig.poolMin,
						max: dbConfig.poolMax,
					},

					// Disable auto-discovery for faster cold starts
					discovery: {
						warnWhenNoEntities: false,
					},

					// Debug only in development
					debug: configService.get("app.nodeEnv") === "development",
				};
			},
			inject: [ConfigService],
		}),
	],
})
export class DatabaseModule {}

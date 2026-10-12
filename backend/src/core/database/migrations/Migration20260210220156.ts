import { Migration } from "@mikro-orm/migrations";

export class Migration20260210220156 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`create table "users" ("id" uuid not null default gen_random_uuid(), "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "email" varchar(255) not null, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "role" text check ("role" in ('ADMIN', 'USER')) not null default 'USER', "last_login_at" timestamptz null, constraint "users_pkey" primary key ("id"));`,
		);
		this.addSql(
			`alter table "users" add constraint "users_email_unique" unique ("email");`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(`drop table if exists "users" cascade;`);
	}
}

DROP INDEX "email_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");
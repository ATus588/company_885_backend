CREATE TABLE "public"."admin" ("id" serial NOT NULL, "email" text NOT NULL, "password" text NOT NULL, PRIMARY KEY ("id") , UNIQUE ("email"));

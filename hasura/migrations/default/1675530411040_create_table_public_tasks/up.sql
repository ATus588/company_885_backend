CREATE TABLE "public"."tasks" ("id" serial NOT NULL, "title" text NOT NULL, "details" text NOT NULL, "project_id" integer NOT NULL, "due_date" date, "created_at" timestamptz NOT NULL, "created_by" integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("created_by") REFERENCES "public"."admin"("id") ON UPDATE restrict ON DELETE cascade);
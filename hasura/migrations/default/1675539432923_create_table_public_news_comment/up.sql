CREATE TABLE "public"."news_comment" ("id" serial NOT NULL, "content" text NOT NULL, "created_by_admin" integer, "created_by_user" integer, "created_at" timestamptz NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("created_by_admin") REFERENCES "public"."admin"("id") ON UPDATE restrict ON DELETE cascade, FOREIGN KEY ("created_by_user") REFERENCES "public"."user"("id") ON UPDATE restrict ON DELETE cascade);

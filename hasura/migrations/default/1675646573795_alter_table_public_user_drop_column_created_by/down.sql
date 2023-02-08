alter table "public"."user" alter column "created_by" drop not null;
alter table "public"."user" add column "created_by" int4;

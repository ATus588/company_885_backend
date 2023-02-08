alter table "public"."user"
  add constraint "user_created_by_fkey"
  foreign key ("created_by")
  references "public"."admin"
  ("id") on update restrict on delete cascade;

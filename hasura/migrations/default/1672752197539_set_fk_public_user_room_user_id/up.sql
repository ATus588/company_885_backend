alter table "public"."user_room"
  add constraint "user_room_user_id_fkey"
  foreign key ("user_id")
  references "public"."user"
  ("id") on update restrict on delete cascade;

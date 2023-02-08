alter table "public"."user_room"
  add constraint "user_room_room_id_fkey"
  foreign key ("room_id")
  references "public"."room"
  ("id") on update restrict on delete cascade;
